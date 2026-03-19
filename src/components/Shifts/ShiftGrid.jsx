import React from 'react';
import { Briefcase, Flame, Ticket, Plus, Layout, CheckCircle, Clock, MapPin, Calendar } from 'lucide-react';
import { updateShiftStatus } from '../../services/shiftService';

// 🕒 DEFINIÇÃO DOS SLOTS DE TEMPO (08:00 às 18:30)
const TIME_SLOTS = [];
for (let hour = 8; hour <= 18; hour++) {
  TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`);
  if (hour < 18 || (hour === 18 && false)) { // Stop at 18:30 as requested
    TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:30`);
  }
}
// Add 18:30 manually to be precise
if (!TIME_SLOTS.includes('18:30')) TIME_SLOTS.push('18:30');

export default function ShiftGrid({ 
  shifts, 
  weekDays, 
  onAddEmployee, 
  onDropActivity, 
  onMoveShift, 
  onRefresh, 
  updateShiftLocally, 
  setIsSyncing 
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
    <div className="weekly-grid-pixel timeline-mode">
      {/* 🕒 EIXO DE TEMPO (SIDEBAR) */}
      <div className="time-axis-pixel">
        <div className="axis-header-spacer" />
        {TIME_SLOTS.map(time => (
          <div key={time} className="time-label">
            {time}
          </div>
        ))}
      </div>

      <div className="days-container-pixel">
        {weekDays.map(day => {
          const dayShifts = shifts.filter(s => {
            const d = new Date(s.start_time);
            return d.getDate() === day.date.getDate() && d.getMonth() === day.date.getMonth();
          });

          return (
            <div key={day.date.toISOString()} className="grid-column-pixel">
              <header className="day-header-pixel">
                <span className="day-number">{day.dayNum}</span>
                <span className="day-name">{day.label}</span>
              </header>

              <div className="day-slots-container">
                {/* 🎯 DROP SLOTS (BACKGROUND) */}
                {TIME_SLOTS.map(time => {
                  const [slotHour, slotMin] = time.split(':').map(Number);
                  
                  // Filtra shifts que começam neste exato slot (ou no intervalo de 30min dele)
                  const slotShifts = dayShifts.filter(s => {
                    const start = new Date(s.start_time);
                    const h = start.getHours();
                    const m = start.getMinutes();
                    // Garante que o shift caia no slot correto (ex: 08:00 a 08:29 cai no slot 08:00)
                    return h === slotHour && m >= slotMin && m < (slotMin + 30);
                  });

                  return (
                    <div 
                      key={time} 
                      className="time-slot-row"
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
                          onDropActivity(activity, day.date, time);
                        } else if (shiftId) {
                          onMoveShift(shiftId, day.date, time);
                        }
                      }}
                    >
                      {/* Linha guia visual */}
                      <div className="slot-guide" />
                      
                      {/* Renderiza os cards deste slot */}
                      {slotShifts.map(shift => (
                        <EscalaCard 
                          key={shift.id} 
                          shift={shift} 
                          onAddEmployee={() => onAddEmployee(shift.id)} 
                          onUpdateStatus={(status) => handleUpdateStatus(shift.id, status)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
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

  // LOGICA DE POSICIONAMENTO DINÂMICO NO SLOT
  const start = new Date(shift.start_time);
  const startHour = start.getHours();
  const startMinutes = start.getMinutes();
  
  // Offset a partir das 08:00
  // Cada slot de 30min tem uma altura fixa (definida no CSS)
  // Vamos usar o style para "encaixar" no grid se possível, ou apenas margin
  
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
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <div className="location-name flex items-center gap-2 text-white font-bold text-sm">
            <MapPin size={14} className="text-accent" />
            {locationName}
          </div>
        </div>
        <div className="shift-time flex flex-col items-end gap-0.5 opacity-80 text-[10px] font-semibold">
           <div className="flex items-center gap-1">
             <Clock size={12} /> {startTime}
           </div>
        </div>
      </div>

      {/* 🏷️ ACTIVITY PILL (SMALLER VERSION FOR TIME VIEW) */}
      <div className="mb-2">
        <div className="activity-pill-premium" style={{ padding: '4px 8px', fontSize: '0.65rem' }}>
          <Briefcase size={10} className="icon-accent" /> 
          {activityName || 'Atividade'}
        </div>
      </div>

      {/* 👥 PERSONNEL LIST (LISTA COMPACTA) */}
      <div className="border-t border-dashed border-white/10 pt-2 mb-2">
        <div className="employee-list-pixel">
          {shift.assigned_employees?.slice(0, 1).map(emp => (
            <div key={emp.assignment_id || emp.id} className="employee-item-premium p-1.5 rounded-lg bg-white/5 flex items-center gap-2 mb-1 last:mb-0">
              <div className="emp-avatar-small" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                {emp.avatar_url ? <img src={emp.avatar_url} alt="" /> : <span>{emp.name[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                 <div className="employee-name-premium text-xs font-bold truncate text-white">{emp.name}</div>
              </div>
            </div>
          ))}
          {!shift.assigned_employees?.length && (
            <button className="add-employee-trigger-premium w-full flex items-center justify-start gap-1 p-1 rounded text-white/40 hover:text-white transition-all text-[10px] font-semibold" onClick={onAddEmployee}>
              <Plus size={12} /> Alocar
            </button>
          )}
        </div>
      </div>

      {/* ⚙️ STATUS CONTROLS (COMPACT) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => !isConcluded && onUpdateStatus('completed')}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: isConcluded ? 'rgba(16, 185, 129, 0.15)' : inProgress ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.04)',
            border: isConcluded ? '1px solid rgba(16, 185, 129, 0.4)' : inProgress ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255,255,255,0.1)',
            color: isConcluded || inProgress ? '#10b981' : 'rgba(255,255,255,0.4)',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '0.6rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            cursor: isConcluded ? 'default' : 'pointer'
          }}
        >
          <CheckCircle size={12} /> {isConcluded ? 'OK' : 'Concluir'}
        </button>
      </div>
    </div>
  );
}

