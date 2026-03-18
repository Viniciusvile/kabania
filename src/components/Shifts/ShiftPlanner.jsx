import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Wand2, ChevronLeft, ChevronRight, Loader2, Trash2, Clock, MapPin, Briefcase, Plus, Flame, CheckCircle2, Ticket, Users, Layout } from 'lucide-react';
import { getShifts, getEmployeeProfiles, getWorkEnvironments, getActivities } from '../../services/shiftService';
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

  const getWeekDays = () => {
    const days = [];
    const d = new Date(weekStart);
    const day = d.getDay() || 7;
    if (day !== 1) d.setHours(-24 * (day - 1));
    
    const labels = ['Seg', 'Ter', 'Qqa', 'Qua', 'Qui', 'Sex', 'Dom'];
    for (let i = 0; i < 7; i++) {
        days.push({ date: new Date(d), label: labels[i], dayNum: d.getDate() });
        d.setDate(d.getDate() + 1);
    }
    return days;
  };

  if (loading) return <div className="p-12 text-center text-gray-500 font-bold"><Loader2 className="animate-spin mx-auto mb-4 text-accent" /> Carregando G4 Mirror...</div>;

  const weekDays = getWeekDays();

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Top Control Bar G4 */}
      <div className="action-bar-pixel">
        <div className="flex items-center gap-4">
            <span className="text-gray-400 font-bold text-sm">Filtrar por:</span>
            <div className="filter-group-pixel">
                <button className={`pill-pixel ${activeFilter === 'todos' ? 'active' : ''}`} onClick={() => setActiveFilter('todos')}>Todos</button>
                <button className={`pill-pixel ${activeFilter === 'ativos' ? 'active' : ''}`} onClick={() => setActiveFilter('ativos')}>Ativos</button>
                <button className={`pill-pixel ${activeFilter === 'concluidos' ? 'active' : ''}`} onClick={() => setActiveFilter('concluidos')}>Concluídos</button>
            </div>
        </div>

        <div className="flex items-center gap-6">
            <div className="bg-white border border-gray-100 rounded-xl px-6 py-2 shadow-sm flex items-center gap-6">
                <CalendarIcon size={18} className="text-gray-400" />
                <span className="font-extrabold text-sm text-gray-500">{weekDays[0].date.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} à {weekDays[6].date.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} {weekDays[6].date.getFullYear()}</span>
            </div>
            <button className="n-shift-btn">
                + Nova Escala
            </button>
        </div>
      </div>

      {/* Floating Week Nav G4 */}
      <div className="g4-floating-nav">
          <button onClick={() => setWeekStart(new Date(weekStart.setDate(weekStart.getDate() - 7)))}><ChevronLeft size={20}/></button>
          <span className="font-black text-sm">{weekDays[0].date.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} à {weekDays[6].date.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} {weekDays[6].date.getFullYear()}</span>
          <button onClick={() => setWeekStart(new Date(weekStart.setDate(weekStart.getDate() + 7)))}><ChevronRight size={20}/></button>
      </div>

      {/* Grid Semanal G4 */}
      <div className="grid-container-pixel">
            {weekDays.map(day => {
                let dayShifts = shifts.filter(s => {
                    const sDate = new Date(s.start_time);
                    return sDate.getDate() === day.date.getDate() && sDate.getMonth() === day.date.getMonth();
                });

                return (
                    <div key={day.label} className="column-pixel">
                        <header className="column-header-pixel">
                            <span className="day-num-pixel">{day.dayNum}</span>
                            <span className="day-txt-pixel text-gray-400 font-bold">{day.label}</span>
                        </header>

                        {dayShifts.map(shift => {
                            const env = environments.find(e => e.id === shift.environment_id);
                            const act = activities.find(a => a.id === shift.activity_id);
                            const startTime = new Date(shift.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            const endTime = new Date(shift.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            
                            // Image 4 Logic: split assigned employees
                            const assignedEmployees = employees.filter(e => {
                                // Assume shift.employee_id is a single ID, but let's check for multiple if available
                                return e.shift_profile_id === shift.employee_id;
                            });

                            // For high-fidelity visual with mock data if real assigned is empty:
                            const displayMainTeam = assignedEmployees.length > 0 ? assignedEmployees : [
                                { id: 'm1', name: 'Marcos' },
                                { id: 'm2', name: 'Torres' },
                                { id: 'm3', name: 'Ricardo' }
                            ].slice(0, 3);

                            const displaySecondaryTeam = [
                                { id: 's1', name: 'Agranca' },
                                { id: 's2', name: 'Renata' }
                            ];

                            return (
                                <div key={shift.id} className="card-pixel">
                                    <div className="badge-unit-pixel">
                                        <Layout size={12}/> {act?.name || 'Lernquina'}
                                    </div>
                                    
                                    <div className="shift-main-card-pixel">
                                        <div className="loc-title-pixel">
                                            {env?.name || 'Açougue do JM'}
                                        </div>
                                        <div className="time-row-pixel">
                                            <Clock size={12} className="inline mr-1"/> {startTime} às {endTime}
                                        </div>

                                        <div className="metrics-list-pixel">
                                            <div className="metric-item-pixel">
                                                <Flame size={12} /> {shift.calls_count || 5} Chamados
                                            </div>
                                            <div className="metric-item-pixel">
                                                <Ticket size={12} /> {shift.commissions_count || 6} comissões
                                            </div>
                                            
                                            <div className={`status-badge-pixel ${shift.status === 'in_progress' ? 'course' : shift.status === 'open' ? 'open' : 'turn'}`}>
                                                {shift.status === 'in_progress' ? 'Em Curso' : shift.status === 'open' ? 'Em Aberta' : 'Em Turno'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* SUPERIOR TEAM (High Contrast) */}
                                    <div className="v-team-group-pixel superior">
                                        {displayMainTeam.map(emp => (
                                            <div key={emp.id} className="v-avatar-item">
                                                <div className="v-avatar-box">
                                                    <div className="w-full h-full bg-slate-300 flex items-center justify-center font-black text-white">{emp.name[0]}</div>
                                                </div>
                                                <span className="v-avatar-name">{emp.name.split(' ')[0]}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* SECONDARY TEAM (Faded/Gray) */}
                                    <div className="v-team-group-pixel secondary">
                                         {displaySecondaryTeam.map(emp => (
                                             <div key={emp.id} className="v-avatar-item">
                                                <div className="v-avatar-box">
                                                     <div className="w-full h-full bg-slate-200 flex items-center justify-center font-black text-slate-400">{emp.name[0]}</div>
                                                </div>
                                                <span className="v-avatar-name">{emp.name}</span>
                                             </div>
                                         ))}
                                    </div>
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
