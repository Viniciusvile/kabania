import React from 'react';
import { Briefcase, Flame, Ticket, Plus, Layout, CheckCircle, Clock, MapPin, Calendar } from 'lucide-react';
import { updateShiftStatus } from '../../services/shiftService';

export default function ShiftGrid({ shifts, weekDays, onAddEmployee, onDropActivity, onMoveShift, onRefresh, updateShiftLocally, setIsSyncing }) {
  const handleUpdateStatus = async (shiftId, status) => {
    try {
      if (setIsSyncing) setIsSyncing(true);
      // Optimistic update
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
    <div className="weekly-grid-pixel">
      {weekDays.map(day => {
        const dayShifts = shifts.filter(s => {
          const d = new Date(s.start_time);
          return d.getDate() === day.date.getDate() && d.getMonth() === day.date.getMonth();
        });

        return (
          <div 
            key={day.date.toISOString()} 
            className="grid-column-pixel"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              e.currentTarget.classList.add('drag-over');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('drag-over');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('drag-over');
              
              const activityData = e.dataTransfer.getData('activity');
              const shiftId = e.dataTransfer.getData('shiftId');

              if (activityData) {
                const activity = JSON.parse(activityData);
                onDropActivity(activity, day.date);
              } else if (shiftId) {
                onMoveShift(shiftId, day.date);
              }
            }}
          >
            <header className="day-header-pixel">
              <span className="day-number">{day.dayNum}</span>
              <span className="day-name">{day.label}</span>
            </header>

            <div className="day-content-pixel">
              {dayShifts.map(shift => (
                <EscalaCard 
                  key={shift.id} 
                  shift={shift} 
                  onAddEmployee={() => onAddEmployee(shift.id)} 
                  onUpdateStatus={(status) => handleUpdateStatus(shift.id, status)}
                />
              ))}
              {dayShifts.length === 0 && (
                <div className="empty-day-pixel">
                  <Layout size={16} opacity={0.3} />
                  <span>Livre</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EscalaCard({ shift, onAddEmployee, onUpdateStatus }) {
  const isProblem = shift.status === 'open' || (shift.open_calls_count > 0);
  const isConcluded = shift.status === 'completed' || shift.status === 'concluded';
  const inProgress = shift.status === 'in_progress' || shift.status === 'active';
  
  const startTime = new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const locationName = shift.work_environments?.name || 'Local Não Definido';
  const activityName = shift.work_activities?.name || 'Atividade';

  return (
    <div 
      className={`escala-card-pixel ${isProblem ? 'problem' : inProgress ? 'progress' : isConcluded ? 'concluded' : 'normal'}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('shiftId', shift.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      {/* 📍 HEADER: Location + Time */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <div className="location-name flex items-center gap-2 text-white font-bold text-lg">
            <MapPin size={16} className="text-accent" />
            {locationName}
          </div>
        </div>
        <div className="shift-time flex flex-col items-end gap-0.5 opacity-80 text-xs font-semibold">
           <div className="flex items-center gap-1.5">
             <Clock size={14} /> {startTime} às
           </div>
           <div>{endTime}</div>
        </div>
      </div>

      {/* 🏷️ ACTIVITY PILL */}
      <div className="mb-4">
        <div className="activity-pill-premium">
          <Briefcase size={14} className="icon-accent" /> 
          {activityName || 'Atividade'}
        </div>
      </div>

      {/* 👥 PERSONNEL LIST */}
      <div className="border-t border-dashed border-white/10 pt-4 mb-4">
        <div className="employee-list-pixel">
          {shift.assigned_employees?.map(emp => (
            <div key={emp.assignment_id || emp.id} className="employee-item-premium p-2 rounded-lg bg-white/5 flex items-center gap-3 mb-2 last:mb-0">
              <div className="emp-avatar-small">
                {emp.avatar_url ? <img src={emp.avatar_url} alt="" /> : <span>{emp.name[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                 <div className="employee-name-premium text-sm font-bold truncate text-white">{emp.name}</div>
                 <div className="text-[10px] opacity-50 uppercase tracking-wider">{emp.role || 'Colaborador'}</div>
              </div>
            </div>
          ))}
          {!shift.assigned_employees?.length && (
            <button className="add-employee-trigger-premium w-full flex items-center justify-start gap-2 p-2 rounded-lg text-white/40 hover:text-white transition-all text-sm font-semibold" onClick={onAddEmployee}>
              <Plus size={18} /> Direcionar Colaborador
            </button>
          )}
        </div>
      </div>

      {/* ⚙️ STATUS CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {isConcluded ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            padding: '5px 12px',
            borderRadius: '8px',
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase'
          }}>
            <CheckCircle size={14} /> Concluído
          </div>
        ) : (
          <button
            onClick={() => onUpdateStatus('completed')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: inProgress ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.04)',
              border: inProgress ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255,255,255,0.1)',
              color: inProgress ? '#10b981' : 'rgba(255,255,255,0.4)',
              padding: '5px 12px',
              borderRadius: '8px',
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.6)';
              e.currentTarget.style.color = '#10b981';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = inProgress ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = inProgress ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255,255,255,0.1)';
              e.currentTarget.style.color = inProgress ? '#10b981' : 'rgba(255,255,255,0.4)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <CheckCircle size={14} /> Concluir
          </button>
        )}
        
        <div style={{ fontSize: '0.65rem', fontWeight: 800, fontStyle: 'italic', opacity: 0.45, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-cyan)' }}>
          {shift.status}
        </div>
      </div>
    </div>
  );
}
