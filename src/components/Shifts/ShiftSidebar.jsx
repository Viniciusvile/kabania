import React, { useState, useMemo } from 'react';
import { Clock, Plus, CheckCircle, MapPin, Activity, Timer, Layers, Search, GripVertical, LayoutGrid, AlertTriangle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

export default function ShiftSidebar({ 
  pendingActivities, 
  routineActivities = [], 
  onQuickSchedule, 
  onAutoPilot, 
  isAutoPilotLoading,
  onReturnShift 
}) {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [draggingId, setDraggingId] = useState(null);
  const [dragCounter, setDragCounter] = useState(0);
  const isDraggingOver = dragCounter > 0;
  const [groupingMode, setGroupingMode] = useState('none');
  const [collapsedGroups, setCollapsedGroups] = useState({});

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
      (a.title || '').toLowerCase().includes(s) ||
      (a.desc || '').toLowerCase().includes(s) ||
      (a.description || '').toLowerCase().includes(s) ||
      (a.customer_name || '').toLowerCase().includes(s) ||
      (a.location || '').toLowerCase().includes(s) ||
      (a.service_type || '').toLowerCase().includes(s) ||
      (a.type || '').toLowerCase().includes(s) ||
      (a.categoria || '').toLowerCase().includes(s)
    );
  }, [pendingActivities, searchTerm]);

  const filteredRoutine = useMemo(() => {
    if (!searchTerm) return routineActivities;
    const s = searchTerm.toLowerCase();
    return routineActivities.filter(a =>
      (a.name || '').toLowerCase().includes(s) ||
      (a.location || '').toLowerCase().includes(s) ||
      (a.type || '').toLowerCase().includes(s)
    );
  }, [routineActivities, searchTerm]);

  const toggleGroup = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const groupedPending = useMemo(() => {
    if (groupingMode === 'none') return null;
    const groups = {};
    filteredPending.forEach(act => {
      let key = 'Outros';
      if (groupingMode === 'condominio') {
        key = act.customer_name || act.condominio_nome || 'Sem Condomínio';
      } else if (groupingMode === 'categoria') {
        key = act.categoria || act.tag || 'Sem Categoria';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(act);
    });
    return groups;
  }, [filteredPending, groupingMode]);

  // ── Shared drag handlers ──────────────────────────────────────────────
  const handleDragStart = (e, item, isRoutine = false) => {
    setDraggingId(item.id);
    e.dataTransfer.effectAllowed = 'move';
    const payload = isRoutine
      ? { ...item, type: 'Rotina', location: item.name || 'Atividade Interna', source: 'activity' }
      : { ...item, source: item.source || 'service_request' };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    // Fallback key for legacy drop handlers
    e.dataTransfer.setData('activity', JSON.stringify(payload));
  };

  const handleDragEnd = () => setDraggingId(null);

  const groupBtnStyle = (active) => ({
    padding: '6px 8px',
    borderRadius: '8px',
    fontSize: '9px',
    fontWeight: 800,
    cursor: 'pointer',
    border: active ? '1px solid rgba(0,229,255,0.25)' : '1px solid rgba(255,255,255,0.05)',
    background: active 
      ? 'linear-gradient(135deg, rgba(0,194,255,0.08) 0%, rgba(0,114,255,0.12) 100%)' 
      : 'rgba(255,255,255,0.02)',
    color: active ? '#00e5ff' : 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    transition: 'all 0.2s',
    flex: 1,
    textAlign: 'center',
    boxShadow: active ? '0 0 10px rgba(0,229,255,0.08)' : 'none',
  });

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
    padding: '0.875rem',
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
    background: isRoutine
      ? 'rgba(168,85,247,0.15)'
      : 'var(--accent-cyan)',
    color: isRoutine ? '#c084fc' : 'var(--bg-app)',
    transition: 'all 0.2s',
    boxShadow: isRoutine ? 'none' : '0 4px 12px var(--accent-cyan-dim)',
  });

  const handleDrop = (e) => {
    e.preventDefault();
    try {
      const jsonStr = e.dataTransfer.getData('application/json');
      const textId = e.dataTransfer.getData('shiftId') || e.dataTransfer.getData('shiftid') || e.dataTransfer.getData('text/plain');
      
      console.log('[ShiftSidebar] Drop data received:', { hasJson: !!jsonStr, textId });

      let data = null;
      if (jsonStr) {
        try {
          data = JSON.parse(jsonStr);
        } catch (e) {
          console.warn('[ShiftSidebar] JSON parse failed, falling back to textId');
        }
      }
      
      // Se não temos objeto completo mas temos ID, tentamos reconstruir ou passar o ID
      const finalPayload = data?.id ? data : (textId ? textId : null);

      if (finalPayload && onReturnShift) {
        onReturnShift(finalPayload);
      }
    } catch (err) {
      console.error('Error handling drop in sidebar:', err);
    }
  };

  const renderPendingCard = (act, index) => {
    const isCrm = act.id?.toString().startsWith('crm-oc-');
    const isKanban = act.source === 'kanban' || isCrm;

    // Resolve title: prioritize categoria/title, fallback to type or service_type
    const rawTitle = act.title || act.categoria || act.type || act.service_type || 'Atividade';
    const cleanTitle = typeof rawTitle === 'string' 
      ? rawTitle.replace(/^(TITULO|TITLE|DESCRICAO|DESCRIPTION):\s*/i, '') 
      : 'Atividade';

    // Resolve description: desc, description, or descricao
    const rawDesc = act.desc || act.description || act.descricao || '';
    const cleanDesc = typeof rawDesc === 'string'
      ? rawDesc.replace(/^(DESCRICAO|DESCRIPTION):\s*/i, '')
      : '';

    // Resolve condo/location name
    const condo = act.customer_name || act.condominio_nome || act.location || 'Sem Condomínio';

    // Resolve severity
    const severity = act.severidade || (act.type?.toLowerCase().includes('urgente') || act.status === 'priority' || act.status === 'urgent' ? 'alta' : 'media');
    
    const severityColors = {
      alta: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: '#f87171', bar: '#ef4444' },
      media: { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)', text: '#fb923c', bar: '#f97316' },
      baixa: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', text: '#4ade80', bar: '#22c55e' }
    };
    
    const sev = severityColors[severity?.toLowerCase()] || severityColors.media;

    // SLA calculations
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
        draggable
        onDragStart={(e) => handleDragStart(e, act, false)}
        onDragEnd={handleDragEnd}
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: `1px solid ${draggingId === act.id ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: '12px',
          padding: '8px 10px',
          position: 'relative',
          cursor: 'grab',
          opacity: draggingId === act.id ? 0.5 : 1,
          transition: 'all 0.25s ease',
          userSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(10px)',
          animationDelay: `${index * 0.04}s`
        }}
        title="Arraste para o calendário ou clique em Agendar"
      >
        {/* Left accent line based on severity */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          background: sev.bar,
          borderRadius: '12px 0 0 12px'
        }} />

        {/* Header: Condomínio e Gravidade */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', maxWidth: '75%' }}>
            <MapPin size={9} style={{ color: 'var(--accent-cyan, #00e5ff)', flexShrink: 0 }} />
            <span style={{ 
              fontSize: '9px', 
              fontWeight: 800, 
              color: 'var(--text-muted, #94a3b8)', 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis' 
            }}>
              {condo}
            </span>
          </div>
          <span style={{
            fontSize: '8px',
            fontWeight: 900,
            textTransform: 'uppercase',
            padding: '1px 5px',
            borderRadius: '4px',
            background: sev.bg,
            border: `1px solid ${sev.border}`,
            color: sev.text,
            letterSpacing: '0.04em'
          }}>
            {severity?.toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <div style={{
          fontSize: '11px',
          fontWeight: 800,
          color: '#fff',
          lineHeight: '1.25',
          paddingLeft: '2px'
        }}>
          {cleanTitle}
        </div>

        {/* Description */}
        {cleanDesc && (
          <div style={{
            fontSize: '9px',
            color: 'rgba(255,255,255,0.45)',
            lineHeight: '1.35',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            paddingLeft: '2px'
          }}>
            {cleanDesc}
          </div>
        )}

        {/* Sync loading state indicator */}
        {act.isOptimistic && (
          <div style={{ 
            fontSize: '8px', 
            color: 'var(--accent-cyan, #00e5ff)', 
            fontWeight: 800, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '3px',
            opacity: 0.8,
            paddingLeft: '2px'
          }}>
            <Timer size={8} className="animate-spin" /> RESTAURANDO DO BANCO...
          </div>
        )}

        {/* Footer: Date, Source label, and Quick button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          paddingTop: '5px',
          marginTop: '2px'
        }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{
              fontSize: '8px',
              color: 'rgba(255,255,255,0.3)',
              fontWeight: 700
            }}>
              {isCrm ? '🔌 CRM' : isKanban ? '📋 KANBAN' : '📥 SOLICITAÇÃO'}
            </span>
            <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>•</span>
            <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
              {getTimeAgo(act.created_at || act.created)}
            </span>
            {slaContent && (
              <>
                <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>•</span>
                <span style={badgeStyle(slaColor)}>
                  {slaContent}
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => onQuickSchedule(act)}
            style={{
              background: 'rgba(0, 229, 255, 0.06)',
              border: '1px solid rgba(0, 229, 255, 0.15)',
              color: '#00e5ff',
              padding: '2px 6px',
              borderRadius: '5px',
              fontSize: '9px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.2s',
            }}
            className="quick-schedule-btn"
          >
            <Plus size={9} /> Agendar
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside 
      style={{ ...sidebarStyle, position: 'relative' }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Verificação extra para ver se é um shift vindo do grid
        const types = e.dataTransfer.types;
        const isShift = types.includes('shiftid') || types.includes('application/json');
        
        if (isShift && !draggingId && !isDraggingOver) {
          setDragCounter(prev => prev + 1);
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        // Só ativa o overlay se NÃO estivermos arrastando um item DA própria barra lateral
        if (!draggingId) {
          setDragCounter(prev => prev + 1);
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (!draggingId) {
          setDragCounter(prev => Math.max(0, prev - 1));
        }
      }}
      onDrop={(e) => {
        setDragCounter(0);
        console.log('Drop detectado na barra lateral');
        handleDrop(e);
      }}
    >
      {/* 📥 Drop Overlay Feedback */}
      {isDraggingOver && (
        <div className="sidebar-drop-overlay">
          <div className="drop-overlay-icon">
            <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
          </div>
          <span className="drop-overlay-text">Solte para Desagendar</span>
        </div>
      )}
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

      {/* ── Agrupamento (Somente para Workspace) ── */}
      {activeTab === 'pending' && (
        <div style={{ padding: '2px 12px 8px', display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button style={groupBtnStyle(groupingMode === 'none')} onClick={() => setGroupingMode('none')}>
            Sem Agrupamento
          </button>
          <button style={groupBtnStyle(groupingMode === 'condominio')} onClick={() => setGroupingMode('condominio')}>
            Condomínio
          </button>
          <button style={groupBtnStyle(groupingMode === 'categoria')} onClick={() => setGroupingMode('categoria')}>
            Categoria
          </button>
        </div>
      )}

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
        {activeTab === 'pending' && groupingMode === 'none' && filteredPending.map((act, index) => renderPendingCard(act, index))}

        {activeTab === 'pending' && groupingMode !== 'none' && Object.entries(groupedPending || {}).map(([groupName, items]) => {
          const isCollapsed = !!collapsedGroups[groupName];
          return (
            <div key={groupName} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div 
                onClick={() => toggleGroup(groupName)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '85%' }}>
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: 800, 
                    color: 'var(--accent-cyan, #00e5ff)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {groupName}
                  </span>
                  <span style={{
                    fontSize: '8px',
                    fontWeight: 900,
                    background: 'rgba(0, 229, 255, 0.08)',
                    color: '#00e5ff',
                    padding: '1px 5px',
                    borderRadius: '4px',
                  }}>
                    {items.length}
                  </span>
                </div>
                {isCollapsed ? <ChevronDown size={12} style={{ opacity: 0.5 }} /> : <ChevronUp size={12} style={{ opacity: 0.5 }} />}
              </div>
              
              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '2px' }}>
                  {items.map((act, index) => renderPendingCard(act, index))}
                </div>
              )}
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
                {act.location || act.name}
              </div>

              <p style={{ fontSize: '11px', opacity: 0.5, marginBottom: '10px' }}>
                {act.type ? `${act.type} — ` : ''}
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
