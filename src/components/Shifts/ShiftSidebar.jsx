import React, { useState, useMemo } from 'react';
import { Clock, Plus, CheckCircle, MapPin, Activity, Timer, Layers, Search } from 'lucide-react';

export default function ShiftSidebar({ pendingActivities, routineActivities = [], onQuickSchedule, onAutoPilot, isAutoPilotLoading }) {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'routine'
  const [searchTerm, setSearchTerm] = useState('');

  const truncateUUID = (uuid) => {
    if (!uuid || uuid.length < 12) return uuid;
    return `#${uuid.substring(0, 8)}`;
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recente';
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

  const filteredRoutine = useMemo(() => {
    if (!searchTerm) return routineActivities;
    return routineActivities.filter(a => 
      a.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [routineActivities, searchTerm]);

  const filteredPending = useMemo(() => {
    if (!searchTerm) return pendingActivities;
    return pendingActivities.filter(a => 
      (a.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.service_type || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pendingActivities, searchTerm]);

  return (
    <aside className="pending-activities-sidebar glass-morphism animate-slide-in-right">
      <div className="sidebar-tabs-premium">
        <button 
          className={`sidebar-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <Activity size={16} />
          <span>Solicitações</span>
          {pendingActivities.length > 0 && <span className="tab-count-badge">{pendingActivities.length}</span>}
        </button>
        <button 
          className={`sidebar-tab-btn ${activeTab === 'routine' ? 'active' : ''}`}
          onClick={() => setActiveTab('routine')}
        >
          <Layers size={16} />
          <span>Atividades</span>
          {routineActivities.length > 0 && <span className="tab-count-badge gray">{routineActivities.length}</span>}
        </button>
      </div>

      <div className="sidebar-search-area px-4 py-2">
        <div className="premium-sidebar-search">
          <Search size={14} className="text-white/20" />
          <input 
            type="text" 
            placeholder={`Buscar em ${activeTab === 'pending' ? 'Solicitações' : 'Atividades'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {activeTab === 'pending' && pendingActivities.length > 0 && (
        <div className="px-4 pb-3">
          <button 
            className="w-full flex justify-center items-center gap-2 py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/30 transition-all pulse-on-hover shadow-[0_0_15px_rgba(99,102,241,0.2)]"
            onClick={onAutoPilot}
            disabled={isAutoPilotLoading}
          >
            {isAutoPilotLoading ? <span className="animate-spin text-indigo-400 font-black">⚙️</span> : <Activity size={18} className="text-purple-400" />}
            {isAutoPilotLoading ? 'Processando IA...' : 'Auto-Pilot IA 🚀'}
          </button>
        </div>
      )}

      <div className="pending-list-premium custom-scrollbar">
        {/* VIEW: PENDING SOLICITATIONS */}
        {activeTab === 'pending' && filteredPending.map((act, index) => {
          const isUrgent = act.type?.toLowerCase().includes('urgente') || act.status === 'priority' || act.status === 'urgent';
          
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
              style={{ animationDelay: `${index * 0.05}s` }}
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
                {act.location || "Local não definido"}
              </h4>

              <p className="act-short-desc">
                {act.service_type || act.description || "Sem descrição"}
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

        {/* VIEW: ROUTINE ACTIVITIES CATALOG */}
        {activeTab === 'routine' && filteredRoutine.map((act, index) => (
            <div 
              key={act.id} 
              className="pending-premium-card routine-card-vibe"
              style={{ animationDelay: `${index * 0.05}s` }}
              draggable
              onDragStart={(e) => {
                const dragAct = { ...act, type: 'Rotina', location: 'Atividade Interna' };
                e.dataTransfer.setData('activity', JSON.stringify(dragAct));
                e.dataTransfer.effectAllowed = 'copy';
              }}
            >
              <div className="card-top-info">
                <span className="act-tag routine">{truncateUUID(act.id)}</span>
                <span className="time-ago-tag gray">
                  Rotina Corporativa
                </span>
              </div>

              <h4 className="act-location-title">
                <Activity size={14} className="text-purple-400" />
                {act.name}
              </h4>

              <p className="act-short-desc">
                Clique para agendar rapidamente ou arraste para o grid.
              </p>

              <div className="card-action-footer flex items-center justify-end w-full mt-2">
                <button 
                  className="btn-quick-schedule-premium routine ml-auto"
                  onClick={() => onQuickSchedule(act)}
                >
                  <Plus size={14} /> Programar
                </button>
              </div>
            </div>
        ))}

        {((activeTab === 'pending' && filteredPending.length === 0) || (activeTab === 'routine' && filteredRoutine.length === 0)) && (
          <div className="empty-pending-premium">
            <div className="success-icon-bg">
               <CheckCircle size={32} />
            </div>
            <p>{searchTerm ? 'Nenhum resultado.' : 'Tudo em dia!'}</p>
            <span>{searchTerm ? 'Tente outro termo...' : 'Aguardando novas demandas.'}</span>
          </div>
        )}
      </div>

      <style>{`
        .sidebar-tabs-premium {
          display: flex;
          padding: 10px;
          gap: 5px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .sidebar-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 5px;
          font-size: 11px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.4);
          border-radius: 10px;
          transition: all 0.2s ease;
          position: relative;
        }
        .sidebar-tab-btn:hover {
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.7);
        }
        .sidebar-tab-btn.active {
          background: rgba(0, 229, 255, 0.1);
          color: var(--accent-cyan);
          box-shadow: inset 0 0 10px rgba(0, 229, 255, 0.05);
        }
        .tab-count-badge {
          font-size: 9px;
          background: var(--accent-cyan);
          color: #000;
          padding: 2px 6px;
          border-radius: 50px;
          box-shadow: 0 0 10px rgba(0, 229, 255, 0.3);
        }
        .tab-count-badge.gray {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
          box-shadow: none;
        }
        .premium-sidebar-search {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 8px 12px;
          border-radius: 12px;
          margin-bottom: 5px;
        }
        .premium-sidebar-search input {
          background: transparent;
          border: none;
          outline: none;
          color: white;
          font-size: 11px;
          width: 100%;
        }
        .routine-card-vibe {
          border-left: 3px solid rgba(168, 85, 247, 0.3);
        }
        .act-tag.routine {
          background: rgba(168, 85, 247, 0.1);
          color: #d8b4fe;
          border-color: rgba(168, 85, 247, 0.2);
        }
        .btn-quick-schedule-premium.routine {
          background: rgba(168, 85, 247, 0.1);
          color: #d8b4fe;
          border-color: rgba(168, 85, 247, 0.2);
        }
        .btn-quick-schedule-premium.routine:hover {
          background: #a855f7;
          color: white;
        }
      `}</style>
    </aside>
  );
}
