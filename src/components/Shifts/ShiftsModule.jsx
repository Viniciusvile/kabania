import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { addEmployeeToShift } from '../../services/shiftService';
import { supabase } from '../../supabaseClient';
import { useShifts } from '../../hooks/useShifts';
import ShiftStats from './ShiftStats';
import ShiftSidebar from './ShiftSidebar';
import ShiftControls from './ShiftControls';
import ShiftGrid from './ShiftGrid';
import IntelligencePanel from './IntelligencePanel';
import './ShiftsRedesign.css';
import './ShiftsPremium.css';

export default function ShiftsModule({ companyId, currentUser, userRole }) {
  const { 
    stats, 
    shifts, 
    employees, 
    environments, 
    activities, 
    pendingActivities, 
    loading, 
    weekStart, 
    setWeekStart, 
    refresh 
  } = useShifts(companyId);

  const [filterStatus, setFilterStatus] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignmentModal, setAssignmentModal] = useState({ isOpen: false, shiftId: null });

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

  const handleAddEmployee = async (profileId, shiftId = null) => {
    const targetId = shiftId || assignmentModal.shiftId;
    if (!targetId) return;
    try {
      await addEmployeeToShift(targetId, profileId);
      setAssignmentModal({ isOpen: false, shiftId: null });
      await refresh();
    } catch (err) {
      alert("Erro ao adicionar colaborador: " + err.message);
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
      const { error } = await supabase.from('shifts').insert([newShift]);
      if (error) throw error;
      setIsModalOpen(false);
      await refresh();
    } catch (err) {
      alert("Erro ao criar escala: " + err.message);
    }
  };

  const handleQuickSchedule = async (activity) => {
     try {
       const startDate = activity.last_appointment ? new Date(activity.last_appointment) : new Date();
       const endDate = new Date(startDate.getTime() + (60 * 60000));
       
       await supabase.from('shifts').insert([{
         company_id: companyId,
         service_request_id: activity.id,
         start_time: startDate.toISOString(),
         end_time: endDate.toISOString(),
         status: 'scheduled',
         notes: `Agendado via Inteligência Kabania`
       }]);

       await refresh();
     } catch (err) {
       alert("Erro ao criar escala: " + err.message);
     }
  };

  return (
    <div className="escalas-page animate-fade-in premium-mode">
      <ShiftStats stats={stats} />

      <div className="shifts-main-layout relative">
        <div className={`loading-overlay-pixel ${loading ? 'active' : ''}`}>
           <Loader2 className="animate-spin text-accent" size={40} />
           <span>Sincronizando Banco de Dados...</span>
        </div>

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

        <ShiftSidebar 
          pendingActivities={pendingActivities} 
          onQuickSchedule={handleQuickSchedule} 
        />
      </div>

      {/* 🤝 ASSIGNMENT MODAL */}
      {assignmentModal.isOpen && (
        <div className="modal-overlay-pixel glass-morphism">
          <div className="modal-content-pixel assignment-modal animate-slide-up">
            <div className="modal-header">
              <h3>Direcionar para Colaboradores</h3>
              <button className="btn-close" onClick={() => setAssignmentModal({ isOpen: false, shiftId: null })}>×</button>
            </div>
            
            <div className="assignment-tabs">
              <div className="role-section">
                <h4>👷 Colaboradores de Campo</h4>
                <div className="employee-grid-select">
                  {fieldWorkers.map(emp => (
                    <div key={emp.id} className="emp-select-card glass-morphism" onClick={() => handleAddEmployee(emp.shift_profile_id || emp.id)}>
                      <div className="emp-avatar-medium">
                        {emp.avatar_url ? <img src={emp.avatar_url} alt="" /> : <span>{emp.name[0]}</span>}
                      </div>
                      <div className="emp-info">
                        <span className="emp-name">{emp.name}</span>
                        <div className="emp-skills-preview">
                          {emp.skills?.slice(0, 2).map(s => <span key={s} className="skill-mini-tag">{s}</span>)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="role-section mt-4">
                <h4>👥 Membros da Equipe</h4>
                <div className="employee-grid-select">
                  {staffMembers.map(emp => (
                    <div key={emp.id} className="emp-select-card glass-morphism" onClick={() => handleAddEmployee(emp.shift_profile_id || emp.id)}>
                      <div className="emp-avatar-medium">
                        {emp.avatar_url ? <img src={emp.avatar_url} alt="" /> : <span>{emp.name[0]}</span>}
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
        <div className="modal-overlay-pixel glass-morphism">
          <div className="modal-content-pixel animate-fade-in">
            <div className="modal-header">
              <h3>Agendar Nova Escala Inteligente</h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form className="modal-form" onSubmit={handleCreateShift}>
              <div className="form-group">
                <label>Ambiente de Trabalho</label>
                <select name="environment_id" required className="premium-input">
                  <option value="">Selecione o local</option>
                  {environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Atividade Recomendada</label>
                <select name="activity_id" required className="premium-input">
                  <option value="">Selecione a atividade</option>
                  {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Início</label>
                  <input name="start_time" type="datetime-local" required className="premium-input" />
                </div>
                <div className="form-group">
                  <label>Fim Estimado</label>
                  <input name="end_time" type="datetime-local" required className="premium-input" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-save premium-btn">Criar Escala</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
