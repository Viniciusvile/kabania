import React, { useState, useMemo } from 'react';
import { Clock, Plus, CheckCircle, MapPin, Activity, Timer, Layers, Search, GripVertical, LayoutGrid, AlertTriangle, Calendar } from 'lucide-react';

export default function ShiftSidebar({ pendingActivities, routineActivities = [], onQuickSchedule, onAutoPilot, isAutoPilotLoading }) {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [draggingId, setDraggingId] = useState(null);

  const truncateUUID = (uuid) => {
    if (!uuid || uuid.length < 12) return uuid;
    return `#${uuid.substring(0, 8).toUpperCase()}`;
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

  const filteredPending = useMemo(() => {
    if (!searchTerm) return pendingActivities;
    const s = searchTerm.toLowerCase();
    return pendingActivities.filter(a =>
      (a.location || '').toLowerCase().includes(s) ||
      (a.description || '').toLowerCase().includes(s) ||
      (a.service_type || '').toLowerCase().includes(s) ||
      (a.type || '').toLowerCase().includes(s)
    );
  }, [pendingActivities, searchTerm]);

  const filteredRoutine = useMemo(() => {
    if (!searchTerm) return routineActivities;
    return routineActivities.filter(a =>
      a.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [routineActivities, searchTerm]);

  // ── Shared drag handlers ──────────────────────────────────────────────
  const handleDragStart = (e, item, isRoutine = false) => {
    setDraggingId(item.id);
    e.dataTransfer.effectAllowed = 'move';
    const payload = isRoutine
      ? { ...item, type: 'Rotina', location: item.name || 'Atividade Interna', source: 'routine' }
      : { ...item, source: item.source || 'service_request' };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    // Fallback key for legacy drop handlers
    e.dataTransfer.setData('activity', JSON.stringify(payload));
  };

  const handleDragEnd = () => setDraggingId(null);

  // ── Styles ────────────────────────────────────────────────────────────
  const sidebarStyle = {
    height: 'calc(100vh - 120px)',
    maxHeight: '850px',
    position: 'sticky',
    top: '20px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: '20px',
    background: 'var(--bg-card, rgba(255,255,255,0.03))',
    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
  };

  const tabStyle = (active) => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 10px',
    fontSize: '11px',
    fontWeight: 800,
    borderRadius: '12px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    border: active ? '1px solid rgba(0,229,255,0.3)' : '1px solid transparent',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    background: active 
      ? 'linear-gradient(135deg, rgba(0,194,255,0.1) 0%, rgba(0,114,255,0.15) 100%)' 
      : 'transparent',
    color: active ? 'var(--accent-cyan, #00e5ff)' : 'var(--text-muted)',
    boxShadow: active ? '0 0 20px rgba(0,229,255,0.15)' : 'none',
  });

  const cardBase = (isDragging, isRoutine, isUrgent) => ({
    background: 'var(--bg-card, rgba(255,255,255,0.04))',
    border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.3)' : isRoutine ? 'rgba(168,85,247,0.2)' : 'var(--border-color, rgba(255,255,255,0.08))'}`,
    borderRadius: '16px',
    padding: '1.125rem',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.25s cubic-bezier(0.175,0.885,0.32,1.275)',
    cursor: 'grab',
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? '0 0 0 2px var(--accent-cyan)' : '0 2px 8px rgba(0,0,0,0.06)',
    userSelect: 'none',
  });

  const badgeStyle = (color = 'cyan') => {
    const colors = {
      cyan: { bg: 'rgba(0,229,255,0.1)', text: 'var(--accent-cyan, #00e5ff)', border: 'rgba(0,229,255,0.2)' },
      purple: { bg: 'rgba(168,85,247,0.1)', text: '#c084fc', border: 'rgba(168,85,247,0.2)' },
      red: { bg: 'rgba(239,68,68,0.1)', text: '#f87171', border: 'rgba(239,68,68,0.2)' },
      orange: { bg: 'rgba(249,115,22,0.1)', text: '#fb923c', border: 'rgba(249,115,22,0.2)' },
      green: { bg: 'rgba(34,197,94,0.1)', text: '#4ade80', border: 'rgba(34,197,94,0.2)' },
    };
    const c = colors[color] || colors.cyan;
    return {
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em',
      padding: '2px 8px', borderRadius: '6px',
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    };
  };

  const scheduleBtn = (isRoutine) => ({
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '6px 14px', borderRadius: '8px', border: 'none',
    fontSize: '11px', fontWeight: 800, cursor: 'pointer',
    background: isRoutine ? 'rgba(168,85,247,0.15)' : 'var(--accent-cyan, #00e5ff)',
    color: isRoutine ? '#c084fc' : '#000',
    transition: 'all 0.2s',
    boxShadow: isRoutine ? 'none' : '0 4px 12px rgba(0,229,255,0.25)',
  });

  return (
    <aside style={sidebarStyle}>
      {/* ── Tabs ── */}
      <div style={{ display: 'flex', padding: '10px', gap: '6px', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.07))' }}>
        <button style={tabStyle(activeTab === 'pending')} onClick={() => setActiveTab('pending')}>
          <LayoutGrid size={13} />
          WORKSPACE
          {pendingActivities.length > 0 && (
            <span style={{ 
              background: 'rgba(0,229,255,0.1)', 
              color: 'var(--accent-cyan)', 
              border: '1px solid rgba(0,229,255,0.3)',
              fontSize: '10px', 
              padding: '2px 8px', 
              borderRadius: '99px', 
              fontWeight: 900 
            }}>
              {pendingActivities.length}
            </span>
          )}
        </button>
        <button style={tabStyle(activeTab === 'routine')} onClick={() => setActiveTab('routine')}>
          <Layers size={13} />
          ATIVIDADES
          {routineActivities.length > 0 && (
            <span style={{ 
              background: activeTab === 'routine' ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.05)', 
              color: activeTab === 'routine' ? '#c084fc' : 'var(--text-muted)', 
              border: `1px solid ${activeTab === 'routine' ? 'rgba(168,85,247,0.3)' : 'transparent'}`,
              fontSize: '10px', 
              padding: '2px 8px', 
              borderRadius: '99px', 
              fontWeight: 900 
            }}>
              {routineActivities.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Search ── */}
      <div style={{ padding: '10px 12px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '8px 12px', borderRadius: '10px' }}>
          <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder={`Buscar no ${activeTab === 'pending' ? 'Workspace' : 'Atividades'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '11px', width: '100%' }}
          />
        </div>
      </div>

      {/* Auto-Pilot removido do Workspace - era exclusivo de solicitações */}

      {/* ── Drag Hint ── */}
      <div style={{ padding: '4px 12px 2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <GripVertical size={11} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
        <span style={{ fontSize: '9px', fontWeight: 700, opacity: 0.35, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Arraste para o calendário
        </span>
      </div>

      {/* ── Card List ── */}
      <div style={{ flex: 1, padding: '8px 12px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}
        className="custom-scrollbar"
      >
        {/* WORKSPACE: Service Requests + Kanban Tasks */}
        {activeTab === 'pending' && filteredPending.map((act, index) => {
          const isKanban = act.source === 'kanban';

          // ── Kanban card ──────────────────────────────────────────
          if (isKanban) {
            const colLabels = { backlog: 'BACKLOG', todo: 'TO DO', progress: 'IN PROGRESS' };
            const colColors = { backlog: 'rgba(148,163,184,0.12)', todo: 'rgba(0,229,255,0.08)', progress: 'rgba(34,197,94,0.08)' };
            const colBorders = { backlog: 'rgba(148,163,184,0.2)', todo: 'rgba(0,229,255,0.2)', progress: 'rgba(34,197,94,0.2)' };
            const colTextColors = { backlog: '#94a3b8', todo: 'var(--accent-cyan)', progress: '#4ade80' };
            const col = act.column_id || 'todo';
            const hasDeadline = act.deadline;
            const isOverdue = hasDeadline && new Date(act.deadline) < new Date();

            return (
              <div
                key={act.id}
                style={{
                  background: colColors[col] || 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colBorders[col] || 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '16px', padding: '1.125rem', position: 'relative',
                  overflow: 'hidden', cursor: 'grab',
                  opacity: draggingId === act.id ? 0.5 : 1,
                  transition: 'all 0.25s',
                  userSelect: 'none',
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, act, false)}
                onDragEnd={handleDragEnd}
              >
                {/* Side accent line */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: colTextColors[col] || '#94a3b8', borderRadius: '16px 0 0 16px' }} />

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: colTextColors[col], background: colColors[col], border: `1px solid ${colBorders[col]}`, padding: '2px 7px', borderRadius: '5px' }}>
                    {colLabels[col] || col.toUpperCase()}
                  </span>
                  {isOverdue && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#f87171', fontWeight: 800 }}>
                      <AlertTriangle size={10} /> Atrasado
                    </span>
                  )}
                </div>

                {/* Title */}
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                  {act.title}
                </div>

                {/* Description */}
                {act.desc && (
                  <p style={{ fontSize: '11px', opacity: 0.55, marginBottom: '8px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {act.desc}
                  </p>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {act.customer_name && (
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '5px', background: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)' }}>
                        {act.customer_name}
                      </span>
                    )}
                    {hasDeadline && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: isOverdue ? '#f87171' : 'var(--text-muted)', fontWeight: 700 }}>
                        <Calendar size={9} /> {new Date(act.deadline + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                  <button style={scheduleBtn(false)} onClick={() => onQuickSchedule(act)}>
                    <Plus size={12} /> Agendar
                  </button>
                </div>
              </div>
            );
          }
          const isUrgent = act.type?.toLowerCase().includes('urgente') || act.status === 'priority' || act.status === 'urgent';
          const isDragging = draggingId === act.id;

          let slaContent = null, slaColor = 'green';
          if (act.sla_deadline) {
            const diffMin = Math.floor((new Date(act.sla_deadline) - new Date()) / 60000);
            if (act.sla_breached || diffMin < 0) { slaContent = 'SLA Estourado!'; slaColor = 'red'; }
            else if (diffMin < 60) { slaContent = `Resta ${diffMin}min`; slaColor = 'orange'; }
            else { slaContent = `Expira em ${Math.floor(diffMin / 60)}h`; slaColor = 'green'; }
          }

          return (
            <div
              key={act.id}
              style={{ ...cardBase(isDragging, false, isUrgent), animationDelay: `${index * 0.04}s` }}
              draggable
              onDragStart={(e) => handleDragStart(e, act, false)}
              onDragEnd={handleDragEnd}
              title="Arraste para o calendário ou clique em Agendar"
            >
              {/* Urgent line */}
              {isUrgent && <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: '#ef4444', borderRadius: '16px 0 0 16px' }} />}

              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                <span style={badgeStyle('cyan')}>{act.id ? truncateUUID(act.id) : '#SR-NEW'}</span>
                <span style={{ fontSize: '10px', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={10} /> {getTimeAgo(act.created_at || act.created)}
                </span>
              </div>

              {/* Location */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, marginBottom: '4px', letterSpacing: '-0.01em' }}>
                <MapPin size={12} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                {act.location || 'Local não definido'}
              </div>

              {/* Description */}
              <p style={{ fontSize: '11px', opacity: 0.6, lineHeight: 1.5, margin: '0 0 10px', minHeight: '1.2rem' }}>
                <span style={{ fontWeight: 600 }}>{act.type || act.service_type || 'Serviço'}</span>
                {act.description && ` — ${act.description}`}
              </p>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={badgeStyle(isUrgent ? 'red' : 'cyan')}>
                    {isUrgent ? '🔴 Urgente' : '🔵 Normal'}
                  </span>
                  {slaContent && (
                    <span style={badgeStyle(slaColor)}>
                      <Timer size={9} /> {slaContent}
                    </span>
                  )}
                </div>
                <button style={scheduleBtn(false)} onClick={() => onQuickSchedule(act)}>
                  <Plus size={12} /> Agendar
                </button>
              </div>
            </div>
          );
        })}

        {/* ROUTINE ACTIVITIES */}
        {activeTab === 'routine' && filteredRoutine.map((act, index) => {
          const isDragging = draggingId === act.id;
          return (
            <div
              key={act.id}
              style={{ ...cardBase(isDragging, true, false), animationDelay: `${index * 0.04}s` }}
              draggable
              onDragStart={(e) => handleDragStart(e, act, true)}
              onDragEnd={handleDragEnd}
              title="Arraste para o calendário ou clique em Programar"
            >
              {/* Purple accent line */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'linear-gradient(180deg, #a855f7, #7c3aed)', borderRadius: '16px 0 0 16px' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                <span style={badgeStyle('purple')}>{truncateUUID(act.id)}</span>
                <span style={{ fontSize: '9px', opacity: 0.4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rotina Corporativa</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
                <Activity size={12} style={{ color: '#c084fc', flexShrink: 0 }} />
                {act.name}
              </div>

              <p style={{ fontSize: '11px', opacity: 0.5, marginBottom: '10px' }}>
                Arraste para o grid ou clique para programar.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                <button style={scheduleBtn(true)} onClick={() => onQuickSchedule(act)}>
                  <Plus size={12} /> Programar
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {((activeTab === 'pending' && filteredPending.length === 0) ||
          (activeTab === 'routine' && filteredRoutine.length === 0)) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '1rem', opacity: 0.5 }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={28} style={{ color: '#10b981' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 700, fontSize: '13px' }}>{searchTerm ? 'Nenhum resultado' : 'Tudo em dia!'}</p>
              <p style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>{searchTerm ? 'Tente outro termo...' : 'Nenhuma demanda pendente.'}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
