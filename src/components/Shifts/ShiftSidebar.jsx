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
