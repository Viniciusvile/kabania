import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, Briefcase, ChevronLeft, ChevronRight, Plus, Search, Filter, Layout, Flame, Ticket, Users, Loader2 } from 'lucide-react';
import { getShifts, getShiftStats, getEmployeeProfiles, addEmployeeToShift, removeEmployeeFromShift } from '../../services/shiftService';
import './ShiftsRedesign.css';

export default function ShiftsModule({ companyId, currentUser, userRole }) {
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, concluded: '0/0' });
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setHours(-24 * (day - 1), 0, 0, 0);
    return d;
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAllData();

    // 🔁 REAL-TIME SUBSCRIPTION
    const shiftsChannel = supabase.channel('realtime-escalas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: `company_id=eq.${companyId}` }, () => loadAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_assignments' }, () => loadAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_calls' }, () => loadAllData())
      .subscribe();

    return () => {
      supabase.removeChannel(shiftsChannel);
    };
  }, [companyId, weekStart]);

  const loadAllData = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const end = new Date(weekStart);
      end.setDate(weekStart.getDate() + 7);

      const [statsData, shiftsData, employeesData] = await Promise.all([
        getShiftStats(companyId),
        getShifts(companyId, weekStart.toISOString(), end.toISOString()),
        getEmployeeProfiles(companyId)
      ]);

      setStats(statsData);
      setShifts(shiftsData);
      setEmployees(employeesData);
    } catch (err) {
      console.error('Error loading Escalas data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const days = [];
    const d = new Date(weekStart);
    const labels = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    for (let i = 0; i < 7; i++) {
      days.push({ date: new Date(d), label: labels[i], dayNum: d.getDate() });
      d.setDate(d.getDate() + 1);
    }
    return days;
  };

  const weekDays = getWeekDays();

  // Filter shifts by status and search
  const filteredShifts = shifts.filter(s => {
    const matchesStatus = filterStatus === 'todos' || 
                         (filterStatus === 'ativos' && (s.status === 'in_progress' || s.status === 'active')) ||
                         (filterStatus === 'concluidos' && (s.status === 'completed' || s.status === 'finished'));
    const matchesSearch = !searchQuery || 
                         s.work_environments?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.assigned_employees?.some(emp => emp.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [environments, setEnvironments] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
     // Load environments and activities for the select fields
     supabase.from('work_environments').select('*').eq('company_id', companyId).then(({data}) => setEnvironments(data || []));
     supabase.from('work_activities').select('*').eq('company_id', companyId).then(({data}) => setActivities(data || []));
  }, [companyId]);

  return (
    <div className="escalas-page animate-fade-in">
      {/* 📊 INDICATOR CARDS */}
      <div className="stats-grid-pixel">
        <div className="stat-card-pixel">
          <div className="stat-icon-wrapper blue"><Calendar size={20} /></div>
          <div className="stat-content">
            <span className="stat-label">Total de Escalas</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card-pixel">
          <div className="stat-icon-wrapper red"><Clock size={20} /></div>
          <div className="stat-content">
            <span className="stat-label">Escalas Abertas</span>
            <span className="stat-value">{stats.open}</span>
          </div>
        </div>
        <div className="stat-card-pixel">
          <div className="stat-icon-wrapper green"><Briefcase size={20} /></div>
          <div className="stat-content">
            <span className="stat-label">Escalas em Curso</span>
            <span className="stat-value">{stats.inProgress}</span>
          </div>
        </div>
        <div className="stat-card-pixel">
          <div className="stat-icon-wrapper purple"><CheckCircle size={20} /></div>
          <div className="stat-content">
            <span className="stat-label">Escalas Concluídas</span>
            <span className="stat-value">{stats.concluded}</span>
          </div>
        </div>
      </div>

      {/* 🔎 FILTERS & CONTROLS */}
      <div className="controls-bar-pixel">
        <div className="flex items-center gap-4">
          <div className="filter-pills-pixel">
            <button className={filterStatus === 'todos' ? 'active' : ''} onClick={() => setFilterStatus('todos')}>Todos</button>
            <button className={filterStatus === 'ativos' ? 'active' : ''} onClick={() => setFilterStatus('ativos')}>Ativos</button>
            <button className={filterStatus === 'concluidos' ? 'active' : ''} onClick={() => setFilterStatus('concluidos')}>Concluídos</button>
          </div>
          
          <div className="period-selector-pixel">
            <button onClick={() => setWeekStart(new Date(weekStart.setDate(weekStart.getDate() - 7)))}><ChevronLeft size={16} /></button>
            <span className="font-bold text-sm">
              {weekDays[0].date.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} a {weekDays[6].date.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} {weekDays[6].date.getFullYear()}
            </span>
            <button onClick={() => setWeekStart(new Date(weekStart.setDate(weekStart.getDate() + 7)))}><ChevronRight size={16} /></button>
          </div>
        </div>

        <button className="new-escala-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Nova Escala
        </button>
      </div>

      {/* 📅 WEEKLY GRID */}
      {loading ? (
        <div className="loading-area-pixel">
           <Loader2 className="animate-spin text-accent" size={40} />
           <p>Sincronizando Escalas...</p>
        </div>
      ) : (
        <div className="weekly-grid-pixel">
          {weekDays.map(day => {
            const dayShifts = filteredShifts.filter(s => {
              const d = new Date(s.start_time);
              return d.getDate() === day.date.getDate() && d.getMonth() === day.date.getMonth();
            });

            return (
              <div key={day.label} className="grid-column-pixel">
                <header className="day-header-pixel">
                  <span className="day-number">{day.dayNum}</span>
                  <span className="day-name">{day.label}</span>
                </header>

                <div className="day-content-pixel">
                  {dayShifts.map(shift => (
                    <EscalaCard key={shift.id} shift={shift} />
                  ))}
                  {dayShifts.length === 0 && <div className="empty-day-pixel">Sem escalas</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 📝 NEW SHIFT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay-pixel">
          <div className="modal-content-pixel animate-fade-in">
            <div className="modal-header">
              <h3>Agendar Nova Escala</h3>
              <button onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form className="modal-form" onSubmit={(e) => { e.preventDefault(); setIsModalOpen(false); }}>
              <div className="form-group">
                <label>Ambiente</label>
                <select required>
                  <option value="">Selecione o local</option>
                  {environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Atividade</label>
                <select required>
                  <option value="">Selecione a atividade</option>
                  {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Início</label>
                  <input type="datetime-local" required />
                </div>
                <div className="form-group">
                  <label>Fim</label>
                  <input type="datetime-local" required />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-save">Criar Escala</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EscalaCard({ shift }) {
  const isProblem = shift.status === 'open' || shift.open_calls_count > 0;
  const inProgress = shift.status === 'in_progress' || shift.status === 'active';
  
  const startTime = new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`escala-card-pixel ${isProblem ? 'problem' : inProgress ? 'progress' : 'normal'}`}>
      <div className="card-header">
        <div className="location-name">{shift.work_environments?.name || 'Local Não Definido'}</div>
        <div className="shift-time">{startTime} às {endTime}</div>
      </div>

      <div className="card-indicators">
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
        <button className="add-employee-trigger">
          <Plus size={14} /> Adicionar
        </button>
      </div>
    </div>
  );
}
