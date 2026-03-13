import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Star, RotateCcw, Filter, LayoutGrid, MoreHorizontal, Plus, Search, Trash2, Eye, Edit2, Copy, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import NewActivityModal from './NewActivityModal';
import ActivityDetailModal from './ActivityDetailModal';
import { logEvent } from '../services/historyService';
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

export default function ActivityList({ currentUser, currentCompany }) {
  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
    // Seed defaults and persist immediately
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ACTIVITIES));
    return DEFAULT_ACTIVITIES;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailActivity, setDetailActivity] = useState(null);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenu, setOpenMenu] = useState(null); // { id: rowKey, rect: DOMRect }
  const [pendingDeleteId, setPendingDeleteId] = useState(null); // inline confirm

  // Persist to localStorage whenever activities change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  }, [activities]);

  const nowStr = () => new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  const handleSave = (newActivity) => {
    const activityWithUser = { 
      ...newActivity, 
      createdBy: currentUser,
      companyId: currentCompany?.id 
    };
    const updated = [activityWithUser, ...activities];
    setActivities(updated);
    setCurrentPage(1);

    if (currentCompany) {
      logEvent(currentCompany.id, currentUser, 'CREATE_ACTIVITY', `Nova solicitação criada: ${newActivity.id} para ${newActivity.location}`);
    }
  };

  const handleUpdate = (updatedActivity) => {
    setActivities(prev => prev.map(a =>
      a.id === updatedActivity.id ? { ...updatedActivity, updated: nowStr() } : a
    ));
    if (currentCompany) {
      logEvent(currentCompany.id, currentUser, 'UPDATE_ACTIVITY', `Solicitação ${updatedActivity.id} atualizada.`);
    }
  };

  const confirmDelete = (id) => {
    const act = activities.find(a => a.id === id);
    setActivities(prev => prev.filter(a => a.id !== id));
    setPendingDeleteId(null);
    setDetailActivity(null);
    if (currentCompany && act) {
      logEvent(currentCompany.id, currentUser, 'DELETE_ACTIVITY', `Solicitação ${id} (${act.location}) excluída.`);
    }
  };

  const handleDuplicate = (activity) => {
    const dup = {
      ...activity,
      id: String(Math.floor(Math.random() * 90000) + 10000),
      created: nowStr(),
      updated: nowStr(),
      status: 'Pendente',
      createdBy: currentUser
    };
    setActivities(prev => [dup, ...prev]);
    setCurrentPage(1);
  };

  const handleChangeStatus = (id, newStatus) => {
    setActivities(prev => prev.map(a =>
      a.id === id ? { ...a, status: newStatus, updated: nowStr() } : a
    ));
  };

  const handleRatingChange = (activityId, stars) => {
    setActivities(prev => prev.map(a =>
      a.id === activityId ? { ...a, rating: stars, updated: nowStr() } : a
    ));
  };

  // Filter by user first, then by search
  const userActivities = activities.filter(a => a.createdBy === currentUser);
  
  const filtered = userActivities.filter(a =>
    search === '' ||
    a.id.toLowerCase().includes(search.toLowerCase()) ||
    a.location.toLowerCase().includes(search.toLowerCase()) ||
    a.type.toLowerCase().includes(search.toLowerCase()) ||
    a.status.toLowerCase().includes(search.toLowerCase())
  );

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
          <button className="action-btn-icon" title="Limpar busca" onClick={() => setSearch('')}>
            <RotateCcw size={18} />
          </button>
          <button className="action-btn-icon hide-mobile" title="Visualizar em grade">
            <LayoutGrid size={18} />
          </button>
          <button className="action-btn-icon hide-mobile" title="Filtrar">
            <Filter size={18} />
          </button>
          <button className="btn-new-request" onClick={() => setIsModalOpen(true)}>
            Nova solicitação <Plus size={18} />
          </button>
        </div>
      </header>

      {/* Create modal */}
      <NewActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
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
            {paginated.length === 0 ? (
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
                        {/* Context menu trigger */}
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
                        {/* Direct delete button */}
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
