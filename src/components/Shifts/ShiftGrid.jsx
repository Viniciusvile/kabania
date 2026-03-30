import React from 'react';
import { Briefcase, Clock, MapPin, CheckCircle, Plus } from 'lucide-react';
import { updateShiftStatus } from '../../services/shiftService';

export default function ShiftGrid({ 
  shifts, 
  weekDays, 
  onAddEmployee, 
  onDropActivity, 
  onMoveShift, 
  onRefresh, 
  updateShiftLocally, 
  setIsSyncing,
  onCheckin
}) {
  
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

  return (
    <div className="weekly-grid-pixel timeline-mode" style={{ minHeight: 'auto', gap: '16px', padding: '16px' }}>
      <div className="days-container-pixel" style={{ gap: '16px', padding: 0 }}>
        {weekDays.map(day => {
          const dayShifts = shifts.filter(s => {
            const d = new Date(s.start_time);
            return d.getDate() === day.date.getDate() && d.getMonth() === day.date.getMonth();
          });

          // Sort by start time so they stack neatly
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
                e.currentTarget.classList.remove('drag-over-column');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('drag-over-column');
                
                const activityData = e.dataTransfer.getData('activity');
                const shiftId = e.dataTransfer.getData('shiftId');

                if (activityData) {
                  const activity = JSON.parse(activityData);
                  onDropActivity(activity, day.date, "08:00");
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
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EscalaCard({ shift, onAddEmployee, onUpdateStatus, onCheckin }) {
  const isProblem = shift.status === 'open' || (shift.open_calls_count > 0);
  const isConcluded = shift.status === 'completed' || shift.status === 'concluded';
  const inProgress = shift.status === 'in_progress' || shift.status === 'active';
  
  const startTime = new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const locationName = shift.work_environments?.name || 'Local Não Definido';
  const activityName = shift.work_activities?.name || 'Nenhuma Atividade Associada';

  return (
    <div 
      className={`escala-card-pixel premium-shift-card ${isProblem ? 'problem' : inProgress ? 'progress' : isConcluded ? 'concluded' : 'normal'}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('shiftId', shift.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      {/* Indicador de Status Glow */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '4px', height: '100%',
        background: isProblem ? 'var(--escala-danger)' : inProgress ? 'var(--escala-success)' : isConcluded ? 'var(--text-muted)' : 'var(--accent-cyan)',
        boxShadow: `0 0 15px ${isProblem ? 'var(--escala-danger)' : inProgress ? 'var(--escala-success)' : 'transparent'}`
      }} />

      {/* ⏰ TIME BADGE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="premium-time-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '8px' }}>
          <Clock size={12} className="text-accent-cyan" /> 
          <span className="premium-time-text" style={{ fontSize: '11px', fontWeight: 'bold' }}>{startTime} - {endTime}</span>
        </div>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: isProblem ? 'rgba(239, 68, 68, 0.1)' : inProgress ? 'rgba(16, 185, 129, 0.1)' : 'var(--badge-bg, rgba(255,255,255,0.05))', color: isProblem ? '#ef4444' : inProgress ? '#10b981' : 'var(--text-muted)' }}>
          {isProblem ? 'ALERTA' : inProgress ? 'EM ANDAMENTO' : isConcluded ? 'CONCLUÍDO' : 'AGENDADO'}
        </div>
      </div>

      {/* 📍 LOCATION & ACTIVITY */}
      <div>
        <div className="premium-location-text" style={{ fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.01em', marginBottom: '6px' }}>
          <MapPin size={16} className="text-accent-cyan" />
          {locationName}
        </div>
        <div className="activity-pill-premium" style={{ display: 'inline-flex', padding: '4px 10px', fontSize: '10px' }}>
          <Briefcase size={12} className="icon-accent" /> 
          {activityName}
        </div>
      </div>

      {/* 👥 PERSONNEL LIST */}
      <div style={{ borderTop: '1px dashed var(--border-light)', paddingTop: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {shift.assigned_employees?.map(emp => (
            <div key={emp.assignment_id || emp.id} className="premium-emp-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderRadius: '10px' }}>
              <div className="emp-avatar-small" style={{ width: '26px', height: '26px', fontSize: '10px', borderRadius: '8px' }}>
                {emp.avatar_url ? <img src={emp.avatar_url} alt="" /> : <span>{emp.name[0]}</span>}
              </div>
              <div className="premium-emp-name" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                {emp.name}
              </div>
            </div>
          ))}
          {!shift.assigned_employees?.length && (
            <button 
              className="glow-btn-ghost" 
              onClick={onAddEmployee}
              style={{ padding: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', borderRadius: '10px', borderStyle: 'dashed' }}
            >
              <Plus size={14} /> Atribuir Colaborador
            </button>
          )}
        </div>
      </div>

      {/* ⚙️ STATUS CONTROLS */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        {!inProgress && !isConcluded && (
          <button
            onClick={onCheckin}
            className="glow-btn-primary"
            style={{ flex: 1, padding: '10px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: '10px' }}
          >
            <MapPin size={14} /> Bater Ponto
          </button>
        )}

        {inProgress && (
          <button
            onClick={() => !isConcluded && onUpdateStatus('completed')}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              background: isConcluded ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              color: '#10b981',
              padding: '10px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              cursor: isConcluded ? 'default' : 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
            }}
          >
            <CheckCircle size={14} /> {isConcluded ? 'Concluído' : 'Finalizar Turno'}
          </button>
        )}
      </div>
    </div>
  );
}

