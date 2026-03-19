import React, { useState } from 'react';
import { Loader2, Search, ChevronDown, ChevronUp, Users, HardHat, UserX } from 'lucide-react';
import { addEmployeeToShift, moveShift } from '../../services/shiftService';
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
    refresh,
    updateShiftLocally
  } = useShifts(companyId);

  const [filterStatus, setFilterStatus] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignmentModal, setAssignmentModal] = useState({ isOpen: false, shiftId: null });
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState('field');

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

  const fieldWorkers = employees.filter(e => e.is_external === true);
  const staffMembers = employees.filter(e => e.is_external !== true);

  const handleAddEmployee = async (profileId, shiftId = null, isExternal = false) => {
    const targetId = shiftId || assignmentModal.shiftId;
    if (!targetId) return;
    try {
      setIsSyncing(true);
      
      // Optimistic personnel addition
      const emp = employees.find(e => (e.shift_profile_id || e.id) === profileId);
      if (emp) {
        updateShiftLocally(targetId, {
          assigned_employees: [
            ...(shifts.find(s => s.id === targetId)?.assigned_employees || []),
            { ...emp, name: emp.name }
          ]
        });
      }

      await addEmployeeToShift(targetId, profileId, isExternal);
      setAssignmentModal({ isOpen: false, shiftId: null });
      await refresh();
      // Optional: success toast could go here
    } catch (err) {
      console.error("Erro detalhado de atribuição:", err);
      const msg = err.message || "Erro desconhecido";
      if (msg.includes("collaborator_id")) {
        alert("🚨 ERRO DE BANCO: A coluna 'collaborator_id' não foi encontrada. Por favor, execute o script 'fix_assignment_external.sql' no seu painel Supabase para ativar esta função.");
      } else {
        alert("Erro ao adicionar colaborador: " + msg);
      }
    } finally {
      setIsSyncing(false);
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
      setIsSyncing(true);
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
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDropActivity = async (activity, date) => {
    try {
      setIsSyncing(true);
      const startTime = new Date(date);
      startTime.setHours(8, 0, 0, 0); 
      const endTime = new Date(startTime.getTime() + (4 * 60 * 60000));
      
      await supabase.from('shifts').insert([{
        company_id: companyId,
        service_request_id: activity.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
        notes: `Agendado via Arrastar e Soltar`
      }]);

      await refresh();
    } catch (err) {
      alert("Erro ao criar escala via drop: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMoveShift = async (shiftId, newDate) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;

    const oldStart = new Date(shift.start_time);
    const oldEnd = new Date(shift.end_time);
    const durationMs = oldEnd - oldStart;

    const newStart = new Date(newDate);
    newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);

    const originalTimes = { start_time: shift.start_time, end_time: shift.end_time };

    // Update otimista IMEDIATO — card se move sem esperar o banco
    updateShiftLocally(shiftId, { 
      start_time: newStart.toISOString(), 
      end_time: newEnd.toISOString() 
    });

    // Badge discreto "Salvando..."
    setIsSyncing(true);

    try {
      await moveShift(shiftId, newStart.toISOString(), newEnd.toISOString());
      console.log("[MoveShift] ✅ Banco salvo.");
    } catch (err) {
      console.error("[MoveShift] ❌ Falha:", err);
      updateShiftLocally(shiftId, originalTimes); // rollback
      alert("Erro ao mover escala: " + err.message);
    } finally {
      setIsSyncing(false);
      // Refresh silencioso em background
      refresh().catch(() => {});
    }
  };

  return (
    <div className="escalas-page animate-fade-in premium-mode">
      <ShiftStats stats={stats} />

      <div className="shifts-main-layout relative">
        <div className={`loading-overlay-pixel ${loading && !shifts.length ? 'active' : ''}`}>
           <Loader2 className="animate-spin text-accent" size={40} />
           <span>Carregando Escalas...</span>
        </div>

        {/* Badge discreto de sync — não bloqueia a UI */}
        {isSyncing && (
          <div style={{
            position: 'absolute', top: '8px', right: '12px', zIndex: 10,
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(0, 212, 255, 0.12)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            color: 'var(--accent-cyan)',
            padding: '4px 10px', borderRadius: '20px',
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em'
          }}>
            <Loader2 size={11} className="animate-spin" /> Salvando...
          </div>
        )}

        <div className={`shifts-grid-area ${loading && !shifts.length ? 'opacity-50 pointer-events-none' : ''}`}>
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
            onDropActivity={handleDropActivity}
            onMoveShift={handleMoveShift}
            onRefresh={refresh}
            updateShiftLocally={updateShiftLocally}
            isSyncing={isSyncing}
            setIsSyncing={setIsSyncing}
          />
        </div>

        <ShiftSidebar 
          pendingActivities={pendingActivities} 
          onQuickSchedule={handleQuickSchedule} 
        />
      </div>

      {/* 🤝 ASSIGNMENT MODAL OVERHAUL */}
      {assignmentModal.isOpen && (
        <div className="modal-overlay-pixel glass-morphism">
          <div className="premium-modal-pixel assignment-modal animate-slide-up" style={{ width: '90%', maxWidth: '500px', height: 'auto', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="premium-modal-header">
              <div className="flex items-center gap-2">
                <Users className="text-accent" size={20} />
                <h3>Direcionar para Colaboradores</h3>
              </div>
              <button className="premium-close-btn" onClick={() => { setAssignmentModal({ isOpen: false, shiftId: null }); setSearchTerm(''); }}>×</button>
            </div>

            <div className="assignment-search-container py-4 px-6">
              <div className="premium-search-input-wrapper">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar colaborador ou habilidade..." 
                  className="premium-search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            
            <div className="assignment-tabs flex-1 overflow-y-auto custom-scrollbar">
              {/* SECTION: FIELD WORKERS */}
              <div className="accordion-section-premium">
                <button 
                  className={`accordion-header-premium ${expandedCategory === 'field' ? 'active' : ''}`}
                  onClick={() => setExpandedCategory(expandedCategory === 'field' ? '' : 'field')}
                >
                  <div className="header-left">
                    <HardHat size={18} />
                    <h4>Colaboradores de Campo</h4>
                    <span className="pending-badge-glow" style={{ fontSize: '0.6rem', padding: '1px 6px', opacity: 0.8 }}>
                      {fieldWorkers.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).length}
                    </span>
                  </div>
                  {expandedCategory === 'field' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                <div className={`accordion-content-premium ${expandedCategory === 'field' ? 'active' : ''}`}>
                  <div className="employee-grid-select">
                    {fieldWorkers
                      .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.skills?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())))
                      .map(emp => (
                      <div key={emp.profile_id} className="assignment-emp-card pulse-on-hover" onClick={() => handleAddEmployee(emp.shift_profile_id || emp.profile_id, null, emp.is_external)}>
                        <div className="emp-avatar-premium">
                          {emp.avatar_url ? <img src={emp.avatar_url} alt="" /> : <span>{emp.name[0]}</span>}
                        </div>
                        <div className="emp-details-premium">
                          <span className="emp-name-premium">{emp.name}</span>
                          <div className="emp-skills-preview flex gap-1 mt-1">
                            {emp.skills?.slice(0, 2).map(s => <span key={s} className="skill-mini-tag">{s}</span>)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {fieldWorkers.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                      <div className="empty-state-premium">
                        <UserX className="empty-state-icon" size={32} />
                        <p>Nenhum colaborador de campo encontrado.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION: STAFF MEMBERS */}
              <div className="accordion-section-premium">
                <button 
                  className={`accordion-header-premium ${expandedCategory === 'staff' ? 'active' : ''}`}
                  onClick={() => setExpandedCategory(expandedCategory === 'staff' ? '' : 'staff')}
                >
                  <div className="header-left">
                    <Users size={18} />
                    <h4>Membros da Equipe</h4>
                    <span className="pending-badge-glow" style={{ fontSize: '0.6rem', padding: '1px 6px', opacity: 0.8 }}>
                      {staffMembers.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).length}
                    </span>
                  </div>
                  {expandedCategory === 'staff' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                <div className={`accordion-content-premium ${expandedCategory === 'staff' ? 'active' : ''}`}>
                  <div className="employee-grid-select">
                    {staffMembers
                      .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(emp => (
                      <div key={emp.profile_id} className="assignment-emp-card pulse-on-hover" onClick={() => handleAddEmployee(emp.shift_profile_id || emp.profile_id, null, emp.is_external)}>
                        <div className="emp-avatar-premium">
                          {emp.avatar_url ? <img src={emp.avatar_url} alt="" /> : <span>{emp.name[0]}</span>}
                        </div>
                        <div className="emp-details-premium">
                          <span className="emp-name-premium">{emp.name}</span>
                          <span className="emp-role-premium">{emp.role}</span>
                        </div>
                      </div>
                    ))}
                    {staffMembers.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                      <div className="empty-state-premium">
                        <UserX className="empty-state-icon" size={32} />
                        <p>Nenhum membro da equipe encontrado.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📝 NEW SHIFT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay-pixel glass-morphism">
          <div className="premium-modal-pixel animate-fade-in" style={{ width: '100%', maxWidth: '500px' }}>
            <div className="premium-modal-header">
              <h3>Agendar Nova Escala Inteligente</h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form className="modal-form p-6" onSubmit={handleCreateShift}>
              <div className="form-group mb-4">
                <label className="premium-label">Ambiente de Trabalho</label>
                <select name="environment_id" required className="premium-input-field w-full">
                  <option value="">Selecione o local</option>
                  {environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="form-group mb-4">
                <label className="premium-label">Atividade Recomendada</label>
                <select name="activity_id" required className="premium-input-field w-full">
                  <option value="">Selecione a atividade</option>
                  {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="flex gap-4 mb-6">
                <div className="form-group flex-1">
                  <label className="premium-label">Início</label>
                  <input name="start_time" type="datetime-local" required className="premium-input-field w-full" />
                </div>
                <div className="form-group flex-1">
                  <label className="premium-label">Fim Estimado</label>
                  <input name="end_time" type="datetime-local" required className="premium-input-field w-full" />
                </div>
              </div>
              <div className="modal-actions flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" className="glow-btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="glow-btn-primary">Criar Escala</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
