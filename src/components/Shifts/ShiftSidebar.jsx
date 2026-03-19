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
          
          return (
            <div 
              key={act.id} 
              className={`pending-premium-card ${isUrgent ? 'urgent-glow' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('activity', JSON.stringify(act));
                e.dataTransfer.effectAllowed = 'copy';
              }}
            >
              {isUrgent && <div className="urgent-line-indicator" />}
              
              <div className="card-top-info">
                <span className="act-tag">{act.id ? truncateUUID(act.id) : '#SR-NEW'}</span>
                <span className="time-ago-tag">
                  <Clock size={10} /> {getTimeAgo(act.created_at || act.created)}
                </span>
              </div>

              <h4 className="act-location-title">
                <MapPin size={14} className="text-accent" />
                {act.work_environments?.name || act.locations?.name || act.location || "Localização Indisponível"}
              </h4>

              <p className="act-short-desc">
                {act.work_activities?.name || act.description || "Sem descrição disponível."}
              </p>

              <div className="card-action-footer">
                <span className={`prio-tag ${isUrgent ? 'red' : 'blue'}`}>
                  {isUrgent ? '🔴 Urgente' : '🔵 Normal'}
                </span>
                <button 
                  className="btn-quick-schedule-premium"
                  onClick={() => onQuickSchedule(act)}
                >
                  <Plus size={14} /> Agendar
                </button>
              </div>
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
