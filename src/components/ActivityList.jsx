import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Star, RotateCcw, Filter, LayoutGrid, MoreHorizontal, Plus, Search, Trash2, Eye, Edit2, Copy, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import NewActivityModal from './NewActivityModal';
import ActivityDetailModal from './ActivityDetailModal';
import { logEvent } from '../services/historyService';
import { supabase } from '../supabaseClient';
import './ActivityList.css';

const STORAGE_KEY = 'synapseActivities_v2';

const DEFAULT_ACTIVITIES = [];

const PAGE_SIZES = [5, 10, 20, 50];

// Inline delete confirmation popup
function DeleteConfirm({ activityId, location, onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onCancel();
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [onCancel]);

  return (
    <div className="delete-confirm-popup" ref={ref}>
      <div className="delete-confirm-icon"><AlertTriangle size={18} color="#ef4444" /></div>
      <div className="delete-confirm-text">
        <strong>Excluir atividade?</strong>
        <span>{location}</span>
      </div>
      <div className="delete-confirm-actions">
        <button className="delete-btn-cancel" onClick={onCancel}>Não</button>
        <button className="delete-btn-confirm" onClick={onConfirm}>Sim, excluir</button>
      </div>
    </div>
  );
}

// Row context menu component — rendered via portal so it overlaps everything
function ActivityContextMenu({ anchorRect, activity, onClose, onView, onEdit, onDuplicate, onDelete, onChangeStatus }) {
  const ref = useRef(null);

  // Calculate position: appear below the button, flip up if near bottom edge
  const menuWidth = 220;
  const menuHeight = 240; // approximate
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = anchorRect.bottom + 4;
  let left = anchorRect.right - menuWidth;

  // Flip upward if menu would go off screen bottom
  if (top + menuHeight > vh - 8) top = anchorRect.top - menuHeight - 4;
  // Keep inside left edge
  if (left < 8) left = 8;
  // Keep inside right edge
  if (left + menuWidth > vw - 8) left = vw - menuWidth - 8;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const handleScroll = () => onClose();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      className="context-menu"
      ref={ref}
      style={{ top, left, width: menuWidth }}
    >
      <button className="context-menu-item" onClick={() => { onView(); onClose(); }}>
        <Eye size={14} /> Ver detalhes
      </button>
      <button className="context-menu-item" onClick={() => { onEdit(); onClose(); }}>
        <Edit2 size={14} /> Editar atividade
      </button>
      <button className="context-menu-item" onClick={() => { onDuplicate(); onClose(); }}>
        <Copy size={14} /> Duplicar
      </button>
      <div className="context-menu-divider" />
      <button className="context-menu-item" onClick={() => { onChangeStatus('Concluída'); onClose(); }}>
        <CheckCircle size={14} color="#22c55e" /> Marcar como Concluída
      </button>
      <button className="context-menu-item" onClick={() => { onChangeStatus('Cancelada'); onClose(); }}>
        <XCircle size={14} color="#ef4444" /> Cancelar atividade
      </button>
      <div className="context-menu-divider" />
      <button className="context-menu-item context-menu-danger" onClick={() => { onDelete(); onClose(); }}>
        <Trash2 size={14} /> Excluir
      </button>
    </div>,
    document.body
  );
}

import { useGoogleLogin } from '@react-oauth/google';
import { syncActivityToCalendar, deleteCalendarEvent } from '../services/calendarService';

