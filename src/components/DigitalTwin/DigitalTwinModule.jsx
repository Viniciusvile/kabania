import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Trash2, Edit3, Square, Users, RefreshCw, ZoomIn, ZoomOut, Monitor, BoxSelect
} from 'lucide-react';
import './DigitalTwinModule.css';

const DEFAULT_ROOMS = [
  { id: 'room-1', name: 'Open Space Principal', x: 10, y: 15, w: 50, h: 60 },
  { id: 'room-2', name: 'Estúdio Design', x: 65, y: 15, w: 25, h: 35 }
];

const DEFAULT_DESKS = [
  { id: 'desk-1', x: 20, y: 30, status: 'occupied', user: { name: 'João S.', role: 'Eng', avatar: 'J', isOnline: true } },
  { id: 'desk-2', x: 30, y: 30, status: 'free', user: null },
  { id: 'desk-3', x: 20, y: 45, status: 'occupied', user: { name: 'Maria C.', role: 'PM', avatar: 'M', isOnline: false } },
  { id: 'desk-4', x: 75, y: 30, status: 'occupied', user: { name: 'Lucas', role: 'UI', avatar: 'L', isOnline: true } },
];

export default function DigitalTwinModule({ currentCompany }) {
  const [rooms, setRooms] = useState(DEFAULT_ROOMS);
  const [desks, setDesks] = useState(DEFAULT_DESKS);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [scale, setScale] = useState(1);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [mapDragStart, setMapDragStart] = useState({ x: 0, y: 0 });
  
  const [activeTool, setActiveTool] = useState('none'); // 'none', 'add_desk', 'add_room', 'remove', 'assign'
  
  // Dragging Objects
  const [draggedObject, setDraggedObject] = useState(null);

  // Modal Control
  const [modalConfig, setModalConfig] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    type: 'input', // 'input' | 'confirm'
    value: '', 
    onConfirm: () => {},
    isDanger: false
  });

  const mapViewportRef = useRef(null);
  const mapCanvasRef = useRef(null);

  // Statistics
  const freeDesks = desks.filter(d => d.status === 'free').length;
  const occupiedDesks = desks.filter(d => d.status === 'occupied').length;

  const handleWheel = (e) => {
    e.preventDefault();
    setScale(prev => Math.min(Math.max(0.4, prev - e.deltaY * 0.001), 2.5));
  };

  useEffect(() => {
    const mapEl = mapViewportRef.current;
    if (mapEl) mapEl.addEventListener('wheel', handleWheel, { passive: false });
    // Add global mouse listeners to ensure drag works even when cursor leaves the viewport
    const handleGlobalMouseMove = (e) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      if (mapEl) mapEl.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // -- INTERAÇÕES DO GRID PRINCIPAL --
  const handleMapMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.builder-room') || e.target.closest('.desk-node')) return;
    
    setIsDraggingMap(true);
    setMapDragStart({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
  };

  const handleMouseMove = (e) => {
    if (isDraggingMap) {
      setDragOffset({ x: e.clientX - mapDragStart.x, y: e.clientY - mapDragStart.y });
    }
    
    if (draggedObject && mapCanvasRef.current) {
      const rect = mapCanvasRef.current.getBoundingClientRect();
let newX = ((e.clientX - rect.left - draggedObject.offsetX) / (rect.width * scale)) * 100;
let newY = ((e.clientY - rect.top - draggedObject.offsetY) / (rect.height * scale)) * 100;
      
      if (draggedObject.type === 'room') {
         setRooms(prev => prev.map(r => r.id === draggedObject.id ? { ...r, x: newX, y: newY } : r));
      } else if (draggedObject.type === 'desk') {
         setDesks(prev => prev.map(d => d.id === draggedObject.id ? { ...d, x: newX, y: newY } : d));
      }
    }
  };

  const handleMouseUp = () => {
    setIsDraggingMap(false);
    setDraggedObject(null);
  };

  const handleMapCanvasClick = (e) => {
    if (isDraggingMap || draggedObject) return;
    
const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left - dragOffset.x) / (rect.width * scale)) * 100;
      const y = ((e.clientY - rect.top - dragOffset.y) / (rect.height * scale)) * 100;

    if (activeTool === 'add_desk') {
      const newDesk = { id: `desk-${Date.now()}`, x, y, status: 'free', user: null };
      setDesks(prev => [...prev, newDesk]);
      setActiveTool('none');
    } 
    else if (activeTool === 'add_room') {
      setModalConfig({
        isOpen: true,
        title: 'Nova Sala',
        message: 'Digite o nome para o novo ambiente:',
        type: 'input',
        value: 'Nova Sala',
        onConfirm: (name) => {
          const newRoom = { id: `room-${Date.now()}`, name, x, y, w: 30, h: 40 };
          setRooms(prev => [...prev, newRoom]);
          setActiveTool('none');
        }
      });
    }
  };

  // -- INTERAÇÕES DOS OBJETOS --
  const startDragObject = (e, id, type) => {
    if (activeTool !== 'none' || e.button !== 0) return;
    e.stopPropagation();
    const objRect = e.currentTarget.getBoundingClientRect();
    setDraggedObject({
      id,
      type,
      offsetX: e.clientX - objRect.left,
      offsetY: e.clientY - objRect.top
    });
  };

  const handleDeskClick = (e, desk) => {
    e.stopPropagation();
    
    if (activeTool === 'remove') {
      setDesks(prev => prev.filter(d => d.id !== desk.id));
    } 
    else if (activeTool === 'assign') {
      if (desk.status === 'occupied') {
        setModalConfig({
          isOpen: true,
          title: 'Desocupar Mesa',
          message: `Deseja realmente desocupar a mesa de ${desk.user.name}?`,
          type: 'confirm',
          isDanger: true,
          onConfirm: () => {
            setDesks(prev => prev.map(d => d.id === desk.id ? { ...d, status: 'free', user: null } : d));
          }
        });
      } else {
        setModalConfig({
          isOpen: true,
          title: 'Alocar Colaborador',
          message: 'Digite o nome do funcionário para esta mesa:',
          type: 'input',
          value: '',
          onConfirm: (name) => {
            if (name && name.trim()) {
              setDesks(prev => prev.map(d => d.id === desk.id ? { 
                ...d, status: 'occupied', 
                user: { name: name.trim(), role: 'Colaborador', avatar: name.trim().charAt(0).toUpperCase(), isOnline: true } 
              } : d));
            }
          }
        });
      }
    }
  };

  const handleRoomClick = (e, room) => {
    e.stopPropagation();
    if (activeTool === 'remove') {
      setModalConfig({
        isOpen: true,
        title: 'Remover Sala',
        message: `Deseja apagar permanentemente a sala '${room.name}'?`,
        type: 'confirm',
        isDanger: true,
        onConfirm: () => {
          setRooms(prev => prev.filter(r => r.id !== room.id));
        }
      });
    }
  };

  return (
    <div className="canvas-builder-container">
      
      {/* CANVAS PRINCIPAL NO FUNDO */}
      <div className="map-viewport" 
        ref={mapViewportRef}
        onMouseDown={handleMapMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className={`vector-canvas tool-${activeTool}`}
          style={{
            transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${scale})`,
            cursor: isDraggingMap ? 'grabbing' : (activeTool !== 'none' ? 'crosshair' : 'default')
          }}
        >
          <div className="dot-grid-bg" ref={mapCanvasRef} onClick={handleMapCanvasClick}>
             
            {/* CARDS DE SALAS */}
            {rooms.map(room => (
              <div 
                key={room.id}
                className="builder-room"
                style={{ top: `${room.y}%`, left: `${room.x}%`, width: `${room.w}%`, height: `${room.h}%` }}
                onMouseDown={(e) => startDragObject(e, room.id, 'room')}
                onClick={(e) => handleRoomClick(e, room)}
              >
                <div className="room-title">
                   <Edit3 size={14} className="drag-handle-icon" />
                   {room.name}
                </div>
                <div className="room-body"></div>
              </div>
            ))}

            {/* NODES DE MESAS */}
            {desks.map(desk => {
              const isMatch = searchTerm && desk.user && desk.user.name.toLowerCase().includes(searchTerm.toLowerCase());
              const highlightClass = isMatch ? 'node-highlight' : '';
              
              return (
                <div 
                  key={desk.id} 
                  className={`desk-node ${desk.status} ${highlightClass}`}
                  style={{ top: `${desk.y}%`, left: `${desk.x}%` }}
                  onMouseDown={(e) => startDragObject(e, desk.id, 'desk')}
                  onClick={(e) => handleDeskClick(e, desk)}
                >
                  <div className="desk-icon-base">
                    <Monitor size={18} strokeWidth={1.5} />
                  </div>
                  
                  {desk.status === 'occupied' && desk.user && (
                    <div className="desk-avatar-badge">
                      {desk.user.avatar}
                      <span className={`status-dot ${desk.user.isOnline ? 'online' : 'offline'}`}></span>
                    </div>
                  )}

                  {/* Tooltip de Info */}
                  <div className="desk-info-bubble">
                     {desk.status === 'occupied' ? (
                       <>
                          <strong>{desk.user.name}</strong>
                          <span className="role">{desk.user.role}</span>
                       </>
                     ) : (
                       <span className="free">Mesa Disponível</span>
                     )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FLOATING UI OVERLAYS */}
      <div className="floating-ui-layer">
        
        {/* HEADER TOOLBAR FLUTUANTE */}
        <div className="canvas-header-glass">
          <div className="header-left">
            <h1>Workspace Builder</h1>
          </div>
          <div className="header-actions">
            <div className="search-bar">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Buscar colaborador..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="tb-divider"></div>

            <button 
              className={`tb-btn ${activeTool === 'add_room' ? 'active' : ''}`}
              onClick={() => setActiveTool(activeTool === 'add_room' ? 'none' : 'add_room')}
              title="Desenhar Sala"
            ><BoxSelect size={16} /> Sala</button>

            <button 
              className={`tb-btn ${activeTool === 'add_desk' ? 'active' : ''}`}
              onClick={() => setActiveTool(activeTool === 'add_desk' ? 'none' : 'add_desk')}
              title="Inserir Estação"
            ><Monitor size={16} /> Mesa</button>
            
            <button 
              className={`tb-btn ${activeTool === 'assign' ? 'active' : ''}`}
              onClick={() => setActiveTool(activeTool === 'assign' ? 'none' : 'assign')}
              title="Alocar Colaborador"
            ><Users size={16} /> Pessoa</button>

            <div className="tb-divider"></div>

            <button 
              className={`tb-btn danger-hover ${activeTool === 'remove' ? 'active-danger' : ''}`}
              onClick={() => setActiveTool(activeTool === 'remove' ? 'none' : 'remove')}
              title="Remover Elemento"
            ><Trash2 size={16} /></button>

          </div>
        </div>

        {/* FLOATING STATS CHIPS */}
        <div className="canvas-stats-chips">
          <div className="stat-chip">
            <div className="chip-icon free"></div>
            <span className="chip-value">{freeDesks} Livres</span>
          </div>
          <div className="stat-chip">
            <div className="chip-icon occupied"></div>
            <span className="chip-value">{occupiedDesks} Ocupadas</span>
          </div>
          <div className="stat-chip outline">
            <span className="chip-label">Salas:</span>
            <span className="chip-value">{rooms.length}</span>
          </div>
        </div>

        {/* FLOATING CONTROLS (BOTTOM RIGHT) */}
        <div className="viewport-controls-floating">
          <button onClick={() => { setScale(1); setDragOffset({x:0, y:0}); }} title="Centralizar Mapa"><RefreshCw size={18}/></button>
          <div className="tb-divider-h"></div>
          <button onClick={() => setScale(s => Math.min(s + 0.2, 2.5))}><ZoomIn size={18}/></button>
          <span className="zoom-text">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.max(s - 0.2, 0.4))}><ZoomOut size={18}/></button>
        </div>
      </div>

      {/* PREMIUM MODAL OVERLAY */}
      {modalConfig.isOpen && (
        <div className="dt-modal-overlay" onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}>
          <div className="dt-modal-glass" onClick={e => e.stopPropagation()}>
            <h3>{modalConfig.title}</h3>
            <div className="dt-modal-content">
              <p>{modalConfig.message}</p>
              {modalConfig.type === 'input' && (
                <input 
                  type="text" 
                  className="dt-modal-input" 
                  autoFocus
                  value={modalConfig.value}
                  onChange={e => setModalConfig({ ...modalConfig, value: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      modalConfig.onConfirm(modalConfig.value);
                      setModalConfig({ ...modalConfig, isOpen: false });
                    }
                  }}
                />
              )}
            </div>
            <div className="dt-modal-actions">
              <button 
                className="dt-btn dt-btn-secondary" 
                onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
              >
                Cancelar
              </button>
              <button 
                className={`dt-btn ${modalConfig.isDanger ? 'dt-btn-danger' : 'dt-btn-primary'}`}
                onClick={() => {
                  modalConfig.onConfirm(modalConfig.value);
                  setModalConfig({ ...modalConfig, isOpen: false });
                }}
              >
                {modalConfig.type === 'confirm' ? 'Confirmar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
