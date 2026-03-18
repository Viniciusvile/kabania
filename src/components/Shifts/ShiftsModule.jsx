import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getShifts, getShiftStats, getEmployeeProfiles, addEmployeeToShift, removeEmployeeFromShift } from '../../services/shiftService';
import { supabase } from '../../supabaseClient';
import ShiftStats from './ShiftStats';
import ShiftSidebar from './ShiftSidebar';
import ShiftControls from './ShiftControls';
import ShiftGrid from './ShiftGrid';
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
  const [pendingActivities, setPendingActivities] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignmentModal, setAssignmentModal] = useState({ isOpen: false, shiftId: null });
  const [environments, setEnvironments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadAllData();
    const shiftsChannel = supabase.channel('realtime-escalas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: `company_id=eq.${companyId}` }, () => loadAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_assignments' }, () => loadAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_calls' }, () => loadAllData())
      .subscribe();

    return () => {
      supabase.removeChannel(shiftsChannel);
    };
  }, [companyId, weekStart]);

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
    if (!companyId || isRefreshing) return;
    try {
      setIsRefreshing(true);
      setLoading(true);
      const end = new Date(weekStart);
      end.setDate(weekStart.getDate() + 7);

      const [statsData, shiftsData, employeesData, envsData, workActsData, resActivities, resServiceRequests] = await Promise.all([
        getShiftStats(companyId).catch(() => ({ total: 0, open: 0, inProgress: 0, concluded: '0/0' })),
        getShifts(companyId, weekStart.toISOString(), end.toISOString()).catch(() => []),
        getEmployeeProfiles(companyId).catch(() => []),
        supabase.from('work_environments').select('id, name').eq('company_id', companyId),
        supabase.from('work_activities').select('id, name, environment_id').eq('company_id', companyId),
        supabase.from('activities').select('id, name, description, status, created_at').eq('company_id', companyId),
        supabase.from('service_requests').select('id, customer_name, client_unit, service_type, status, created_at').eq('company_id', companyId)
      ]);

      setStats(statsData || { total: 0, open: 0, inProgress: 0, concluded: '0/0' });
      
      const rawActivities = [
        ...(resActivities.data || []).map(act => ({
          ...act,
          location: act.name || 'Atividade Geral',
          type: 'Rotina',
          description: act.description,
          created: act.created_at
        })),
        ...(resServiceRequests.data || []).map(sr => ({
          ...sr,
          location: sr.customer_name + ' (' + (sr.client_unit || '') + ')',
          type: sr.service_type,
          created: sr.created_at
        }))
      ];

      setShifts(shiftsData || []);
      setEmployees(employeesData || []);
      setEnvironments(envsData.data || []);
      setActivities(workActsData.data || []);
      
      const linkedIds = new Set((shiftsData || []).map(s => String(s.service_request_id)).filter(Boolean));
      const pending = rawActivities.filter(a => {
        const status = (a.status || '').toLowerCase();
        const isCompleted = status.includes('conclu') || status.includes('finalized');
        return !isCompleted && !linkedIds.has(String(a.id));
      }).sort((a, b) => new Date(b.created || b.created_at) - new Date(a.created || a.created_at));

      setPendingActivities(pending);
    } catch (err) {
      console.error('Error loading data:', err);
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
      console.log("Escala criada com sucesso!");
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
       console.log("Escala gerada com sucesso!");
     } catch (err) {
       console.error("Erro ao agendar atividade:", err);
       alert("Erro ao criar escala: " + err.message);
     } finally {
       setLoading(false);
     }
  };

  return (
    <div className="escalas-page animate-fade-in">
      <ShiftStats stats={stats} />

      <div className="shifts-main-layout relative">
        {loading && (
          <div className="loading-overlay-pixel">
             <Loader2 className="animate-spin text-accent" size={40} />
             <span>Sincronizando...</span>
          </div>
        )}

        <div className={`shifts-grid-area ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          <ShiftControls 
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            weekStart={weekStart}
            setWeekStart={setWeekStart}
            weekDays={weekDays}
            setIsModalOpen={setIsModalOpen}
          />

          <ShiftGrid 
            shifts={filteredShifts} 
            weekDays={weekDays} 
            onAddEmployee={(id) => setAssignmentModal({ isOpen: true, shiftId: id })} 
          />
        </div>

        <div className={`${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          <ShiftSidebar 
            pendingActivities={pendingActivities} 
            onQuickSchedule={handleQuickSchedule} 
          />
        </div>
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
