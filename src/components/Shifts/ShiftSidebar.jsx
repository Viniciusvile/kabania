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

  // Style helpers removed in favor of semantic CSS classes

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
        className={`sidebar-card-premium ${draggingId === act.id ? 'dragging' : ''} ${severity?.toLowerCase()}`}
        style={{
          animationDelay: `${index * 0.04}s`
        }}
        title="Arraste para o calendário ou clique em Agendar"
      >
        {/* Left accent line based on severity */}
        <div className="sidebar-card-accent-line" />

        {/* Header: Condomínio e Gravidade */}
        <div className="sidebar-card-header">
          <div className="sidebar-card-header-left">
            <MapPin size={9} className="sidebar-card-header-icon" />
            <span className="sidebar-card-header-text">
              {condo}
            </span>
          </div>
          <span className={`severity-badge ${severity?.toLowerCase()}`}>
            {severity?.toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <div className="sidebar-card-title">
          {cleanTitle}
        </div>

        {/* Description */}
        {cleanDesc && (
          <div className="sidebar-card-desc">
            {cleanDesc}
          </div>
        )}

        {/* Sync loading state indicator */}
        {act.isOptimistic && (
          <div className="sidebar-card-sync">
            <Timer size={8} className="animate-spin" /> RESTAURANDO DO BANCO...
          </div>
        )}

        {/* Footer: Date, Source label, and Quick button */}
        <div className="sidebar-card-footer">
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span className="sidebar-card-source">
              {isCrm ? '🔌 CRM' : isKanban ? '📋 KANBAN' : '📥 SOLICITAÇÃO'}
            </span>
            <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>•</span>
            <span className="sidebar-card-time">
              {getTimeAgo(act.created_at || act.created)}
            </span>
            {slaContent && (
              <>
                <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>•</span>
                <span className={`sidebar-badge ${slaColor}`}>
                  {slaContent}
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => onQuickSchedule(act)}
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
      className="shifts-sidebar-premium"
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
      <div className="sidebar-tabs-container">
        <button 
          className={`sidebar-tab-premium ${activeTab === 'pending' ? 'active' : ''}`} 
          onClick={() => setActiveTab('pending')}
        >
          <LayoutGrid size={13} />
          WORKSPACE
          {pendingActivities.length > 0 && (
            <span className="sidebar-tab-count">
              {pendingActivities.length}
            </span>
          )}
        </button>
        <button 
          className={`sidebar-tab-premium ${activeTab === 'routine' ? 'active' : ''}`} 
          onClick={() => setActiveTab('routine')}
        >
          <Layers size={13} />
          ATIVIDADES
          {routineActivities.length > 0 && (
            <span className="sidebar-tab-count routine-badge">
              {routineActivities.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Search ── */}
      <div className="sidebar-search-wrapper">
        <div className="sidebar-search-container">
          <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder={`Buscar no ${activeTab === 'pending' ? 'Workspace' : 'Atividades'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sidebar-search-input"
          />
        </div>
      </div>

      {/* ── Agrupamento (Somente para Workspace) ── */}
      {activeTab === 'pending' && (
        <div className="sidebar-group-wrapper">
          <button 
            className={`sidebar-group-btn ${groupingMode === 'none' ? 'active' : ''}`} 
            onClick={() => setGroupingMode('none')}
          >
            Sem Agrupamento
          </button>
          <button 
            className={`sidebar-group-btn ${groupingMode === 'condominio' ? 'active' : ''}`} 
            onClick={() => setGroupingMode('condominio')}
          >
            Condomínio
          </button>
          <button 
            className={`sidebar-group-btn ${groupingMode === 'categoria' ? 'active' : ''}`} 
            onClick={() => setGroupingMode('categoria')}
          >
            Categoria
          </button>
        </div>
      )}

      {/* Auto-Pilot removido do Workspace - era exclusivo de solicitações */}

      {/* ── Drag Hint ── */}
      <div className="sidebar-drag-hint">
        <GripVertical size={11} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
        <span>
          Arraste para o calendário
        </span>
      </div>

      {/* ── Card List ── */}
      <div 
        className="sidebar-card-list custom-scrollbar"
      >
        {/* WORKSPACE: Service Requests + Kanban Tasks */}
        {activeTab === 'pending' && groupingMode === 'none' && filteredPending.map((act, index) => renderPendingCard(act, index))}

        {activeTab === 'pending' && groupingMode !== 'none' && Object.entries(groupedPending || {}).map(([groupName, items]) => {
          const isCollapsed = !!collapsedGroups[groupName];
          return (
            <div key={groupName} className="sidebar-group-section">
              <div 
                onClick={() => toggleGroup(groupName)}
                className="sidebar-group-header"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '85%' }}>
                  <span className="sidebar-group-title">
                    {groupName}
                  </span>
                  <span className="sidebar-group-count">
                    {items.length}
                  </span>
                </div>
                {isCollapsed ? <ChevronDown size={12} style={{ opacity: 0.5 }} /> : <ChevronUp size={12} style={{ opacity: 0.5 }} />}
              </div>
              
              {!isCollapsed && (
                <div className="sidebar-group-items">
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
              className={`sidebar-card-premium routine-card ${isDragging ? 'dragging' : ''}`}
              style={{ animationDelay: `${index * 0.04}s` }}
              draggable
              onDragStart={(e) => handleDragStart(e, act, true)}
              onDragEnd={handleDragEnd}
              title="Arraste para o calendário ou clique em Programar"
            >
              {/* Purple accent line */}
              <div className="sidebar-card-accent-line" />

              <div className="sidebar-card-header">
                <span className="sidebar-badge purple">{truncateUUID(act.id)}</span>
                <span className="sidebar-routine-label">Rotina Corporativa</span>
              </div>

              <div className="sidebar-routine-title">
                <Activity size={12} className="sidebar-routine-icon" />
                {act.location || act.name}
              </div>

              <p className="sidebar-routine-desc">
                {act.type ? `${act.type} — ` : ''}
                Arraste para o grid ou clique para programar.
              </p>

              <div className="sidebar-card-footer routine-footer">
                <button className="routine-schedule-btn" onClick={() => onQuickSchedule(act)}>
                  <Plus size={12} /> Programar
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {((activeTab === 'pending' && filteredPending.length === 0) ||
          (activeTab === 'routine' && filteredRoutine.length === 0)) && (
          <div className="sidebar-empty-state">
            <div className="sidebar-empty-icon-wrapper">
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