export default function ActivityList({ currentUser, currentCompany }) {
  const getCacheKey = () => `kabania_activities_${currentCompany?.id}`;

  const [activities, setActivities] = useState(() => {
    const cached = localStorage.getItem(getCacheKey());
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(false);
  const [googleToken, setGoogleToken] = useState(null);

  // Google Login for Calendar scope
  const loginCalendar = useGoogleLogin({
    onSuccess: tokenResponse => {
      setGoogleToken(tokenResponse.access_token);
      // We don't have a reliable way to "resume" the save here easily without complex state,
      // so we tell the user to click save again.
      alert("Google Agenda autorizado! Clique em 'CRIAR' ou 'SALVAR' novamente para sincronizar.");
    },
    scope: 'https://www.googleapis.com/auth/calendar.events',
  });

  const checkAndSync = async (activity, token) => {
    if (!token) {
      loginCalendar();
      return null;
    }
    try {
      const event = await syncActivityToCalendar(activity, token);
      return event.id;
    } catch (err) {
      console.error("Erro na sincronização:", err);
      // If token expired, clear it
      setGoogleToken(null);
      return null;
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailActivity, setDetailActivity] = useState(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ status: '', type: '' });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenu, setOpenMenu] = useState(null); // { id: rowKey, rect: DOMRect }
  const [pendingDeleteId, setPendingDeleteId] = useState(null); // inline confirm

  // Fetch activities from Supabase on load and whenever company changes
  useEffect(() => {
    const fetchActivities = async () => {
      if (!currentCompany?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('activities')
        .select('id, location, type, status, rating, created, updated, last_appointment, collaborator, google_event_id, company_id, created_by')
        .eq('company_id', currentCompany.id)
        .order('created', { ascending: false });

      if (!error && data) {
        // Map back consistent with the UI (snake_case to camelCase)
        const mapped = data.map(item => ({
          ...item,
          companyId: item.company_id,
          createdBy: item.created_by,
          lastAppointment: item.last_appointment
        }));
        setActivities(mapped);
        localStorage.setItem(getCacheKey(), JSON.stringify(mapped));
      } else if (error) {
        console.error('Error fetching activities:', error);
      }
      setLoading(false);
    };

    fetchActivities();
  }, [currentCompany]);

  const handleReset = () => {
    setSearch('');
    setFilters({ status: '', type: '' });
    setCurrentPage(1);
    fetchActivities();
  };

  const nowStr = () => new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  const handleSave = async (activity) => {
    const newId = String(Math.floor(Math.random() * 90000) + 10000);
    const nowIso = new Date().toISOString();
    
    // Prepare precisely what Supabase expects (matching the SQL schema)
    const supabasePayload = {
      id: newId,
      location: activity.location || 'Sem cliente',
      type: activity.type,
      status: activity.status || 'Pendente',
      rating: activity.rating || 0,
      created: nowIso,
      updated: nowIso,
      last_appointment: activity.lastAppointment || null,
      collaborator: activity.collaborator,
      address: activity.address,
      description: activity.description,
      observation: activity.observation,
      company_id: currentCompany?.id,
      created_by: currentUser,
      google_event_id: null
    };

    // If sync is requested, handle it
    if (activity.syncCalendar) {
      const eventId = await checkAndSync(activity, googleToken);
      if (eventId) {
        supabasePayload.google_event_id = eventId;
      } else {
        // User needs to authorize or click save again
        return; 
      }
    }

    const { error } = await supabase.from('activities').insert([supabasePayload]);

    if (!error) {
      // For local UI state, we can keep camelCase if needed or just use what we have
      const uiActivity = { 
        ...supabasePayload, 
        companyId: currentCompany?.id, 
        createdBy: currentUser, 
        lastAppointment: activity.lastAppointment,
        created: nowStr(), // Human readable for the table UI
        updated: nowStr()
      };
      setActivities(prev => [uiActivity, ...prev]);
      setCurrentPage(1);
      if (currentCompany) {
        logEvent(currentCompany.id, currentUser, 'CREATE_ACTIVITY', `Nova solicitação criada: ${newId} para ${activity.location}`);
      }
    } else {
      console.error('Error saving activity:', error);
      alert(`Erro ao salvar no banco de dados: ${error.message}. Verifique se rodou o SQL do plano de migração.`);
    }
  };

  const handleUpdate = async (updatedActivity) => {
    const nowIso = new Date().toISOString();
    // Prepare data for Supabase (matching database schema)
    const payload = {
      location: updatedActivity.location,
      type: updatedActivity.type,
      status: updatedActivity.status,
      rating: updatedActivity.rating,
      last_appointment: updatedActivity.lastAppointment || null,
      collaborator: updatedActivity.collaborator,
      address: updatedActivity.address,
      description: updatedActivity.description,
      observation: updatedActivity.observation,
      updated: nowIso,
      google_event_id: updatedActivity.google_event_id
    };

    // Update Calendar if exists
    if (updatedActivity.google_event_id && googleToken) {
      await checkAndSync(updatedActivity, googleToken);
    }

    const { error } = await supabase
      .from('activities')
      .update(payload)
      .eq('id', updatedActivity.id);

    if (!error) {
      setActivities(prev => prev.map(a =>
        a.id === updatedActivity.id ? { ...updatedActivity, updated: nowStr() } : a
      ));
      if (currentCompany) {
        logEvent(currentCompany.id, currentUser, 'UPDATE_ACTIVITY', `Solicitação ${updatedActivity.id} atualizada.`);
      }
    } else {
      console.error('Error updating activity:', error);
      alert(`Erro ao atualizar: ${error.message}`);
    }
  };

  const confirmDelete = async (id) => {
    const act = activities.find(a => a.id === id);
    
    // Delete from Calendar if exists
    if (act?.google_event_id && googleToken) {
      await deleteCalendarEvent(act.google_event_id, googleToken);
    }

    const { error } = await supabase.from('activities').delete().eq('id', id);

    if (!error) {
      setActivities(prev => prev.filter(a => a.id !== id));
      setPendingDeleteId(null);
      setDetailActivity(null);
      if (currentCompany && act) {
        logEvent(currentCompany.id, currentUser, 'DELETE_ACTIVITY', `Solicitação ${id} (${act.location}) excluída.`);
      }
    } else {
      console.error('Error deleting activity:', error);
    }
  };

  const handleDuplicate = async (activity) => {
    const newId = String(Math.floor(Math.random() * 90000) + 10000);
    const nowIso = new Date().toISOString();
    
    const dupPayload = {
      id: newId,
      location: activity.location,
      type: activity.type,
      status: 'Pendente',
      rating: 0,
      created: nowIso,
      updated: nowIso,
      last_appointment: activity.lastAppointment || null,
      collaborator: activity.collaborator,
      address: activity.address,
      description: activity.description,
      observation: activity.observation,
      company_id: currentCompany?.id,
      created_by: currentUser
    };

    const { error } = await supabase.from('activities').insert([dupPayload]);
    if (!error) {
      const uiDup = {
        ...dupPayload,
        companyId: currentCompany?.id,
        createdBy: currentUser,
        lastAppointment: activity.lastAppointment,
        created: nowStr(),
        updated: nowStr()
      };
      setActivities(prev => [uiDup, ...prev]);
      setCurrentPage(1);
    } else {
      console.error('Error duplicating activity:', error);
      alert(`Erro ao duplicar: ${error.message}`);
    }
  };

  const handleChangeStatus = async (id, newStatus) => {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('activities')
      .update({ status: newStatus, updated: nowIso })
      .eq('id', id);

    if (!error) {
      setActivities(prev => prev.map(a =>
        a.id === id ? { ...a, status: newStatus, updated: nowStr() } : a
      ));
    }
  };

  const handleRatingChange = async (activityId, stars) => {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('activities')
      .update({ rating: stars, updated: nowIso })
      .eq('id', activityId);

    if (!error) {
      setActivities(prev => prev.map(a =>
        a.id === activityId ? { ...a, rating: stars, updated: nowStr() } : a
      ));
    }
  };

  // The simplified filter for team collaboration
  const filtered = (activities || []).filter(a => {
    const matchesSearch = search === '' ||
      (a.id && a.id.toLowerCase().includes(search.toLowerCase())) ||
      (a.location && a.location.toLowerCase().includes(search.toLowerCase())) ||
      (a.type && a.type.toLowerCase().includes(search.toLowerCase())) ||
      (a.status && a.status.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = filters.status === '' || a.status === filters.status;
    const matchesType = filters.type === '' || a.type === filters.type;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);
  const rangeLabel = filtered.length === 0
    ? '0 de 0'
    : `${start + 1}-${Math.min(start + pageSize, filtered.length)} de ${filtered.length}`;

  // Find pending-delete activity for the popup
  const pendingDeleteActivity = activities.find(a => a.id === pendingDeleteId);

  return (
    <div className="activity-list-container animate-fade-in" onClick={() => { setOpenMenu(null); }}>
      <header className="activity-header">
        <h1 className="activity-title">Solicitações de serviços</h1>
        <div className="activity-actions">
          <div className="activity-search-bar">
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <button className="action-btn-icon" title="Recarregar e Limpar" onClick={handleReset}>
            <RotateCcw size={18} />
          </button>
          <button 
            className={`action-btn-icon hide-mobile ${viewMode === 'grid' ? 'active' : ''}`} 
            title="Visualizar em grade"
            onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            className={`action-btn-icon hide-mobile ${isFilterOpen ? 'active' : ''}`} 
            title="Filtrar"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter size={18} />
          </button>
          <button className="btn-new-request" onClick={() => setIsModalOpen(true)}>
            Nova solicitação <Plus size={18} />
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      {isFilterOpen && (
        <div className="activity-filter-bar animate-slide-down">
          <div className="filter-group">
            <label>Situação</label>
            <select 
              value={filters.status} 
              onChange={e => { setFilters({...filters, status: e.target.value}); setCurrentPage(1); }}
            >
              <option value="">Todas</option>
              <option value="Pendente">Pendente</option>
              <option value="Agendada">Agendada</option>
              <option value="Concluída">Concluída</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Tipo de Serviço</label>
            <select 
              value={filters.type} 
              onChange={e => { setFilters({...filters, type: e.target.value}); setCurrentPage(1); }}
            >
              <option value="">Todos</option>
              {[...new Set(activities.map(a => a.type).filter(Boolean))].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <button className="btn-clear-filters" onClick={() => setFilters({ status: '', type: '' })}>
            Limpar Filtros
          </button>
        </div>
      )}

      {/* Create modal */}
      <NewActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        currentCompany={currentCompany}
        existingActivities={activities}
      />

      {/* Detail / Edit modal */}
      {detailActivity && (
        <ActivityDetailModal
          activity={detailActivity}
          onClose={() => setDetailActivity(null)}
          onSave={(updated) => { handleUpdate(updated); setDetailActivity(null); }}
          onDelete={(id) => setPendingDeleteId(id)}
        />
      )}

      {/* Global inline delete confirmation */}
      {pendingDeleteId && pendingDeleteActivity && (
        <div className="delete-confirm-overlay">
          <DeleteConfirm
            activityId={pendingDeleteId}
            location={pendingDeleteActivity.location}
            onConfirm={() => confirmDelete(pendingDeleteId)}
            onCancel={() => { setPendingDeleteId(null); }}
          />
        </div>
      )}

      <div className="activity-content-wrapper">
        {viewMode === 'table' ? (
          <div className="activity-table-wrapper">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Identificador</th>
                  <th>Localização</th>
                  <th>Tipo do serviço</th>
                  <th>Situação</th>
                  <th>Avaliação</th>
                  <th>Criado em ↓</th>
                  <th>Atualizado em</th>
                  <th>Último agendamento</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && activities.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      <td colSpan={9} style={{ padding: '0.75rem' }}>
                        <div className="activity-skeleton-row" />
                      </td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      Nenhuma atividade encontrada.
                    </td>
                  </tr>
                ) : (
                  paginated.map((activity) => {
                    const rowKey = activity.id + activity.created;
                    return (
                      <tr key={rowKey} onDoubleClick={() => setDetailActivity(activity)}>
                        <td data-label="Identificador">{activity.id}</td>
                        <td data-label="Localização" className="text-secondary">{activity.location}</td>
                        <td data-label="Tipo do serviço" className="text-secondary">{activity.type}</td>
                        <td data-label="Situação">
                          <span className={`status-badge status-${activity.status.toLowerCase().replace(/\s/g, '-')}`}>
                            {activity.status}
                          </span>
                        </td>
                        <td data-label="Avaliação">
                          <div className="rating-stars">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                size={16}
                                className={`star-icon ${star <= activity.rating ? 'filled' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleRatingChange(activity.id, star); }}
                              />
                            ))}
                          </div>
                        </td>
                        <td data-label="Criado em">{activity.created}</td>
                        <td data-label="Atualizado em">{activity.updated}</td>
                        <td data-label="Último agend.">{activity.lastAppointment || ''}</td>
                        <td>
                          <div className="action-cell" onClick={e => e.stopPropagation()}>
                            <div className="context-menu-wrapper">
                              <button
                                className="btn-details"
                                title="Mais opções"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setOpenMenu(openMenu?.id === rowKey ? null : { id: rowKey, rect });
                                }}
                              >
                                <MoreHorizontal size={20} />
                              </button>
                              {openMenu?.id === rowKey && (
                                <ActivityContextMenu
                                  anchorRect={openMenu.rect}
                                  activity={activity}
                                  onClose={() => setOpenMenu(null)}
                                  onView={() => setDetailActivity(activity)}
                                  onEdit={() => setDetailActivity(activity)}
                                  onDuplicate={() => handleDuplicate(activity)}
                                  onDelete={() => setPendingDeleteId(activity.id)}
                                  onChangeStatus={(s) => handleChangeStatus(activity.id, s)}
                                />
                              )}
                            </div>
                            <button
                              className="btn-delete-activity"
                              title="Excluir"
                              onClick={() => setPendingDeleteId(activity.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="activity-grid-view">
            {loading && activities.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={`grid-skeleton-${i}`} className="cp-skeleton-row" style={{ height: '180px' }} />
              ))
            ) : paginated.length === 0 ? (
              <div className="cp-empty">Nenhuma atividade encontrada.</div>
            ) : (
              paginated.map((activity) => (
                <div key={activity.id} className="activity-card animate-fade-in" onDoubleClick={() => setDetailActivity(activity)}>
                  <div className="activity-card-header">
                    <span className="activity-card-id">#{activity.id}</span>
                    <span className={`status-badge status-${activity.status.toLowerCase().replace(/\s/g, '-')}`}>
                      {activity.status}
                    </span>
                  </div>
                  <div className="activity-card-body">
                    <h3 className="activity-card-title">{activity.location}</h3>
                    <p className="activity-card-type">{activity.type}</p>
                    <div className="activity-card-date">
                      <span>Criada em: {activity.created}</span>
                    </div>
                  </div>
                  <div className="activity-card-footer">
                    <div className="rating-stars">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={14}
                          className={`star-icon ${star <= activity.rating ? 'filled' : ''}`}
                        />
                      ))}
                    </div>
                    <div className="activity-card-actions">
                      <button onClick={() => setDetailActivity(activity)}><Eye size={16} /></button>
                      <button className="danger" onClick={() => setPendingDeleteId(activity.id)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <footer className="activity-footer">
        <div className="pagination-info">
          Resultados por página
          <select
            className="page-select"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
          >
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="pagination-controls">
          <span>{rangeLabel}</span>
          <div className="nav-arrows">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}>&lt;</button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>&gt;</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
