import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, Briefcase, ChevronLeft, ChevronRight, Plus, Search, Filter, Layout, Flame, Ticket, Users, Loader2 } from 'lucide-react';
import { getShifts, getShiftStats, getEmployeeProfiles, addEmployeeToShift, removeEmployeeFromShift } from '../../services/shiftService';
import { supabase } from '../../supabaseClient';
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

  const [pendingActivities, setPendingActivities] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignmentModal, setAssignmentModal] = useState({ isOpen: false, shiftId: null });
  const [environments, setEnvironments] = useState([]);
  const [activities, setActivities] = useState([]);

  // 📝 Derived values for logic and display
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return {
      date: d,
      label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      dayNum: d.getDate()
    };
  });

  const filteredShifts = shifts.filter(s => {
    if (filterStatus === 'ativos') return s.status === 'in_progress' || s.status === 'open';
    if (filterStatus === 'concluidos') return s.status === 'concluded';
    return true;
  }).filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.work_environments?.name?.toLowerCase().includes(q) || 
           s.work_activities?.name?.toLowerCase().includes(q);
  });

  const fieldWorkers = employees.filter(e => e.role === 'field' || e.role === 'colaborador');
  const staffMembers = employees.filter(e => e.role !== 'field' && e.role !== 'colaborador');

  const loadAllData = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const end = new Date(weekStart);
      end.setDate(weekStart.getDate() + 7);

      const [statsData, shiftsData, employeesData, activitiesData, envsData, workActsData] = await Promise.all([
        getShiftStats(companyId),
        getShifts(companyId, weekStart.toISOString(), end.toISOString()),
        getEmployeeProfiles(companyId),
        supabase.from('activities').select('*').eq('company_id', companyId).neq('status', 'Concluída').order('created', { ascending: false }),
        supabase.from('work_environments').select('*').eq('company_id', companyId),
        supabase.from('work_activities').select('*').eq('company_id', companyId)
      ]);

      setStats(statsData);
      setShifts(shiftsData);
      setEmployees(employeesData);
      setEnvironments(envsData.data || []);
      setActivities(workActsData.data || []);
      
      const linkedIds = new Set(shiftsData.map(s => s.service_request_id).filter(Boolean));
      setPendingActivities((activitiesData.data || []).filter(a => !linkedIds.has(a.id)));

    } catch (err) {
      console.error('Error loading Escalas data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (profileId) => {
    if (!assignmentModal.shiftId) return;
    try {
      setLoading(true);
      await addEmployeeToShift(assignmentModal.shiftId, profileId);
      setAssignmentModal({ isOpen: false, shiftId: null });
      await loadAllData();
    } catch (err) {
      alert("Erro ao adicionar colaborador: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmployee = async (shiftId, profileId) => {
    try {
      setLoading(true);
      await removeEmployeeFromShift(shiftId, profileId);
      await loadAllData();
    } catch (err) {
      alert("Erro ao remover colaborador: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newShift = {
      company_id: companyId,
      environment_id: formData.get('environment_id'),
      activity_id: formData.get('activity_id'),
      start_time: new Date(formData.get('start_time')).toISOString(),
      end_time: new Date(formData.get('end_time')).toISOString(),
      status: 'scheduled'
    };

    try {
      setLoading(true);
      const { error } = await supabase.from('shifts').insert([newShift]);
      if (error) throw error;
      setIsModalOpen(false);
      await loadAllData();
      alert("Escala criada com sucesso!");
    } catch (err) {
      alert("Erro ao criar escala: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSchedule = async (activity) => {
     try {
       setLoading(true);
       const startDate = activity.last_appointment ? new Date(activity.last_appointment) : new Date();
       const endDate = new Date(startDate.getTime() + (60 * 60000));
       
       await supabase.from('shifts').insert([{
         company_id: companyId,
         service_request_id: activity.id,
         start_time: startDate.toISOString(),
         end_time: endDate.toISOString(),
         status: 'scheduled',
         notes: `Agendado via menu de Escalas`
       }]);

       await loadAllData();
       alert("Escala gerada com sucesso!");
     } catch (err) {
       console.error("Erro ao agendar atividade:", err);
       alert("Erro ao criar escala: " + err.message);
     } finally {
       setLoading(false);
     }
  };

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

      <div className="shifts-main-layout">
        <div className="shifts-grid-area">
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
            <EscalaGrid 
              shifts={filteredShifts} 
              weekDays={weekDays} 
              onAddEmployee={(id) => setAssignmentModal({ isOpen: true, shiftId: id })} 
            />
          )}
        </div>

        {/* 📋 PENDING ACTIVITIES SIDEBAR */}
        <aside className="pending-activities-sidebar">
          <header className="sidebar-header">
            <h3><Briefcase size={18} /> Solicitações Pendentes</h3>
            <span className="pending-count">{pendingActivities.length}</span>
          </header>
          
          <div className="pending-list">
            {pendingActivities.map(act => (
              <div key={act.id} className="pending-act-card animate-slide-right">
                <div className="act-header">
                  <span className="act-id">#{act.id}</span>
                  <span className="act-type">{act.type}</span>
                </div>
                <h4 className="act-location">{act.location}</h4>
                <div className="act-footer">
                  <button className="btn-schedule-quick" onClick={() => handleQuickSchedule(act)}>
                    <Plus size={14} /> Ativar Escala
                  </button>
                </div>
              </div>
            ))}
            {pendingActivities.length === 0 && (
              <div className="empty-pending">
                <CheckCircle size={32} className="text-muted opacity-20" />
                <p>Tudo em escala!</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 🤝 ASSIGNMENT MODAL */}
      {assignmentModal.isOpen && (
        <div className="modal-overlay-pixel">
          <div className="modal-content-pixel assignment-modal animate-slide-up">
            <div className="modal-header">
              <h3>Direcionar para Colaboradores</h3>
              <button onClick={() => setAssignmentModal({ isOpen: false, shiftId: null })}>×</button>
            </div>
            
            <div className="assignment-tabs">
              <div className="role-section">
                <h4>👷 Colaboradores de Campo</h4>
                <div className="employee-grid-select">
                  {fieldWorkers.map(emp => (
                    <div key={emp.id} className="emp-select-card" onClick={() => handleAddEmployee(emp.shift_profile_id || emp.id)}>
                      <div className="emp-avatar-medium">
                        {emp.avatar_url ? <img src={emp.avatar_url} /> : <span>{emp.name[0]}</span>}
                      </div>
                      <div className="emp-info">
                        <span className="emp-name">{emp.name}</span>
                        <span className="emp-role">{emp.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="role-section mt-4">
                <h4>👥 Membros da Equipe</h4>
                <div className="employee-grid-select">
                  {staffMembers.map(emp => (
                    <div key={emp.id} className="emp-select-card" onClick={() => handleAddEmployee(emp.shift_profile_id || emp.id)}>
                      <div className="emp-avatar-medium">
                        {emp.avatar_url ? <img src={emp.avatar_url} /> : <span>{emp.name[0]}</span>}
                      </div>
                      <div className="emp-info">
                        <span className="emp-name">{emp.name}</span>
                        <span className="emp-role">{emp.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
            <form className="modal-form" onSubmit={handleCreateShift}>
              <div className="form-group">
                <label>Ambiente</label>
                <select name="environment_id" required>
                  <option value="">Selecione o local</option>
                  {environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Atividade</label>
                <select name="activity_id" required>
                  <option value="">Selecione a atividade</option>
                  {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Início</label>
                  <input name="start_time" type="datetime-local" required />
                </div>
                <div className="form-group">
                  <label>Fim</label>
                  <input name="end_time" type="datetime-local" required />
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

function EscalaGrid({ shifts, weekDays, onAddEmployee }) {
  return (
    <div className="weekly-grid-pixel">
      {weekDays.map(day => {
        const dayShifts = shifts.filter(s => {
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
                <EscalaCard key={shift.id} shift={shift} onAddEmployee={() => onAddEmployee(shift.id)} />
              ))}
              {dayShifts.length === 0 && <div className="empty-day-pixel">Sem escalas</div>}
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
