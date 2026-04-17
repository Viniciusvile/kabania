import React, { useState } from 'react';
import { Briefcase, Clock, MapPin, CheckCircle, Plus, Trash2, ChevronLeft, ChevronRight, Zap, Edit2, GripVertical, Calendar, Timer } from 'lucide-react';
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

  const [inspectedShift, setInspectedShift] = useState(null);

  // 🖱️ Horizontal Drag Logic (Native Scroll)
  const scrollRef = React.useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e) => {
    if (e.target.closest('.premium-shift-card') || e.target.closest('.kabania-v2-card') || e.target.closest('button')) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const scrollSpeed = 1.6; // Suavidade equilibrada
    const walk = (x - startX) * scrollSpeed;
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
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
      className={`grid-drag-container custom-scrollbar ${isDragging ? 'is-dragging' : ''}`} 
      ref={scrollRef}
      style={{ 
        position: 'relative', 
        width: '100%', 
        cursor: isDragging ? 'grabbing' : 'grab',
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: '16px', // Protege elementos com sombra de serem cortados
        userSelect: isDragging ? 'none' : 'auto' // Bloqueia seleção de texto
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
    >
      <div 
        className="grid-drag-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 'fit-content',
          minWidth: '100%',
          pointerEvents: isDragging ? 'none' : 'auto' // ⚡ TRUQUE MÁGICO: Evita lag impedindo interação com filhos no drag
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
                    const shiftId = e.dataTransfer.getData('shiftId') || e.dataTransfer.getData('shiftid');

                    // 🚀 PRIORIDADE: Se for um Shift ID (movimentação no grid), move direto
                    if (shiftId) {
                      onMoveShift(shiftId, day.date, null);
                      return;
                    }

                    // Se for dados de atividade (sidebar -> grid)
                    if (activityData && activityData !== 'null') {
                      try {
                        const data = JSON.parse(activityData);
                        
                        // Verificação dupla: se for um shift mas sem shiftId explícito no dataTransfer
                        if (data.type === 'shift') {
                          onMoveShift(data.id, day.date, null);
                        } else {
                          // Agendamento de NOVA atividade
                          setTimeModal({ isOpen: true, activity: data, date: day.date, time: '08:00' });
                        }
                      } catch (err) {
                        console.error('[ShiftGrid] Error parsing drag data:', err);
                      }
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
                          onInspect={() => setInspectedShift(shift)}
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
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={() => setTimeModal({ isOpen: false, activity: null, date: null, time: '08:00' })}
        >
          <div className="premium-modal-pixel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon + Title */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.1), rgba(168, 85, 247, 0.1))',
                border: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem',
                boxShadow: '0 8px 32px rgba(0, 229, 255, 0.15)'
              }}>
                <Clock size={28} style={{ color: 'var(--accent-cyan, #00e5ff)' }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Agendar Escala
              </h3>
              <p style={{ fontSize: '13px', opacity: 0.8, color: 'var(--text-muted)' }}>
                Defina o horário de início da escala
              </p>
            </div>

            {/* Activity Info */}
            <div style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ 
                 background: 'rgba(0, 229, 255, 0.1)', 
                 padding: '10px', 
                 borderRadius: '12px',
                 display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                 <Zap size={16} style={{ color: 'var(--accent-cyan)' }} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  {(timeModal.activity?.title || timeModal.activity?.location || timeModal.activity?.name || 'Local Não Definido').replace(/^(TITULO|TITLE):\s*/i, '')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={12} /> {timeModal.date?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </div>
              </div>
            </div>

            {/* Time Input */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: 'var(--accent-cyan)', opacity: 0.9, marginBottom: '10px'
              }}>
                Horário de Início
              </label>
              <input
                type="time"
                className="premium-input-field"
                value={timeModal.time}
                onChange={(e) => setTimeModal(prev => ({ ...prev, time: e.target.value }))}
                autoFocus
                style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  textAlign: 'center',
                  fontFamily: 'inherit',
                  padding: '16px',
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-main)',
                  borderRadius: '16px',
                  boxShadow: 'var(--shadow-sm)',
                  outline: 'none'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmDrop();
                  if (e.key === 'Escape') setTimeModal({ isOpen: false, activity: null, date: null, time: '08:00' });
                }}
              />
              <p style={{ 
                fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', 
                marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' 
              }}>
                <Timer size={12}/> Duração padrão: 4 horas
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="glow-btn-ghost py-3.5"
                style={{ flex: 1, borderRadius: '14px', fontSize: '13px', fontWeight: 700 }}
                onClick={() => setTimeModal({ isOpen: false, activity: null, date: null, time: '08:00' })}
              >
                Cancelar
              </button>
              <button
                className="glow-btn-primary py-3.5"
                style={{ flex: 1, borderRadius: '14px', fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={handleConfirmDrop}
              >
                <Zap size={14} /> Agendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 DETALHES DA ESCALA (DOUBLE CLICK) */}
      {inspectedShift && (
        <div
          className="modal-overlay-pixel"
          style={{
            zIndex: 10000,
            background: 'transparent',
            // blur removido a pedido do usuario
          }}
          onClick={() => setInspectedShift(null)}
        >
          <div 
            className="premium-modal-pixel animate-slide-up" 
            style={{ width: '100%', maxWidth: '440px', padding: '0', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with visual priority */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.05), rgba(168, 85, 247, 0.05))',
              borderBottom: '1px solid var(--border-light)',
              padding: '2rem 1.5rem 1.5rem',
              position: 'relative',
              textAlign: 'center'
            }}>
              <div style={{
                position: 'absolute', top: '20px', right: '20px', cursor: 'pointer',
                opacity: 0.6, transition: 'opacity 0.2s', padding: '4px'
              }} onClick={() => setInspectedShift(null)}>
                <span style={{ fontSize: '24px', fontWeight: 'bold', lineHeight: '10px' }}>×</span> 
              </div>

              <div style={{ 
                margin: '0 auto 12px',
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'rgba(0, 229, 255, 0.1)', border: '1px solid rgba(0, 229, 255, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent-cyan)'
              }}>
                <Briefcase size={24} />
              </div>

              <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginBottom: '6px' }}>
                 Escala #{inspectedShift.id?.substring(0, 8)}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', lineHeight: 1.3 }}>
                {inspectedShift.work_activities?.name?.replace(/^(DESCRICAO|DESCRIPTION|TITULO|TITLE):\s*/i, '') || 'Nenhuma Atividade Associada'}
              </h3>
            </div>

            {/* Content Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Data e Hora */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-app)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <Clock size={18} style={{ color: 'var(--accent-purple, #a855f7)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                   <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Horário</span>
                   <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                     {new Date(inspectedShift.start_time).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()} • {' '}
                     {new Date(inspectedShift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(inspectedShift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </span>
                </div>
              </div>

              {/* Local */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-app)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <MapPin size={18} style={{ color: 'var(--accent-cyan, #00e5ff)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                   <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Local do Serviço</span>
                   <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                     {inspectedShift.work_environments?.name?.replace(/^(TITULO|TITLE):\s*/i, '') || 'Local Não Definido'}
                   </span>
                </div>
              </div>

              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px 0' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status da Escala</span>
                <span className={`kabania-v2-status-badge status-${inspectedShift.status || 'draft'}`}>
                   {inspectedShift.status?.toUpperCase() || 'AGENDADO'}
                </span>
              </div>

              {/* Equipe */}
              {inspectedShift.assigned_employees && inspectedShift.assigned_employees.length > 0 && (
                <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-light)' }}>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', paddingLeft: '4px' }}>Membros da Equipe ({inspectedShift.assigned_employees.length})</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-app)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                    {inspectedShift.assigned_employees.map(emp => (
                      <div key={emp.employee_id || emp.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                          {emp.avatar_url ? <img src={emp.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'bold',fontSize:'12px',color:'var(--text-main)'}}>{emp.name?.[0]}</div>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                           <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{emp.name}</span>
                           {emp.role && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{emp.role}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer with actions */}
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-app)', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '12px' }}>
              <button 
                className="glow-btn-ghost" 
                style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 700 }}
                onClick={() => setInspectedShift(null)}
              >
                Fechar
              </button>
              <button 
                className="glow-btn-primary" 
                style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                onClick={() => {
                  const shiftToEdit = inspectedShift;
                  setInspectedShift(null);
                  if (onEditShift) onEditShift(shiftToEdit);
                }}
              >
                <Edit2 size={14} /> Editar Escala
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
function EscalaCard({ shift, onAddEmployee, onUpdateStatus, onCheckin, onDelete, onEdit, onInspect }) {
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
    e.dataTransfer.setData('shiftId', shift.id);
    e.dataTransfer.setData('shiftid', shift.id); // For browser-specific lowercase normalization
    e.dataTransfer.setData('text/plain', shift.id); // Final fallback
    
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
      onDoubleClick={(e) => { e.stopPropagation(); if (onInspect) onInspect(); }}
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
        <div className="kabania-v2-local-info" style={{ minWidth: 0, overflow: 'hidden' }}>
          <span className="kabania-v2-label-loc">LOCAL</span>
          <span className="kabania-v2-loc-name" style={{
            display: '-webkit-box', 
            WebkitLineClamp: 2, 
            WebkitBoxOrient: 'vertical', 
            overflow: 'hidden',
            wordBreak: 'break-word'
          }}>{locationName.replace(/^(TITULO|TITLE):\s*/i, '')}</span>
        </div>
      </div>

      {/* 📋 ACTIVITY & STATUS - KABANIA V2 */}
      <div className="kabania-v2-act-row" style={{ alignItems: 'flex-start' }}>
        <div className="kabania-v2-act-pill" style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          maxWidth: '100%', 
          overflow: 'hidden',
          padding: '4px 10px'
        }}>
          <Briefcase size={12} className="opacity-50 mt-[2px] flex-shrink-0" />
          <span style={{ 
            display: '-webkit-box', 
            WebkitLineClamp: 2, 
            WebkitBoxOrient: 'vertical', 
            overflow: 'hidden',
            wordBreak: 'break-word',
            fontSize: '10px',
            lineHeight: 1.4,
            marginLeft: '6px',
            whiteSpace: 'normal'
          }}>{activityName.replace(/^(DESCRICAO|DESCRIPTION|TITULO|TITLE):\s*/i, '')}</span>
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
