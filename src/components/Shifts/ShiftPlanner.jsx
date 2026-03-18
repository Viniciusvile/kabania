import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Wand2, ChevronLeft, ChevronRight, Loader2, Trash2, Clock, MapPin, Briefcase, Plus, Filter } from 'lucide-react';
import { getShifts, getEmployeeProfiles, getWorkEnvironments, getActivities, batchCreateShifts, deleteShift } from '../../services/shiftService';
import { generateSmartShiftForDay, notifyShiftAssignments } from '../../services/smartAllocationService';
import './ShiftsRedesign.css';

export default function ShiftPlanner({ companyId, currentUser }) {
  const [weekStart, setWeekStart] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeFilter, setActiveFilter] = useState('todos');

  useEffect(() => {
    // Round to start of week (Monday)
    const d = new Date(weekStart);
    const day = d.getDay() || 7;
    if (day !== 1) d.setHours(-24 * (day - 1));
    d.setHours(0,0,0,0);
    loadData(d);
  }, [companyId, weekStart]);

  const loadData = async (start) => {
    try {
      setLoading(true);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      
      const [sData, eData, envData, actData] = await Promise.all([
        getShifts(companyId, start.toISOString(), end.toISOString()),
        getEmployeeProfiles(companyId),
        getWorkEnvironments(companyId),
        getActivities(companyId)
      ]);
      setShifts(sData);
      setEmployees(eData);
      setEnvironments(envData);
      setActivities(actData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };
  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const getWeekDays = () => {
    const days = [];
    const d = new Date(weekStart);
    const day = d.getDay() || 7;
    if (day !== 1) d.setHours(-24 * (day - 1));
    
    const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
    for (let i = 0; i < 7; i++) {
        days.push({
            date: new Date(d),
            label: labels[i],
            dayNum: d.getDate()
        });
        d.setDate(d.getDate() + 1);
    }
    return days;
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto mb-4 text-accent" /> Carregando...</div>;

  const weekDays = getWeekDays();

  return (
    <div className="flex flex-col gap-4">
      {/* Action Bar */}
      <div className="control-bar">
        <div className="filter-toggle">
            <button className={`filter-btn ${activeFilter === 'todos' ? 'active' : ''}`} onClick={() => setActiveFilter('todos')}>Todos</button>
            <button className={`filter-btn ${activeFilter === 'ativos' ? 'active' : ''}`} onClick={() => setActiveFilter('ativos')}>Ativos</button>
            <button className={`filter-btn ${activeFilter === 'concluidos' ? 'active' : ''}`} onClick={() => setActiveFilter('concluidos')}>Concluídos</button>
        </div>

        <div className="flex items-center gap-4">
            <div className="bg-white border border-black/5 rounded-xl px-4 py-2 flex items-center gap-3">
                <button onClick={prevWeek} className="hover:text-accent"><ChevronLeft size={16}/></button>
                <span className="font-bold text-sm">{weekDays[0].date.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} - {weekDays[6].date.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})}</span>
                <button onClick={nextWeek} className="hover:text-accent"><ChevronRight size={16}/></button>
            </div>
            <button className="btn-new-shift">
                <Plus size={18} /> Nova Escala
            </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="weekly-grid-container shadow-xl">
        <header className="weekly-header">
            {weekDays.map(d => (
                <div key={d.label} className="day-column-header">
                    <span className="day-number">{d.dayNum}</span>
                    <span className="day-name">{d.label}</span>
                </div>
            ))}
        </header>

        <div className="weekly-content">
            {weekDays.map(day => {
                let dayShifts = shifts.filter(s => {
                    const sDate = new Date(s.start_time);
                    return sDate.getDate() === day.date.getDate() && sDate.getMonth() === day.date.getMonth();
                });

                // Apply filters
                if (activeFilter === 'ativos') {
                    dayShifts = dayShifts.filter(s => new Date(s.end_time) >= new Date());
                } else if (activeFilter === 'concluidos') {
                    dayShifts = dayShifts.filter(s => new Date(s.end_time) < new Date());
                }

                return (
                    <div key={day.label} className="day-column">
                        {dayShifts.map(shift => {
                            const env = environments.find(e => e.id === shift.environment_id);
                            const act = activities.find(a => a.id === shift.activity_id);
                            const startTime = new Date(shift.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            const endTime = new Date(shift.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            
                            // Get employees for this shift
                            const assignedEmployees = employees.filter(e => e.shift_profile_id === shift.employee_id);

                            return (
                                <div key={shift.id} className={`shift-card-new ${shift.status === 'open' ? 'urgent' : ''}`}>
                                    <div className="shift-location">
                                        <MapPin size={14} /> {env?.name || 'Local'}
                                    </div>
                                    <div className="shift-time font-bold">{startTime} às {endTime}</div>
                                    <div className={`shift-status-tag ${shift.status === 'in_progress' ? 'status-in-progress' : 'status-open'}`}>
                                        {shift.status === 'in_progress' ? 'Em Curso' : 'Em Aberta'}
                                    </div>

                                    {assignedEmployees.length > 0 && (
                                        <div className="avatars-list">
                                            {assignedEmployees.map(emp => (
                                                <div key={emp.id} className="avatar-item">
                                                    <div className="avatar-circle">
                                                        {emp.name.substring(0,2).toUpperCase()}
                                                    </div>
                                                    <span className="avatar-name">{emp.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
}
