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

      <div className="mb-4">
        <div className="bg-white text-slate-900 px-3 py-1.5 rounded-lg inline-flex items-center gap-2 text-xs font-bold shadow-lg">
          <Briefcase size={14} /> 
          {activityName}
        </div>
      </div>

      <div className="border-t border-dashed border-white/10 pt-4 mb-4">
        {/* 👥 PERSONNEL LIST */}
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
      <div className="flex justify-between items-center mt-auto pt-2">
        <button 
          className={`flex items-center gap-2 font-black uppercase tracking-tighter transition-all ${isConcluded ? 'text-white/20' : 'text-white/40 hover:text-white cursor-pointer'}`}
          onClick={() => !isConcluded && onUpdateStatus('completed')}
          disabled={isConcluded}
        >
          <CheckCircle size={18} className={inProgress ? 'text-green-400' : ''} /> {isConcluded ? 'CONCLUÍDO' : 'CONCLUIR'}
        </button>
        
        <div className="text-[10px] font-black italic opacity-60 uppercase tracking-widest text-accent">
          {shift.status}
        </div>
      </div>
    </div>
  );
}
