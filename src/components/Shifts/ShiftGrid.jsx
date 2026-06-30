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
  onTimeEdit,
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
  const [duration, setDuration] = useState(4);

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
      onDropActivity(timeModal.activity, timeModal.date, timeModal.time, null, duration);
    }
    setTimeModal({ isOpen: false, activity: null, date: null, time: '08:00' });
  };

  const getEndTimeStr = (startTimeStr, durationHours) => {
    if (!startTimeStr) return '';
    try {
      const [h, m] = startTimeStr.split(':').map(Number);
      const endHour = (h + Number(durationHours)) % 24;
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(endHour)}:${pad(m)}`;
    } catch (e) {
      return '';
    }
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
                          setDuration(4);
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
                          onTimeEdit={onTimeEdit}
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
          background: rgba(255, 255, 255, 0.06) !important;
          border: 2px dashed var(--accent-cyan, rgba(255,255,255,0.85)) !important;
          box-shadow: inset 0 0 20px rgba(255,255,255,0.05);
        }
        .drag-over-column .empty-day-pixel {
          border-color: var(--accent-cyan, rgba(255,255,255,0.85)) !important;
          opacity: 1 !important;
          color: var(--accent-cyan, rgba(255,255,255,0.85)) !important;
        }
        /* Garante que cards de escala nunca selecionem texto */
        .escala-card-pixel, .premium-shift-card {
          user-select: none !important;
          -webkit-user-select: none !important;
        }
        .premium-shift-card:active {
          cursor: grabbing !important;
        }

        /* ── Inline time editing ── */
        .kabania-v2-time-pill--clickable {
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .kabania-v2-time-pill--clickable:hover {
          background: rgba(255,255,255,0.15);
          color: var(--accent-cyan, rgba(255,255,255,0.85));
        }
        .kabania-v2-time-pill--clickable:hover svg {
          opacity: 1 !important;
        }

        .kabania-v2-time-edit {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 100px;
          padding: 3px 8px;
          user-select: none;
        }

        .kabania-v2-time-input {
          background: transparent;
          border: none;
          outline: none;
          color: var(--accent-cyan, rgba(255,255,255,0.85));
          font-size: 12px;
          font-weight: 800;
          font-family: inherit;
          width: 60px;
          text-align: center;
          cursor: text;
        }
        .kabania-v2-time-input::-webkit-calendar-picker-indicator {
          display: none;
        }

        .kabania-v2-time-sep {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 700;
        }

        .kabania-v2-time-confirm,
        .kabania-v2-time-cancel {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
          border-radius: 4px;
          line-height: 1;
          transition: color 0.15s;
        }
        .kabania-v2-time-confirm { color: #10b981; }
        .kabania-v2-time-confirm:hover { color: #34d399; }
        .kabania-v2-time-cancel  { color: var(--text-muted); font-size: 16px; }
        .kabania-v2-time-cancel:hover  { color: #ef4444; }

        [data-theme='light'] .kabania-v2-time-edit {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.3);
        }
        [data-theme='light'] .kabania-v2-time-input { color: #0891b2; }
      `}</style>
    </div>

      {/* ⏰ MODAL DE HORÁRIO — Design premium theme-aware */}
      {timeModal.isOpen && (
        <div
          className="modal-overlay-pixel sched-modal-overlay"
          onClick={() => setTimeModal({ isOpen: false, activity: null, date: null, time: '08:00' })}
        >
          <style>{`
            .sched-modal-overlay {
              background: rgba(0,0,0,0.55) !important;
              backdrop-filter: blur(14px) !important;
              -webkit-backdrop-filter: blur(14px) !important;
              z-index: 9999 !important;
            }
            .sched-modal-box {
              width: 100%;
              max-width: 420px;
              border-radius: 20px;
              padding: 1.75rem 1.5rem;
              display: flex;
              flex-direction: column;
              gap: 0;
              background: rgba(12, 18, 36, 0.97);
              border: 1px solid rgba(255,255,255,0.09);
              box-shadow: 0 24px 60px rgba(0,0,0,0.55);
            }
            [data-theme='light'] .sched-modal-box {
              background: #ffffff !important;
              border: 1px solid rgba(0,0,0,0.1) !important;
              box-shadow: 0 8px 40px rgba(0,0,0,0.12) !important;
            }

            /* Icon header */
            .sched-icon-ring {
              width: 52px; height: 52px; border-radius: 50%;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.12);
              display: flex; align-items: center; justify-content: center;
              margin: 0 auto 0.85rem;
            }
            [data-theme='light'] .sched-icon-ring {
              background: #f1f5f9 !important;
              border-color: #e2e8f0 !important;
              box-shadow: none !important;
            }
            .sched-title {
              font-size: 1.15rem; font-weight: 700; letter-spacing: -0.02em;
              text-align: center; margin: 0 0 0.2rem;
              color: #f1f5f9;
            }
            [data-theme='light'] .sched-title { color: #0f172a !important; }
            .sched-subtitle {
              font-size: 12px; text-align: center;
              color: rgba(148,163,184,0.75); margin: 0 0 1.4rem;
            }
            [data-theme='light'] .sched-subtitle { color: #64748b !important; }

            /* Activity card */
            .sched-activity-card {
              border-radius: 12px;
              padding: 10px 13px;
              margin-bottom: 1.1rem;
              display: flex; align-items: center; gap: 10px;
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.07);
            }
            [data-theme='light'] .sched-activity-card {
              background: #f8fafc !important;
              border-color: #e2e8f0 !important;
            }
            .sched-activity-icon {
              background: rgba(255,255,255,0.07);
              padding: 8px; border-radius: 9px;
              display: flex; align-items: center; justify-content: center;
              flex-shrink: 0;
            }
            [data-theme='light'] .sched-activity-icon {
              background: #e2e8f0 !important;
            }
            .sched-activity-name {
              font-size: 13px; font-weight: 700;
              color: #f1f5f9; margin-bottom: 2px;
              white-space: nowrap; text-overflow: ellipsis; overflow: hidden;
            }
            [data-theme='light'] .sched-activity-name { color: #0f172a !important; }
            .sched-activity-date {
              font-size: 11px; color: rgba(148,163,184,0.8);
              display: flex; align-items: center; gap: 4px;
            }
            [data-theme='light'] .sched-activity-date { color: #64748b !important; }

            /* Section label */
            .sched-label {
              display: block; font-size: 10px; font-weight: 700;
              text-transform: uppercase; letter-spacing: 0.06em;
              margin-bottom: 7px;
              color: rgba(148,163,184,0.5);
            }
            [data-theme='light'] .sched-label { color: #94a3b8 !important; }

            /* Time shortcuts grid */
            .sched-shortcuts {
              display: grid; grid-template-columns: repeat(4,1fr); gap: 6px;
              margin-bottom: 1.1rem;
            }
            .sched-shortcut-btn {
              padding: 8px 4px; border-radius: 10px; cursor: pointer;
              display: flex; flex-direction: column; align-items: center; gap: 2px;
              font-size: 11px; font-weight: 700;
              transition: all 0.15s;
              border: 1px solid rgba(255,255,255,0.07);
              background: rgba(255,255,255,0.03);
              color: rgba(148,163,184,0.75);
            }
            .sched-shortcut-btn:hover {
              background: rgba(255,255,255,0.07);
              border-color: rgba(255,255,255,0.15);
              color: #e2e8f0;
            }
            .sched-shortcut-btn.active {
              background: rgba(255,255,255,0.1);
              border-color: rgba(255,255,255,0.25);
              color: #f1f5f9;
            }
            [data-theme='light'] .sched-shortcut-btn {
              background: #f8fafc !important;
              border-color: #e2e8f0 !important;
              color: #475569 !important;
            }
            [data-theme='light'] .sched-shortcut-btn:hover {
              background: #f1f5f9 !important;
              border-color: #cbd5e1 !important;
              color: #1e293b !important;
            }
            [data-theme='light'] .sched-shortcut-btn.active {
              background: #0f172a !important;
              border-color: #0f172a !important;
              color: #ffffff !important;
            }
            .sched-shortcut-icon { font-size: 14px; line-height: 1; }
            .sched-shortcut-time { font-size: 11px; font-weight: 700; }
            .sched-shortcut-name { font-size: 9px; font-weight: 500; opacity: 0.65; }

            /* Time input */
            .sched-time-wrapper {
              display: flex; justify-content: center;
              margin-bottom: 1.1rem;
            }
            .sched-time-input {
              font-size: 1.85rem; font-weight: 800; text-align: center;
              padding: 10px 16px;
              min-width: 200px; width: 200px;
              border-radius: 14px; outline: none;
              font-family: inherit; letter-spacing: 0.01em;
              background: rgba(255,255,255,0.05);
              border: 1.5px solid rgba(255,255,255,0.15);
              color: #f1f5f9;
              transition: border-color 0.2s;
              -webkit-appearance: none;
              appearance: none;
            }
            .sched-time-input:focus {
              border-color: rgba(255,255,255,0.35);
            }
            .sched-time-input::-webkit-calendar-picker-indicator {
              display: none !important;
              opacity: 0 !important;
              width: 0 !important;
            }
            .sched-time-input::-webkit-inner-spin-button,
            .sched-time-input::-webkit-outer-spin-button {
              -webkit-appearance: none !important;
            }
            [data-theme='light'] .sched-time-input {
              background: #f8fafc !important;
              border-color: #cbd5e1 !important;
              color: #0f172a !important;
            }
            [data-theme='light'] .sched-time-input:focus {
              border-color: #94a3b8 !important;
            }

            /* Duration buttons */
            .sched-durations {
              display: flex; gap: 6px;
              margin-bottom: 1.1rem;
            }
            .sched-dur-btn {
              flex: 1; padding: 9px 0; border-radius: 10px; cursor: pointer;
              font-size: 11px; font-weight: 700;
              transition: all 0.15s;
              border: 1px solid rgba(255,255,255,0.07);
              background: rgba(255,255,255,0.03);
              color: rgba(148,163,184,0.75);
            }
            .sched-dur-btn:hover {
              background: rgba(255,255,255,0.07);
              border-color: rgba(255,255,255,0.15);
              color: #e2e8f0;
            }
            .sched-dur-btn.active {
              background: rgba(255,255,255,0.12);
              border-color: rgba(255,255,255,0.3);
              color: #ffffff;
            }
            [data-theme='light'] .sched-dur-btn {
              background: #f8fafc !important;
              border-color: #e2e8f0 !important;
              color: #475569 !important;
            }
            [data-theme='light'] .sched-dur-btn:hover {
              background: #f1f5f9 !important;
              border-color: #cbd5e1 !important;
              color: #1e293b !important;
            }
            [data-theme='light'] .sched-dur-btn.active {
              background: #0f172a !important;
              border-color: #0f172a !important;
              color: #ffffff !important;
            }

            /* Summary bar */
            .sched-summary {
              border-radius: 12px; padding: 11px 14px;
              margin-bottom: 1.25rem;
              display: flex; flex-direction: column;
              align-items: center; gap: 3px;
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.08);
            }
            [data-theme='light'] .sched-summary {
              background: #f8fafc !important;
              border-color: #e2e8f0 !important;
            }
            .sched-summary-label {
              font-size: 9px; font-weight: 700; text-transform: uppercase;
              letter-spacing: 0.07em; color: rgba(148,163,184,0.45);
            }
            [data-theme='light'] .sched-summary-label { color: #94a3b8 !important; }
            .sched-summary-time {
              font-size: 14px; font-weight: 800; letter-spacing: 0.01em;
              color: #f1f5f9; display: flex; align-items: center; gap: 6px;
            }
            [data-theme='light'] .sched-summary-time { color: #0f172a !important; }
            .sched-summary-total {
              font-size: 10px; font-weight: 600; color: rgba(148,163,184,0.7);
            }
            [data-theme='light'] .sched-summary-total { color: #64748b !important; }

            /* Action buttons */
            .sched-actions {
              display: flex; gap: 10px;
            }
            .sched-btn-cancel {
              flex: 1; padding: 12px 0; border-radius: 12px; cursor: pointer;
              font-size: 13px; font-weight: 600;
              transition: all 0.15s;
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.1);
              color: rgba(148,163,184,0.9);
            }
            .sched-btn-cancel:hover {
              background: rgba(255,255,255,0.08);
              color: #f1f5f9;
            }
            [data-theme='light'] .sched-btn-cancel {
              background: #f8fafc !important;
              border-color: #e2e8f0 !important;
              color: #475569 !important;
            }
            [data-theme='light'] .sched-btn-cancel:hover {
              background: #f1f5f9 !important;
              color: #0f172a !important;
            }
            .sched-btn-confirm {
              flex: 1; padding: 12px 0; border-radius: 12px; cursor: pointer;
              font-size: 13px; font-weight: 700;
              display: flex; align-items: center; justify-content: center; gap: 6px;
              transition: all 0.15s;
              background: rgba(255,255,255,0.9);
              border: 1px solid rgba(255,255,255,0.5);
              color: #0f172a;
            }
            .sched-btn-confirm:hover {
              background: #ffffff;
            }
            [data-theme='light'] .sched-btn-confirm {
              background: #0f172a !important;
              border-color: #0f172a !important;
              color: #ffffff !important;
            }
            [data-theme='light'] .sched-btn-confirm:hover {
              background: #1e293b !important;
            }
          `}</style>

          <div className="sched-modal-box animate-fade-in" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
              <div className="sched-icon-ring">
                <Clock size={22} className="sched-icon-clr" style={{ color: 'var(--text-muted, #94a3b8)' }} />
              </div>
              <h3 className="sched-title">Agendar Escala</h3>
              <p className="sched-subtitle">Defina o horário e período de execução</p>
            </div>

            {/* Activity Info */}
            <div className="sched-activity-card">
              <div className="sched-activity-icon">
                <Zap size={15} className="sched-icon-clr" style={{ color: 'var(--text-muted, #94a3b8)' }} />
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div className="sched-activity-name">
                  {(timeModal.activity?.title || timeModal.activity?.location || timeModal.activity?.name || 'Local Não Definido').replace(/^(TITULO|TITLE):\s*/i, '')}
                </div>
                <div className="sched-activity-date">
                  <Calendar size={11} />
                  {timeModal.date?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </div>
              </div>
            </div>

            {/* Time Shortcuts */}
            <span className="sched-label">Sugestões de Início</span>
            <div className="sched-shortcuts">
              {[
                { label: '08:00', icon: '🌅', name: 'Manhã' },
                { label: '14:00', icon: '☀️', name: 'Tarde' },
                { label: '18:00', icon: '🌇', name: 'Noite' },
                { label: '22:00', icon: '🌙', name: 'Noturno' },
              ].map(item => (
                <button
                  key={item.label}
                  className={`sched-shortcut-btn${timeModal.time === item.label ? ' active' : ''}`}
                  onClick={() => setTimeModal(prev => ({ ...prev, time: item.label }))}
                >
                  <span className="sched-shortcut-icon">{item.icon}</span>
                  <span className="sched-shortcut-time">{item.label}</span>
                  <span className="sched-shortcut-name">{item.name}</span>
                </button>
              ))}
            </div>

            {/* Time Input */}
            <span className="sched-label" style={{ textAlign: 'center' }}>Ajuste Fino de Horário</span>
            <div className="sched-time-wrapper">
              <input
                type="time"
                className="sched-time-input"
                value={timeModal.time}
                onChange={(e) => setTimeModal(prev => ({ ...prev, time: e.target.value }))}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmDrop();
                  if (e.key === 'Escape') setTimeModal({ isOpen: false, activity: null, date: null, time: '08:00' });
                }}
              />
            </div>

            {/* Duration */}
            <span className="sched-label">Duração do Período</span>
            <div className="sched-durations">
              {[1, 2, 4, 8, 12].map(hours => (
                <button
                  key={hours}
                  className={`sched-dur-btn${duration === hours ? ' active' : ''}`}
                  onClick={() => setDuration(hours)}
                >
                  {hours}h
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="sched-summary">
              <span className="sched-summary-label">Período Agendado</span>
              <span className="sched-summary-time">
                <Timer size={14} style={{ opacity: 0.6 }} />
                {timeModal.time} às {getEndTimeStr(timeModal.time, duration)}
              </span>
              <span className="sched-summary-total">
                Total de {duration} {duration === 1 ? 'hora' : 'horas'}
              </span>
            </div>

            {/* Actions */}
            <div className="sched-actions">
              <button
                className="sched-btn-cancel"
                onClick={() => setTimeModal({ isOpen: false, activity: null, date: null, time: '08:00' })}
              >
                Cancelar
              </button>
              <button className="sched-btn-confirm" onClick={handleConfirmDrop}>
                <Zap size={15} /> Confirmar
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
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(168, 85, 247, 0.05))',
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
                background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)',
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
                <MapPin size={18} style={{ color: 'var(--accent-cyan, rgba(255,255,255,0.85))' }} />
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

// ── Helpers de horário ────────────────────────────────────────────────────
function toTimeStr(isoDate) {
  const d = new Date(isoDate);
  return d.toTimeString().slice(0, 5); // "HH:MM"
}
function buildISO(originalISO, newTime) {
  const d = new Date(originalISO);
  const [h, m] = newTime.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

// ── EscalaCard ────────────────────────────────────────────────────────────
function EscalaCard({ shift, onAddEmployee, onUpdateStatus, onCheckin, onDelete, onEdit, onInspect, onTimeEdit }) {
  const isDraft = shift.status === 'draft';
  const isPublished = shift.status === 'published';
  const isConfirmed = shift.status === 'confirmed';
  const inProgress = shift.status === 'in_progress' || shift.status === 'active';
  const isConcluded = shift.status === 'completed' || shift.status === 'concluded' || shift.status === 'closed';

  const startTime = new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime   = new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const [editingTime, setEditingTime] = useState(false);
  const [draft, setDraft] = useState({ start: '', end: '' });

  const openTimeEdit = (e) => {
    e.stopPropagation();
    setDraft({ start: toTimeStr(shift.start_time), end: toTimeStr(shift.end_time) });
    setEditingTime(true);
  };

  const cancelTimeEdit = (e) => {
    e?.stopPropagation();
    setEditingTime(false);
  };

  const saveTimeEdit = (e) => {
    e?.stopPropagation();
    if (!draft.start || !draft.end) return;
    const newStart = buildISO(shift.start_time, draft.start);
    const newEnd   = buildISO(shift.end_time,   draft.end);
    if (newEnd <= newStart) return; // horário inválido
    onTimeEdit && onTimeEdit(shift.id, newStart, newEnd, shift.environment_id);
    setEditingTime(false);
  };

  const handleTimeKeyDown = (e) => {
    if (e.key === 'Enter') saveTimeEdit(e);
    if (e.key === 'Escape') cancelTimeEdit(e);
  };

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
      'border:1px solid rgba(255,255,255,0.6)',
      'border-radius:12px', 'padding:0 14px',
      'color:rgba(255,255,255,0.85)', 'font-size:13px', 'font-weight:800',
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

          {editingTime ? (
            <div className="kabania-v2-time-edit" onClick={e => e.stopPropagation()}>
              <input
                type="time"
                className="kabania-v2-time-input"
                value={draft.start}
                onChange={e => setDraft(d => ({ ...d, start: e.target.value }))}
                onKeyDown={handleTimeKeyDown}
                autoFocus
              />
              <span className="kabania-v2-time-sep">–</span>
              <input
                type="time"
                className="kabania-v2-time-input"
                value={draft.end}
                onChange={e => setDraft(d => ({ ...d, end: e.target.value }))}
                onKeyDown={handleTimeKeyDown}
              />
              <button className="kabania-v2-time-confirm" onClick={saveTimeEdit} title="Salvar">
                <CheckCircle size={14} />
              </button>
              <button className="kabania-v2-time-cancel" onClick={cancelTimeEdit} title="Cancelar">
                <span style={{ fontSize: 16, lineHeight: 1 }}>×</span>
              </button>
            </div>
          ) : (
            <div
              className="kabania-v2-time-pill kabania-v2-time-pill--clickable"
              onClick={openTimeEdit}
              title="Clique para editar horário"
            >
              <Clock size={12} className="opacity-50" />
              <span>{startTime} - {endTime}</span>
            </div>
          )}
        </div>

        <div className="kabania-v2-header-right">
          <button
            className="kabania-v2-action-sq"
            title="Editar escala completa"
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
