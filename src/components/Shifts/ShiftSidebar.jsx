import React, { useState, useEffect } from 'react';
import { Briefcase, Clock, Plus, CheckCircle, MapPin, Activity, AlertTriangle, Timer } from 'lucide-react';

export default function ShiftSidebar({ pendingActivities, onQuickSchedule, onAutoPilot, isAutoPilotLoading }) {
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
      
      {pendingActivities.length > 0 && (
        <div className="px-4 pb-3">
          <button 
            className="w-full flex justify-center items-center gap-2 py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/30 transition-all pulse-on-hover shadow-[0_0_15px_rgba(99,102,241,0.2)]"
            onClick={onAutoPilot}
            disabled={isAutoPilotLoading}
          >
            {isAutoPilotLoading ? <span className="animate-spin text-indigo-400 font-black">⚙️</span> : <Activity size={18} className="text-purple-400" />}
            {isAutoPilotLoading ? 'Processando Engine...' : 'Auto-Pilot IA 🚀'}
          </button>
        </div>
      )}

      <div className="pending-list-premium custom-scrollbar">
        {pendingActivities.map((act, index) => {
          const isUrgent = act.type?.toLowerCase().includes('urgente') || act.status === 'priority' || act.status === 'urgent';
          
          // SLA Calculation (Similar to ServiceCenter)
          let slaContent = null;
          let slaColor = '';
          let isPulsing = false;
          
          if (act.sla_deadline) {
            const now = new Date();
            const deadline = new Date(act.sla_deadline);
            const diffMin = Math.floor((deadline - now) / 60000);
            
            if (act.sla_breached || diffMin < 0) {
              slaContent = "SLA Estourado!";
              slaColor = "text-red-400 bg-red-400/10 border-red-500/30";
              isPulsing = true;
            } else if (diffMin < 60) {
               slaContent = `Resta ${diffMin} min`;
               slaColor = "text-orange-400 bg-orange-400/10 border-orange-500/30";
               isPulsing = true;
            } else {
               const diffHours = Math.floor(diffMin / 60);
               slaContent = `Expira em ${diffHours}h`;
               slaColor = "text-emerald-400 bg-emerald-400/10 border-emerald-500/30";
            }
          }

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

              <div className="card-action-footer flex items-center justify-between w-full mt-2">
                <div className="flex gap-2">
                  <span className={`prio-tag ${isUrgent ? 'red' : 'blue'}`}>
                    {isUrgent ? '🔴 Urgente' : '🔵 Normal'}
                  </span>
                  {slaContent && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${slaColor} ${isPulsing ? 'animate-pulse' : ''}`}>
                      <Timer size={10} /> {slaContent}
                    </span>
                  )}
                </div>
                <button 
                  className="btn-quick-schedule-premium ml-auto"
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
