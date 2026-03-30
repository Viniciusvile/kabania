import React, { useState, useRef, useEffect } from 'react';
import { 
  Map, Server, Monitor, AlertTriangle, CheckCircle, 
  MapPin, X, Flame, ShieldAlert, Cpu, Box, Wrench, Thermometer,
  Settings2, Save, Move
} from 'lucide-react';
import './DigitalTwinModule.css';

// Mock data for the digital twin rooms representing cross-module data (Inventory + SLA/Service Center)
const ROOMS_DATA = {
  'reception': {
    id: 'reception',
    name: 'Recepção Principal',
    status: 'normal',
    stats: { tickets: 0, assets: 3, temperature: '22°C' },
    icon: <MapPin size={24} className="room-header-icon" />,
    description: 'Área de atendimento e controle de acesso principal.'
  },
  'server_room': {
    id: 'server_room',
    name: 'Data Center / CPD',
    status: 'critical',
    pulse: true,
    stats: { tickets: 2, assets: 45, temperature: '27.5°C' },
    icon: <Server size={24} className="room-header-icon" />,
    description: 'Nobreaks, Racks de infraestrutura e core switches.'
  },
  'meeting_room': {
    id: 'meeting_room',
    name: 'Sala de Fuso (Reuniões)',
    status: 'warning',
    stats: { tickets: 1, assets: 8, temperature: '23°C' },
    icon: <Monitor size={24} className="room-header-icon" />,
    description: 'Sistema de videoconferência apresentando instabilidade.'
  },
  'open_space': {
    id: 'open_space',
    name: 'Open Space (Engenharia)',
    status: 'normal',
    stats: { tickets: 3, assets: 120, temperature: '24°C' },
    icon: <Cpu size={24} className="room-header-icon" />,
    description: 'Estações de trabalho das equipes de desenvolvimento.'
  }
};

const DEFAULT_LAYOUT = {
  reception: { x: 70, y: 70, w: 200, h: 280 },
  meeting_room: { x: 70, y: 370, w: 200, h: 160 },
  open_space: { x: 290, y: 270, w: 440, h: 260 },
  server_room: { x: 290, y: 70, w: 440, h: 180 },
};

