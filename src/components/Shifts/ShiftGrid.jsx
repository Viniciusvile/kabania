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
  onNextWeek,
  onEditShift
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
                          onEdit={onEditShift}
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

      {/* ⏰ MODAL DE HORÁRIO — Padrão do sistema (modal-overlay-pixel + premium-modal-pixel) */}
      {timeModal.isOpen && (
        <div
          className="modal-overlay-pixel"
          style={{
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={() => setTimeModal({ isOpen: false, activity: null, date: null, time: '08:00' })}
        >
          <div className="premium-modal-pixel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon + Title */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border-light, #e2e8f0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
                boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
              }}>
                <Clock size={24} style={{ color: 'var(--accent-cyan, #00e5ff)' }} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-main, #0f172a)' }}>
                Agendar Escala
              </h3>
              <p style={{ fontSize: '13px', opacity: 0.7, color: 'var(--text-muted, #64748b)' }}>
                Defina o horário de início da escala
              </p>
            </div>

            {/* Activity Info */}
            <div style={{
              background: 'var(--bg-secondary, #f1f5f9)',
              border: '1px solid var(--border-light, #e2e8f0)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Zap size={14} style={{ color: 'var(--accent-cyan, #00e5ff)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                  {timeModal.activity?.title || timeModal.activity?.location || timeModal.activity?.name}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.7, color: 'var(--text-muted, #64748b)' }}>
                  {timeModal.date?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </div>
              </div>
            </div>

            {/* Time Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                opacity: 0.5, marginBottom: '8px'
              }}>
                Horário de início
              </label>
              <input
                type="time"
                className="premium-input-field"
                value={timeModal.time}
                onChange={(e) => setTimeModal(prev => ({ ...prev, time: e.target.value }))}
                autoFocus
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  fontFamily: 'inherit',
                  padding: '14px 16px',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmDrop();
                  if (e.key === 'Escape') setTimeModal({ isOpen: false, activity: null, date: null, time: '08:00' });
                }}
              />
              <p style={{ fontSize: '11px', opacity: 0.4, textAlign: 'center', marginTop: '8px' }}>
                Duração padrão: 4 horas
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="glow-btn-ghost py-3"
                style={{ flex: 1 }}
                onClick={() => setTimeModal({ isOpen: false, activity: null, date: null, time: '08:00' })}
              >
                Cancelar
              </button>
              <button
                className="glow-btn-primary py-3"
                style={{ flex: 1 }}
                onClick={handleConfirmDrop}
              >
                ⚡ Agendar
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
function EscalaCard({ shift, onAddEmployee, onUpdateStatus, onCheckin, onDelete, onEdit }) {
  const isDraft = shift.status === 'draft';
  const isPublished = shift.status === 'published';
  const isConfirmed = shift.status === 'confirmed';
  const inProgress = shift.status === 'in_progress' || shift.status === 'active';
  const isConcluded = shift.status === 'completed' || shift.status === 'concluded' || shift.status === 'closed';
  
  const startTime = new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const locationName = shift.work_environments?.name || 'Local Não Definido';
  const activityName = shift.work_activities?.name || 'Nenhuma Atividade Associada';

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    
    // Configurar os dados para o Drop
    const dragData = {
      ...shift,
      type: 'shift',
      id: shift.id,
      title: activityName,
      location: locationName
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.setData('shiftId', shift.id); // Compatibilidade legado
    
    // Ghost image customizada (Kabania V2 style)
    const ghost = document.createElement('div');
    ghost.style.cssText = [
      'position:fixed', 'top:-9999px', 'left:-9999px',
      'width:200px', 'height:44px',
      'background:rgba(15,23,42,0.98)',
      'border:1px solid rgba(0,229,255,0.6)',
      'border-radius:12px', 'padding:0 14px',
      'color:#00e5ff', 'font-size:13px', 'font-weight:800',
      'display:flex', 'align-items:center', 'gap:8px',
      'box-shadow:0 8px 32px rgba(0,0,0,0.4)',
      'z-index:9999'
    ].join(';');
    ghost.innerHTML = `<span style="opacity:0.7">⏰</span> ${startTime} – ${endTime}`;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 100, 22);
    setTimeout(() => { if (ghost.parentNode) document.body.removeChild(ghost); }, 0);
  };

  const stopChildDrag = (e) => e.stopPropagation();

  // Mapeamento de label e estilo de status
  const getStatusLabel = () => {
    if (inProgress) return 'EM ANDAMENTO';
    if (isConcluded) return 'CONCLUÍDO';
    if (isConfirmed) return 'CONFIRMADO';
    if (isPublished) return 'PUBLICADO';
    if (isDraft) return 'RASCUNHO';
    return shift.status?.toUpperCase() || 'AGENDADO';
  };

  return (
    <div 
      className={`kabania-v2-card status-${shift.status || 'draft'}`}
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
          <button 
            className="kabania-v2-action-sq" 
            title="Editar"
            onClick={() => onEdit && onEdit(shift)}
          >
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
        
        <div className={`kabania-v2-status-badge status-${shift.status || 'draft'}`}>
          {getStatusLabel()}
        </div>
      </div>

      {/* 👥 ASSIGNED EMPLOYEES - KABANIA V2 */}
      {shift.assigned_employees && shift.assigned_employees.length > 0 && (
        <div className="kabania-v2-employees-row">
          <div className="flex -space-x-2 overflow-hidden">
            {shift.assigned_employees.map((emp, idx) => (
              <div 
                key={emp.assignment_id || idx} 
                className="emp-avatar-small ring-2 ring-slate-900"
                title={emp.name}
                style={{ width: '28px', height: '28px' }}
              >
                {emp.avatar_url ? (
                  <img src={emp.avatar_url} alt={emp.name} />
                ) : (
                  <span>{emp.name?.[0] || '?'}</span>
                )}
              </div>
            ))}
          </div>
          <span className="text-[10px] font-bold opacity-70 truncate max-w-[120px]">
            {shift.assigned_employees.length === 1 
              ? shift.assigned_employees[0].name 
              : `${shift.assigned_employees[0].name} +${shift.assigned_employees.length - 1}`}
          </span>
        </div>
      )}

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
