import React from 'react';
import { Briefcase, Clock, Plus, CheckCircle, MapPin, Activity, AlertTriangle } from 'lucide-react';

export default function ShiftSidebar({ pendingActivities, onQuickSchedule }) {
  const truncateUUID = (uuid) => {
    if (!uuid || uuid.length < 12) return uuid;
    return `#${uuid.substring(0, 8)}`;
  };

  const getTimeAgo = (dateStr) => {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now - past;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `Há ${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Há ${diffHours}h`;
    return past.toLocaleDateString('pt-BR');
  };

  return (
    <aside className="pending-activities-sidebar glass-morphism animate-slide-in-right">
      <header className="sidebar-header-premium">
        <div className="header-title-row">
          <Activity size={20} className="text-accent pulse-icon" />
          <h3>Solicitações Pendentes</h3>
        </div>
        <div className="pending-badge-glow">
          {pendingActivities.length}
        </div>
      </header>
      
      <div className="pending-list-premium custom-scrollbar">
        {pendingActivities.map((act, index) => {
          const isUrgent = act.type?.toLowerCase().includes('urgente') || act.status === 'priority' || act.status === 'urgent';
          const timeAgo = getTimeAgo(act.created || act.created_at);

          return (
            <div 
              key={act.id} 
              className={`pending-premium-card ${isUrgent ? 'urgent-glow' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="card-top-info">
                <span className="act-tag">{act.type || 'Serviço'}</span>
                <span className="time-ago-tag"><Clock size={10} /> {timeAgo}</span>
              </div>
              
              <h4 className="act-location-title">
                <MapPin size={14} className="text-secondary" />
                {act.location || 'Local não informado'}
              </h4>
              
              {act.description && (
                <p className="act-short-desc">
                  {act.description.length > 85 ? act.description.substring(0, 85) + '...' : act.description}
                </p>
              )}

              <div className="card-action-footer">
                <div className="priority-indicator">
                   {isUrgent ? (
                     <span className="prio-tag red"><AlertTriangle size={10} /> Alta</span>
                   ) : (
                     <span className="prio-tag blue">Normal</span>
                   )}
                </div>
                <button className="btn-quick-schedule-premium" onClick={() => onQuickSchedule(act)}>
                  <Plus size={14} /> Agendar
                </button>
              </div>

              {isUrgent && <div className="urgent-line-indicator" />}
            </div>
          );
        })}

        {pendingActivities.length === 0 && (
          <div className="empty-pending-premium">
            <div className="success-icon-bg">
               <CheckCircle size={32} />
            </div>
            <p>Todas as demandas em dia!</p>
            <span>Aguardando novas solicitações...</span>
          </div>
        )}
      </div>
    </aside>
  );
}
