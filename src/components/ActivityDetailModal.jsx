import React, { useState } from 'react';
import { X, MapPin, Trash2, Edit2, CheckCircle, XCircle, Clock, User, Star, AlertTriangle, Sparkles, ExternalLink } from 'lucide-react';
import './ActivityDetailModal.css';

const STATUS_OPTIONS = ['Pendente', 'Agendada', 'Concluída', 'Cancelada'];

export default function ActivityDetailModal({ activity, onClose, onSave, onDelete, existingActivities }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...activity });

  const getRecurrenceCount = () => {
    if (!existingActivities || !activity.location) return 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return existingActivities.filter(a => 
      a.location === activity.location && 
      a.id !== activity.id &&
      new Date(a.created) > thirtyDaysAgo
    ).length;
  };

  const recurrenceCount = getRecurrenceCount();

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = () => {
    onSave(form);
    setEditing(false);
  };

  const statusClass = `status-badge status-${activity.status.toLowerCase().replace(/\s/g, '-')}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail-modal animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <header className="detail-header">
          <div className="detail-header-left">
            <span className="detail-id">#{activity.id}</span>
            {editing
              ? <select className="status-select" value={form.status} onChange={handleChange('status')}>
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              : <span className={statusClass}>{activity.status}</span>
            }
          </div>
          <div className="detail-header-actions">
            {!editing && (
              <button className="icon-btn" title="Editar" onClick={() => setEditing(true)}>
                <Edit2 size={18} />
              </button>
            )}
            <button className="icon-btn danger" title="Excluir" onClick={() => {
              if (window.confirm('Excluir esta atividade?')) onDelete(activity.id);
            }}>
              <Trash2 size={18} />
            </button>
            <button className="icon-btn" title="Fechar" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="detail-body">
          {/* AI Insights and Warnings */}
          <div className="detail-ai-alerts">
            {recurrenceCount > 1 && (
              <div className="recurrence-warning">
                <AlertTriangle size={18} />
                <div className="alert-text">
                  <strong>Alerta de Recorrência</strong>
                  <span>Esta localização teve {recurrenceCount} solicitações nos últimos 30 dias. Verifique se há um problema persistente.</span>
                </div>
              </div>
            )}
            
            {activity.kb_suggested_tag && (
              <div className="kb-detail-suggestion">
                <Sparkles size={18} color="#0d9488" />
                <div className="alert-text">
                  <strong>Procedimento sugerido: {activity.kb_suggested_tag}</strong>
                  <span>Consulte o manual na Base de Conhecimento para este tipo de reparo.</span>
                </div>
                <ExternalLink size={16} />
              </div>
            )}
          </div>

          <div className="detail-section">
            <h3 className="detail-section-title">Informações Gerais</h3>
            <div className="detail-grid">
              <div className="detail-field">
                <label>Cliente / Localização</label>
                {editing
                  ? <input className="detail-input" value={form.location} onChange={handleChange('location')} />
                  : <span>{activity.location}</span>
                }
              </div>
              <div className="detail-field">
                <label>Tipo do serviço</label>
                {editing
                  ? <input className="detail-input" value={form.type} onChange={handleChange('type')} />
                  : <span>{activity.type}</span>
                }
              </div>
              <div className="detail-field">
                <label>Criado em</label>
                <span>{activity.created}</span>
              </div>
              <div className="detail-field">
                <label>Atualizado em</label>
                <span>{activity.updated}</span>
              </div>
              <div className="detail-field">
                <label>Último agendamento</label>
                {editing
                  ? <input className="detail-input" type="date" value={form.lastAppointment || ''} onChange={handleChange('lastAppointment')} />
                  : <span>{activity.lastAppointment || '—'}</span>
                }
              </div>
              <div className="detail-field">
                <label>Colaborador</label>
                {editing
                  ? <input className="detail-input" value={form.collaborator || ''} onChange={handleChange('collaborator')} placeholder="Nome do colaborador" />
                  : <span>{activity.collaborator || '—'}</span>
                }
              </div>
            </div>
          </div>

          {(editing || activity.address) && (
            <div className="detail-section">
              <h3 className="detail-section-title">Endereço</h3>
              {editing
                ? <input className="detail-input full-width" value={form.address || ''} onChange={handleChange('address')} placeholder="Endereço completo" />
                : <div className="detail-address">
                    <MapPin size={16} color="#0052cc" />
                    <span>{activity.address}</span>
                  </div>
              }
            </div>
          )}

          {(editing || activity.description) && (
            <div className="detail-section">
              <h3 className="detail-section-title">Descrição</h3>
              {editing
                ? <textarea className="detail-textarea" value={form.description || ''} onChange={handleChange('description')} placeholder="Descrição do serviço..." rows={3} />
                : <p className="detail-text">{activity.description}</p>
              }
            </div>
          )}

          {(editing || activity.observation) && (
            <div className="detail-section">
              <h3 className="detail-section-title">Observações</h3>
              {editing
                ? <textarea className="detail-textarea" value={form.observation || ''} onChange={handleChange('observation')} placeholder="Observações..." rows={2} />
                : <p className="detail-text">{activity.observation}</p>
              }
            </div>
          )}

          <div className="detail-section">
            <h3 className="detail-section-title">Avaliação</h3>
            <div className="detail-rating">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  size={24}
                  className={`star-icon ${star <= (editing ? form.rating : activity.rating) ? 'filled' : ''}`}
                  onClick={editing ? () => setForm(p => ({ ...p, rating: star })) : undefined}
                  style={{ cursor: editing ? 'pointer' : 'default' }}
                />
              ))}
              <span className="rating-label">
                {(editing ? form.rating : activity.rating) > 0
                  ? `${editing ? form.rating : activity.rating} / 5`
                  : 'Sem avaliação'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        {editing && (
          <footer className="detail-footer">
            <button className="btn-cancel-modal" onClick={() => { setForm({ ...activity }); setEditing(false); }}>
              CANCELAR
            </button>
            <button className="btn-create" onClick={handleSave}>
              SALVAR ALTERAÇÕES
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
