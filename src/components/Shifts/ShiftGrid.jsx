import React from 'react';
import { Briefcase, Flame, Ticket, Plus, Layout } from 'lucide-react';

export default function ShiftGrid({ shifts, weekDays, onAddEmployee, onDropActivity }) {
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
              e.dataTransfer.dropEffect = 'copy';
              e.currentTarget.classList.add('drag-over');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('drag-over');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('drag-over');
              const activityData = e.dataTransfer.getData('activity');
              if (activityData) {
                const activity = JSON.parse(activityData);
                onDropActivity(activity, day.date);
              }
            }}
          >
            <header className="day-header-pixel">
              <span className="day-number">{day.dayNum}</span>
              <span className="day-name">{day.label}</span>
            </header>

            <div className="day-content-pixel">
              {dayShifts.map(shift => (
                <EscalaCard key={shift.id} shift={shift} onAddEmployee={() => onAddEmployee(shift.id)} />
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

function EscalaCard({ shift, onAddEmployee }) {
  const isProblem = shift.status === 'open' || shift.open_calls_count > 0;
  const inProgress = shift.status === 'in_progress' || shift.status === 'active';
  
  const startTime = new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const locationName = shift.service_request?.location || shift.work_environments?.name || 'Local Não Definido';
  const activityName = shift.service_request?.type || shift.work_activities?.name || 'Atividade';

  return (
    <div className={`escala-card-pixel ${isProblem ? 'problem' : inProgress ? 'progress' : 'normal'}`}>
      <div className="card-header">
        <div className="location-name">{locationName}</div>
        <div className="shift-time">{startTime} às {endTime}</div>
      </div>

      <div className="card-indicators">
        <div className="indicator-chip" title={activityName}>
          <Briefcase size={12} /> {activityName}
        </div>
        <div className="indicator-chip">
          <Flame size={12} /> {shift.calls_count} chamados
        </div>
        <div className="indicator-chip">
          <Ticket size={12} /> {shift.commissions_count || 0} pendências
        </div>
        <div className={`status-tag ${shift.status}`}>
          {shift.status === 'in_progress' ? 'Em curso' : shift.status === 'open' ? 'Em aberto' : 'Concluído'}
        </div>
      </div>

      <div className="employee-list-pixel">
        {shift.assigned_employees?.map(emp => (
          <div key={emp.id} className="employee-item-pixel">
            <div className="employee-avatar">
              {emp.avatar_url ? (
                <img src={emp.avatar_url} alt={emp.name} />
              ) : (
                <span>{emp.name?.[0]}</span>
              )}
              <span className={`status-dot ${emp.assignment_status}`}></span>
            </div>
            <div className="employee-name">{emp.name}</div>
          </div>
        ))}
        <button className="add-employee-trigger" onClick={onAddEmployee}>
          <Plus size={14} /> Adicionar
        </button>
      </div>
    </div>
  );
}
