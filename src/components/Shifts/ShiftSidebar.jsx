import React from 'react';
import { Briefcase, Clock, Plus, CheckCircle } from 'lucide-react';

export default function ShiftSidebar({ pendingActivities, onQuickSchedule }) {
  const truncateUUID = (uuid) => {
    if (!uuid || uuid.length < 12) return uuid;
    return `#${uuid.substring(0, 8)}...`;
  };

  return (
    <aside className="pending-activities-sidebar">
      <header className="sidebar-header">
        <h3><Briefcase size={18} /> Solicitações Pendentes</h3>
        <span className="pending-count">{pendingActivities.length}</span>
      </header>
      
      <div className="pending-list">
        {pendingActivities.map(act => {
          const isUrgent = act.type?.toLowerCase().includes('urgente');
          const statusLabel = act.status || 'Pendente';
          const displayDate = new Date(act.created || act.created_at).toLocaleDateString('pt-BR');

          return (
            <div key={act.id} className="pending-act-card animate-slide-right">
              <div className="act-header">
                <span className="act-id">{truncateUUID(act.id)}</span>
                <div className="act-badges">
                  {isUrgent && <span className="priority-tag alta">Urgente</span>}
                  <span className={`status-badge-simple ${statusLabel.toLowerCase().replace(' ', '-')}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>
              
              <h4 className="act-location">{act.location}</h4>
              
              <div className="act-info-row">
                <Briefcase size={12} className="text-accent" />
                <span className="act-text-small">{act.type}</span>
              </div>

              {act.description && (
                <div className="act-desc-box">
                  <p>{act.description.length > 80 ? act.description.substring(0, 80) + '...' : act.description}</p>
                </div>
              )}

              <div className="act-card-footer">
                <div className="act-date">
                   <Clock size={12} />
                   <span>{displayDate}</span>
                </div>
                <button className="btn-schedule-quick-pixel" onClick={() => onQuickSchedule(act)}>
                  <Plus size={14} /> Agendar
                </button>
              </div>
            </div>
          );
        })}
        {pendingActivities.length === 0 && (
          <div className="empty-pending">
            <CheckCircle size={32} className="text-muted opacity-20" />
            <p>Tudo em escala!</p>
          </div>
        )}
      </div>
    </aside>
  );
}
