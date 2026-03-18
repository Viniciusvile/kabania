import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Wand2, ChevronLeft, ChevronRight, Loader2, Trash2, Clock, MapPin, Briefcase, Plus, Flame, CheckCircle2, Ticket, Users } from 'lucide-react';
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
    
    const labels = ['Seg', 'Ter', 'Qqa', 'Qua', 'Qui', 'Sex', 'Dom'];
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
      {/* Action Bar PIXEL */}
      <div className="action-bar-pixel">
        <div className="flex items-center gap-4">
            <span className="filter-label-pixel text-muted">Filtrar por:</span>
            <div className="filter-group-pixel">
                <button className={`pill-pixel ${activeFilter === 'todos' ? 'active' : ''}`} onClick={() => setActiveFilter('todos')}>Todos</button>
                <button className={`pill-pixel ${activeFilter === 'ativos' ? 'active' : ''}`} onClick={() => setActiveFilter('ativos')}>Ativos</button>
                <button className={`pill-pixel ${activeFilter === 'concluidos' ? 'active' : ''}`} onClick={() => setActiveFilter('concluidos')}>Concluídos</button>
            </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="bg-white border border-black/5 rounded-xl px-4 py-2 flex items-center gap-4">
                <button onClick={prevWeek} className="p-1 hover:bg-gray-100 rounded text-muted transition-colors"><ChevronLeft size={16}/></button>
                <span className="font-bold text-sm text-gray-500">{weekDays[0].date.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} à {weekDays[6].date.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} {weekDays[6].date.getFullYear()}</span>
                <button onClick={nextWeek} className="p-1 hover:bg-gray-100 rounded text-muted transition-colors"><ChevronRight size={16}/></button>
            </div>
            <button className="n-shift-btn">
                <Plus size={18} /> Nova Escala
            </button>
        </div>
      </div>

      {/* Main Grid PIXEL */}
      <div className="grid-container-pixel">
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
                    <div key={day.label} className="column-pixel">
                        <header className="column-header-pixel">
                            <span className="day-num-pixel">{day.dayNum}</span>
                            <span className="day-txt-pixel">{day.label}</span>
                        </header>

                        {dayShifts.map(shift => {
                            const env = environments.find(e => e.id === shift.environment_id);
                            const act = activities.find(a => a.id === shift.activity_id);
                            const startTime = new Date(shift.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            const endTime = new Date(shift.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            
                            // Mocking some data from image for fidelity (replace with real if avail)
                            const isUrgent = shift.status === 'open';
                            const isInProgress = !isUrgent && new Date(shift.end_time) >= new Date();

                            // Get employees
                            const assignedEmployees = employees.filter(e => e.shift_profile_id === shift.employee_id);

                            return (
                                <div key={shift.id} className={`card-pixel ${isUrgent ? 'urgent' : ''} ${isInProgress ? 'in-progress' : ''}`}>
                                    <div className="env-tag-pixel">
                                        <Flame size={12} /> {act?.name || 'Recurso'}
                                    </div>
                                    <div className="loc-title-pixel">
                                        {isUrgent ? <Flame size={16} /> : <MapPin size={16} />} 
                                        {env?.name || 'Local'}
                                    </div>
                                    <div className="time-row-pixel">
                                        <CheckCircle2 size={14} /> {startTime} às {endTime}
                                    </div>

                                    <div className="metrics-row-pixel">
                                        <div className="metric-item-pixel">
                                            <Flame size={12} className="text-red-500" /> 5 Chamados
                                        </div>
                                        <div className="metric-item-pixel">
                                            <Ticket size={12} className="text-blue-500" /> 6 comissões
                                        </div>
                                        <div className={`status-badge-pixel ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {isUrgent ? 'Em Aberta' : 'Em Curso'}
                                        </div>
                                    </div>

                                    {/* VERTICAL AVATAR LIST PIXEL */}
                                    <div className="v-avatars-pixel">
                                        {assignedEmployees.map(emp => (
                                            <div key={emp.id} className="v-avatar-item">
                                                <div className="v-avatar-img">
                                                    {emp.name.substring(0,1)}
                                                </div>
                                                <span className="v-avatar-name">{emp.name.split(' ')[0]}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Faded bottom items if first column (mocked for visual fidelity as seen in image) */}
                                    {day.label === 'Seg' && (
                                        <div className="secondary-items-pixel">
                                            <div className="secondary-item-pixel text-gray-400">
                                                <Users size={12} /> Agranca
                                            </div>
                                            <div className="secondary-item-pixel text-gray-400">
                                                <Wand2 size={12} /> Renata
                                            </div>
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
  );
}
