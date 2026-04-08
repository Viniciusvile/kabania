import React, { useState } from 'react';
import { Briefcase, Clock, MapPin, CheckCircle, Plus, Trash2, ChevronLeft, ChevronRight, Zap, Edit2, GripVertical } from 'lucide-react';
import { updateShiftStatus } from '../../services/shiftService';
import './ShiftsPremium.css';

export default function ShiftGrid({ 
  shifts, 
  weekDays, 
  onAddEmployee, 
  onDropActivity, 
  onMoveShift, 
  onRefresh, 
  updateShiftLocally, 
  setIsSyncing,
  onCheckin,
  onDeleteShift,
  onPrevWeek,
  onNextWeek
}) {
  // Modal de horário substituindo window.prompt (bloqueado em dev mode)
  const [timeModal, setTimeModal] = useState({ 
    isOpen: false, 
    activity: null, 
    date: null, 
    time: '08:00' 
  });

  // 🖱️ Horizontal Drag Logic
  const [dragStart, setDragStart] = useState(null);
  const [offsetX, setOffsetX] = useState(0);

  const handleMouseDown = (e) => {
    // Se o clique for em um card ou botão, não inicia o arraste do grid
    if (e.target.closest('.premium-shift-card') || e.target.closest('.kabania-v2-card') || e.target.closest('button')) return;
    setDragStart(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (dragStart === null) return;
    const diff = e.clientX - dragStart;
    setOffsetX(diff);
  };

  const handleMouseUp = () => {
    if (dragStart === null) return;
    const threshold = 120; // Sensibilidade do arraste
    if (offsetX > threshold) onPrevWeek();
    else if (offsetX < -threshold) onNextWeek();
    
    setDragStart(null);
    setOffsetX(0);
  };

  const handleUpdateStatus = async (shiftId, status) => {
    try {
      if (setIsSyncing) setIsSyncing(true);
      if (updateShiftLocally) {
        updateShiftLocally(shiftId, { status });
      }
      await updateShiftStatus(shiftId, status);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Erro ao atualizar status: " + err.message);
      if (onRefresh) onRefresh();
    } finally {
      if (setIsSyncing) setIsSyncing(false);
    }
  };

  const handleConfirmDrop = () => {
    if (timeModal.activity && timeModal.date && timeModal.time) {
      onDropActivity(timeModal.activity, timeModal.date, timeModal.time);
    }
    setTimeModal({ isOpen: false, activity: null, date: null, time: '08:00' });
  };

  return (
    <>
    <div 
      className="grid-drag-container" 
      style={{ 
        position: 'relative', 
        width: '100%', 
        cursor: dragStart ? 'grabbing' : 'grab',
        overflow: 'hidden'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        className="grid-drag-content"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: dragStart ? 'none' : 'transform 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
          display: 'flex',
          flexDirection: 'column',
          width: '100%'
        }}
      >
        <div className="weekly-grid-pixel timeline-mode" style={{ minHeight: 'auto', gap: '16px', padding: '16px' }}>
          <div className="days-container-pixel" style={{ gap: '16px', padding: 0 }}>
            {weekDays.map(day => {
              const dayShifts = shifts.filter(s => {
                const d = new Date(s.start_time);
                return d.getDate() === day.date.getDate() && d.getMonth() === day.date.getMonth();
              });

              dayShifts.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

              return (
                <div 
                  key={day.date.toISOString()} 
                  className="grid-column-pixel premium-kanban-column"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    e.currentTarget.classList.add('drag-over-column');
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      e.currentTarget.classList.remove('drag-over-column');
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('drag-over-column');

                    let activityData = e.dataTransfer.getData('application/json');
                    if (!activityData) activityData = e.dataTransfer.getData('activity');
                    const shiftId = e.dataTransfer.getData('shiftId');

                    if (activityData && activityData !== 'null') {
                      try {
                        const activity = JSON.parse(activityData);
                        setTimeModal({ isOpen: true, activity, date: day.date, time: '08:00' });
                      } catch (err) {
                        console.error('[ShiftGrid] Error parsing drag data:', err);
                      }
                    } else if (shiftId) {
                      onMoveShift(shiftId, day.date, null);
                    }
                  }}
                >
                  <header className="day-header-pixel premium-kanban-header">
                    <span className="day-number premium-day-num">{day.dayNum}</span>
                    <span className="day-name">{day.label}</span>
                    <div className="day-shift-count">
                      {dayShifts.length}
                    </div>
                  </header>

                  <div className="day-schedule-stack" style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                    {dayShifts.length === 0 ? (
                      <div className="empty-day-pixel" style={{ border: '2px dashed rgba(255,255,255,0.05)', borderRadius: '12px', opacity: 0.5 }}>
                        LIVRE
                      </div>
                    ) : (
                      dayShifts.map(shift => (
                        <EscalaCard 
                          key={shift.id} 
                          shift={shift} 
                          onAddEmployee={() => onAddEmployee(shift.id)} 
                          onUpdateStatus={(status) => handleUpdateStatus(shift.id, status)}
                          onCheckin={() => onCheckin(shift)}
                          onDelete={() => onDeleteShift && onDeleteShift(shift.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .grid-drag-container {
          overflow-x: hidden;
          background: rgba(255, 255, 255, 0.01);
          border-radius: 24px;
          margin: 0 -10px;
          padding: 0 10px;
        }
        .grid-drag-content {
          will-change: transform;
        }
        .drag-over-column {
          background: rgba(0, 229, 255, 0.06) !important;
          border: 2px dashed var(--accent-cyan, #00e5ff) !important;
          box-shadow: inset 0 0 20px rgba(0,229,255,0.05);
        }
        .drag-over-column .empty-day-pixel {
          border-color: var(--accent-cyan, #00e5ff) !important;
          opacity: 1 !important;
          color: var(--accent-cyan, #00e5ff) !important;
        }
        /* Garante que cards de escala nunca selecionem texto */
        .escala-card-pixel, .premium-shift-card {
          user-select: none !important;
          -webkit-user-select: none !important;
        }
        .premium-shift-card:active {
          cursor: grabbing !important;
        }
      `}</style>
    </div>

      {/* ⏰ MINI-MODAL DE HORÁRIO (substitui window.prompt bloqueado em dev mode) */}
      {timeModal.isOpen && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div style={{
            background: 'var(--bg-card, #1a1f2e)',
            border: '1px solid rgba(0,229,255,0.2)',
            borderRadius: '20px',
            padding: '2rem',
            width: '100%',
            maxWidth: '340px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,229,255,0.05)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 0.75rem'
              }}>
                <Clock size={22} style={{ color: 'var(--accent-cyan, #00e5ff)' }} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '4px' }}>
                Agendar Escala
              </h3>
              <p style={{ fontSize: '12px', opacity: 0.55 }}>
                {timeModal.activity?.title || timeModal.activity?.location || timeModal.activity?.name}
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '1rem',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255,255,255,0.6)'
            }}>
              <MapPin size={13} style={{ color: 'var(--accent-cyan, #00e5ff)', flexShrink: 0 }} />
              {timeModal.date?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', fontSize: '10px', fontWeight: 800, 
                textTransform: 'uppercase', letterSpacing: '0.08em',
                opacity: 0.5, marginBottom: '6px'
              }}>
                Horário de início
              </label>
              <input
                type="time"
                value={timeModal.time}
                onChange={(e) => setTimeModal(prev => ({ ...prev, time: e.target.value }))}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(0,229,255,0.05)',
                  border: '1px solid rgba(0,229,255,0.3)',
                  borderRadius: '10px',
                  color: 'var(--accent-cyan, #00e5ff)',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmDrop();
                  if (e.key === 'Escape') setTimeModal({ isOpen: false, activity: null, date: null, time: '08:00' });
                }}
              />
              <p style={{ fontSize: '10px', opacity: 0.4, textAlign: 'center', marginTop: '6px' }}>
                A escala terá duração padrão de 4 horas
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setTimeModal({ isOpen: false, activity: null, date: null, time: '08:00' })}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDrop}
                style={{
                  flex: 2, padding: '10px', borderRadius: '10px',
                  background: 'var(--accent-cyan, #00e5ff)', border: 'none',
                  color: '#000', fontSize: '13px', fontWeight: 800,
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 4px 15px rgba(0,229,255,0.3)'
                }}
              >
                ⚡ Agendar Escala
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Grip Icon SVG ─────────────────────────────────────────────────────────
function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="none" style={{ opacity: 0.3, flexShrink: 0 }}>
      <circle cx="2" cy="2" r="1.5" fill="currentColor"/>
      <circle cx="8" cy="2" r="1.5" fill="currentColor"/>
      <circle cx="2" cy="7" r="1.5" fill="currentColor"/>
      <circle cx="8" cy="7" r="1.5" fill="currentColor"/>
      <circle cx="2" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="8" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  );
}

// ── EscalaCard ────────────────────────────────────────────────────────────
function EscalaCard({ shift, onAddEmployee, onUpdateStatus, onCheckin, onDelete }) {
  const isProblem = shift.status === 'open' || (shift.open_calls_count > 0);
  const isConcluded = shift.status === 'completed' || shift.status === 'concluded';
  const inProgress = shift.status === 'in_progress' || shift.status === 'active';
  
  const startTime = new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const locationName = shift.work_environments?.name || 'Local Não Definido';
  const activityName = shift.work_activities?.name || 'Nenhuma Atividade Associada';

  const handleDragStart = (e) => {
    e.dataTransfer.setData('shiftId', shift.id);
    e.dataTransfer.effectAllowed = 'move';
    const ghost = document.createElement('div');
    ghost.style.cssText = [
      'position:fixed', 'top:-9999px', 'left:-9999px',
      'width:200px', 'height:44px',
      'background:rgba(15,20,40,0.95)',
      'border:1px solid rgba(0,229,255,0.5)',
      'border-radius:12px', 'padding:0 14px',
      'color:#00e5ff', 'font-size:13px', 'font-weight:800',
      'display:flex', 'align-items:center', 'gap:8px',
    ].join(';');
    ghost.innerHTML = `<span style="opacity:0.5">⏰</span> ${startTime} – ${endTime}`;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 100, 22);
    setTimeout(() => { if (ghost.parentNode) document.body.removeChild(ghost); }, 0);
  };

  const stopChildDrag = (e) => e.stopPropagation();

  return (
    <div 
      className="kabania-v2-card"
      draggable
      onDragStart={handleDragStart}
    >
      {/* ⏰ HEADER - KABANIA V2 */}
      <div className="kabania-v2-header">
        <div className="kabania-v2-header-left">
          <GripVertical className="kabania-v2-grip" size={16} />
          <div className="kabania-v2-time-pill">
            <Clock size={12} className="opacity-50" />
            <span>{startTime} - {endTime}</span>
          </div>
        </div>

        <div className="kabania-v2-header-right">
          <button className="kabania-v2-action-sq" title="Editar">
            <Edit2 size={14} />
          </button>
          <button 
            className="kabania-v2-action-sq" 
            title="Excluir"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            onDragStart={stopChildDrag}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* 📍 LOCAL BLOCK - KABANIA V2 */}
      <div className="kabania-v2-local-row">
        <div className="kabania-v2-icon-box">
          <MapPin size={20} />
        </div>
        <div className="kabania-v2-local-info">
          <span className="kabania-v2-label-loc">LOCAL</span>
          <span className="kabania-v2-loc-name">{locationName}</span>
        </div>
      </div>

      {/* 📋 ACTIVITY & STATUS - KABANIA V2 */}
      <div className="kabania-v2-act-row">
        <div className="kabania-v2-act-pill">
          <Briefcase size={12} className="opacity-50" />
          <span>{activityName}</span>
        </div>
        
        <div className="kabania-v2-status-badge">
          {isProblem ? 'ALERTA' : inProgress ? 'EM ANDAMENTO' : isConcluded ? 'CONCLUÍDO' : 'AGENDADO'}
        </div>
      </div>

      <div className="kabania-v2-divider" />

      {/* 👥 FOOTER BUTTONS - KABANIA V2 */}
      <div className="kabania-v2-footer">
        <button 
          className="kabania-v2-dashed-btn"
          onClick={(e) => { e.stopPropagation(); onAddEmployee(); }}
          onDragStart={stopChildDrag}
        >
          <Plus size={16} />
          <span>Atribuir</span>
        </button>

        <button 
          className="kabania-v2-gradient-btn"
          disabled={isConcluded}
          onClick={(e) => { e.stopPropagation(); onCheckin(); }}
          onDragStart={stopChildDrag}
        >
          <MapPin size={18} />
          <span>
            <b>Bater</b>
            <b>Ponto</b>
          </span>
        </button>
      </div>
    </div>
  );
}