export default function DigitalTwinModule({ currentCompany }) {
  const [activeRoom, setActiveRoom] = useState(null);
  const [hoveredRoom, setHoveredRoom] = useState(null);
  
  // Interactive Editor States
  const [isEditMode, setIsEditMode] = useState(false);
  const [roomsLayout, setRoomsLayout] = useState(DEFAULT_LAYOUT);
  const [dragState, setDragState] = useState(null); // { id: 'room_id', offsetX, offsetY }
  
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  const handleMouseMove = (e) => {
    // Only update tooltip slightly from cursor if NOT dragging
    if (!dragState) {
      setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 });
    }
  };

  // ── Drag & Drop Logic (SVG Coordinate Math) ────────────────────
  const getMousePosInSvg = (evt) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (CTM) {
      return {
        x: (evt.clientX - CTM.e) / CTM.a,
        y: (evt.clientY - CTM.f) / CTM.d
      };
    }
    // Fallback based on bounds (if CTM fails)
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left) * (800 / rect.width),
      y: (evt.clientY - rect.top) * (600 / rect.height)
    };
  };

  const handleSvgMouseDown = (e, roomId) => {
    if (!isEditMode) return;
    
    // Calculate click offset relative to the room's current top-left corner
    const mousePos = getMousePosInSvg(e);
    const roomRender = roomsLayout[roomId];
    
    setDragState({
      id: roomId,
      offsetX: mousePos.x - roomRender.x,
      offsetY: mousePos.y - roomRender.y
    });
        
    // Bring dragged element to top visually (close panel if open)
    setActiveRoom(null);
  };

  const handleSvgMouseMove = (e) => {
    if (!isEditMode || !dragState) return;
    e.preventDefault();

    const mousePos = getMousePosInSvg(e);
    
    // Calculate new position
    let newX = mousePos.x - dragState.offsetX;
    let newY = mousePos.y - dragState.offsetY;

    // Optional: Boundary constraints to keep it inside the viewbox slightly (800x600)
    const roomW = roomsLayout[dragState.id].w;
    const roomH = roomsLayout[dragState.id].h;
    
    // Restrict dragging slightly inside the outer boundary (50 to 750 / 50 to 550)
    if (newX < 50) newX = 50;
    if (newY < 50) newY = 50;
    if (newX + roomW > 750) newX = 750 - roomW;
    if (newY + roomH > 550) newY = 550 - roomH;
    
    // Grid Snap (Snapping to nearest 10px or 20px makes it feel professional)
    const snapSize = 10;
    newX = Math.round(newX / snapSize) * snapSize;
    newY = Math.round(newY / snapSize) * snapSize;

    setRoomsLayout({
      ...roomsLayout,
      [dragState.id]: {
        ...roomsLayout[dragState.id],
        x: newX,
        y: newY
      }
    });
  };

  const handleSvgMouseUp = () => {
    if (dragState) {
      setDragState(null);
    }
  };

  // Add global mouse up backup
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState) setDragState(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [dragState]);

  // ─────────────────────────────────────────────────────────────

  const getRoomClass = (roomId) => {
    const isHovered = hoveredRoom === roomId;
    const isActive = activeRoom?.id === roomId;
    const isDragging = dragState?.id === roomId;
    const room = ROOMS_DATA[roomId];
    
    let baseClass = `map-room room-${roomId} status-${room.status}`;
    if (isHovered && !isEditMode) baseClass += ' hovered';
    if (isActive && !isEditMode) baseClass += ' active';
    if (room.pulse && !isEditMode) baseClass += ' pulsing';
    
    // Edit mode specific classes
    if (isEditMode) baseClass += ' edit-mode-room';
    if (isDragging) baseClass += ' dragging';
    
    return baseClass;
  };

  const handleRoomClick = (roomId) => {
    if (isEditMode) return; // Prevent panel opening while editing
    setActiveRoom(ROOMS_DATA[roomId]);
  };

  const closePanel = () => setActiveRoom(null);

  const renderStatusBadge = (status) => {
    if (status === 'critical') return <span className="status-badge critical"><ShieldAlert size={14} /> Risco SLA</span>;
    if (status === 'warning') return <span className="status-badge warning"><AlertTriangle size={14} /> Atenção Req.</span>;
    return <span className="status-badge normal"><CheckCircle size={14} /> Operacional</span>;
  };

  const toggleEditMode = () => {
    // If entering edit mode, close panel
    if (!isEditMode) setActiveRoom(null);
    setIsEditMode(!isEditMode);
  };

  // Renders a specific room based on State Data
  const renderRoom = (roomId, hasWarning = false, hasCritical = false) => {
    const roomInfo = ROOMS_DATA[roomId];
    const layout = roomsLayout[roomId];
    const { x, y, w, h } = layout;
    
    return (
      <g 
        className={getRoomClass(roomId)}
        onMouseEnter={() => setHoveredRoom(roomId)}
        onMouseLeave={() => setHoveredRoom(null)}
        onClick={() => handleRoomClick(roomId)}
        onMouseDown={(e) => handleSvgMouseDown(e, roomId)}
        key={roomId}
      >
        <rect x={x} y={y} width={w} height={h} rx="16" className="room-shape" />
        
        {/* Label centered */}
        <text x={x + w/2} y={y + h/2} className="room-label" textAnchor="middle">
          {roomInfo.name.split(' (')[0]}
        </text>

        {/* Edit mode overlay (Drag Icon) */}
        {isEditMode && (
           <g transform={`translate(${x + 16}, ${y + 16})`} opacity="0.6">
             <circle cx="12" cy="12" r="14" fill="var(--bg-card)" stroke="var(--border-light)" />
             <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M19 9l3 3-3 3M9 19l3 3 3-3M2 12h20M12 2v20" 
                   stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
           </g>
        )}
        
        {/* Indicators only in View Mode */}
        {!isEditMode && hasWarning && (
           <g transform={`translate(${x + w - 40}, ${y + 30})`}>
             <circle cx="0" cy="0" r="16" className="indicator-warning-pulse" />
             <circle cx="0" cy="0" r="6" className="indicator-warning-core" />
           </g>
        )}

        {!isEditMode && hasCritical && (
           <g transform={`translate(${x + w - 50}, ${y + 30})`}>
             <circle cx="0" cy="0" r="24" className="beacon-pulse" />
             <circle cx="0" cy="0" r="16" className="beacon-pulse-delay" />
             <circle cx="0" cy="0" r="8" className="beacon-core" />
           </g>
        )}
      </g>
    );
  };

  return (
    <div className={`digital-twin-container ${isEditMode ? 'editing' : ''}`} onMouseMove={handleMouseMove}>
      <header className="dt-header">
        <div className="dt-title-group" style={{ width: '100%', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="dt-icon-wrapper">
               <Map size={26} style={{ color: "var(--accent-cyan)" }} />
            </div>
            <div>
              <div className="dt-title-row">
                <h1>Gêmeo Digital</h1>
                <span className="premium-badge">Acesso VIP</span>
              </div>
              <p className="dt-subtitle">
                Visualização espacial interativa integrando IoT, Ativos e Chamados SLA.
              </p>
            </div>
          </div>

          <div className="header-actions">
            <button className={`dt-btn ${isEditMode ? 'primary' : 'secondary'}`} style={{ marginBottom: 0, width: 'auto' }} onClick={toggleEditMode}>
              {isEditMode ? (
                <><Save size={18} /> Salvar Planta Baixa</>
              ) : (
                <><Settings2 size={18} /> Personalizar Planta</>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Helper Banner Editor */}
      {isEditMode && (
        <div className="editor-banner fade-in">
          <Move size={16} /> 
          <strong>Modo de Edição Ativo:</strong> Clique e arraste as salas para reorganizar a planta espacial. As alterações são sincronizadas ao seu banco real.
        </div>
      )}

      <div className="dt-layout">
        {/* MAPA SVG PRINCIPAL */}
        <div className="dt-map-area">
          <div className="dt-map-stage">
            <svg 
              ref={svgRef}
              viewBox="0 0 800 600" 
              className={`dt-floorplan ${isEditMode ? 'svg-editing' : ''}`} 
              preserveAspectRatio="xMidYMid meet"
              onMouseMove={handleSvgMouseMove}
              onMouseUp={handleSvgMouseUp}
              onMouseLeave={handleSvgMouseUp}
            >
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border-light)" strokeWidth="1" strokeDasharray="2 4"/>
                </pattern>
                
                {/* Editor Grid - Finer mesh for dragging */}
                <pattern id="edit-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="var(--text-muted)" opacity="0.3"/>
                </pattern>
              </defs>
              
              <rect width="100%" height="100%" fill={isEditMode ? "url(#edit-grid)" : "url(#grid)"} />
              
              {/* Contorno Geral do Prédio */}
              <rect x="50" y="50" width="700" height="500" rx="24" className="map-outline" />

              {/* Renders dinâmicos das salas arrastáveis */}
              {renderRoom('reception')}
              {renderRoom('meeting_room', true, false)}     {/* Has Warning */}
              {renderRoom('open_space')}
              {renderRoom('server_room', false, true)}      {/* Has Critical */}
              
              {/* Portas/Acessos Renderizados no topo - Fixos neste MVP, podem virar arrastáveis futuramente */}
              <g className="decorations" opacity={isEditMode ? 0.3 : 1} style={{ pointerEvents: 'none' }}>
                <rect x="260" y="150" width="40" height="12" rx="4" fill="var(--border-light)" />
                <rect x="260" y="440" width="40" height="12" rx="4" fill="var(--border-light)" />
                <rect x="500" y="255" width="40" height="20" rx="4" fill="var(--border-light)" />
              </g>
            </svg>
          </div>
        </div>

        {/* PAINEL LATERAL (GLASSMORPHISM) */}
        {activeRoom && !isEditMode && (
          <div className="dt-side-panel slide-in-right">
            <button className="dt-close-btn" onClick={closePanel}>
              <X size={20} />
            </button>
            
            <div className="panel-header">
              <div className={`panel-icon-box status-${activeRoom.status}`}>
                {activeRoom.icon}
              </div>
              <div className="panel-title-area">
                <h2>{activeRoom.name}</h2>
                {renderStatusBadge(activeRoom.status)}
              </div>
            </div>

            <p className="panel-description">{activeRoom.description}</p>

            <div className="dt-metrics-grid">
              <div className="metric-card">
                <Wrench className="metric-icon blue" size={20} />
                <div className="metric-data">
                  <span className="metric-value">{activeRoom.stats.tickets}</span>
                  <span className="metric-label">Chamados (SLA)</span>
                </div>
              </div>
              
              <div className="metric-card">
                <Box className="metric-icon purple" size={20} />
                <div className="metric-data">
                  <span className="metric-value">{activeRoom.stats.assets}</span>
                  <span className="metric-label">Ativos no Local</span>
                </div>
              </div>

              <div className="metric-card">
                <Thermometer className={`metric-icon ${activeRoom.status === 'critical' ? 'red' : 'green'}`} size={20} />
                <div className="metric-data">
                  <span className={`metric-value ${activeRoom.status === 'critical' ? 'text-red-400' : ''}`}>{activeRoom.stats.temperature}</span>
                  <span className="metric-label">Sensor IoT Temp.</span>
                </div>
              </div>
            </div>

            <div className="dt-actions">
              <h3 className="section-title">Ações Sugeridas pelo Sistema</h3>
              {activeRoom.status === 'critical' ? (
                <>
                  <button className="dt-btn danger">
                    <Flame size={16} /> Acionar Plano de Emergência SLA
                  </button>
                  <button className="dt-btn secondary">Verificar Câmeras</button>
                </>
              ) : activeRoom.status === 'warning' ? (
                <>
                  <button className="dt-btn warning">
                    <AlertTriangle size={16} /> Priorizar Chamado Pendente
                  </button>
                  <button className="dt-btn secondary">Auditar Ativos</button>
                </>
              ) : (
                <>
                   <button className="dt-btn primary">
                    <Box size={16} /> Inventário Rápido
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tooltip Hover Simples */}
      {hoveredRoom && !activeRoom && !isEditMode && !dragState && (
        <div 
          className="dt-tooltip"
          style={{ top: tooltipPos.y, left: tooltipPos.x }}
        >
          <strong>{ROOMS_DATA[hoveredRoom].name}</strong>
          <span className={`status-dot status-${ROOMS_DATA[hoveredRoom].status}`}></span>
        </div>
      )}
    </div>
  );
}
