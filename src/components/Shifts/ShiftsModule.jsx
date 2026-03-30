import React, { useState, useMemo } from 'react';
import { Loader2, Search, ChevronDown, ChevronUp, Users, HardHat, UserX, Wand2 } from 'lucide-react';
import { addEmployeeToShift, moveShift } from '../../services/shiftService';
import { supabase } from '../../supabaseClient';
import { useShifts } from '../../hooks/useShifts';
import ShiftStats from './ShiftStats';
import ShiftSidebar from './ShiftSidebar';
import ShiftControls from './ShiftControls';
import ShiftGrid from './ShiftGrid';
import IntelligencePanel from './IntelligencePanel';
import ShiftCheckinModal from './ShiftCheckinModal';
import AutoPilotReview from './AutoPilotReview';
import { generateAutoPilotSchedule } from '../../services/aiSchedulingService';
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
  const [checkinModal, setCheckinModal] = useState({ isOpen: false, shift: null });
  const [autoPilotResult, setAutoPilotResult] = useState(null);
  const [isAutoPilotLoading, setIsAutoPilotLoading] = useState(false);
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

  const filteredShifts = useMemo(() => {
    return shifts.filter(s => {
      if (filterStatus === 'ativos') return s.status === 'in_progress' || s.status === 'open';
      if (filterStatus === 'concluidos') return s.status === 'concluded';
      return true;
    }).filter(s => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return s.work_environments?.name?.toLowerCase().includes(q) || 
             s.work_activities?.name?.toLowerCase().includes(q);
    });
  }, [shifts, filterStatus, searchQuery]);

  const fieldWorkers = useMemo(() => employees.filter(e => e.is_external === true), [employees]);
  const staffMembers = useMemo(() => employees.filter(e => e.is_external !== true), [employees]);

  // Optimized Search Filters for the Modal
  const { filteredFieldWorkers, filteredStaffMembers } = useMemo(() => {
    const term = searchTerm.toLowerCase();
    
    if (!term) {
      return { filteredFieldWorkers: fieldWorkers, filteredStaffMembers: staffMembers };
    }

    const matchEmp = (e) => 
      e.name.toLowerCase().includes(term) || 
      (e.skills && e.skills.some(s => s.toLowerCase().includes(term)));

    return {
      filteredFieldWorkers: fieldWorkers.filter(matchEmp),
      filteredStaffMembers: staffMembers.filter(e => e.name.toLowerCase().includes(term))
    };
  }, [fieldWorkers, staffMembers, searchTerm]);

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

  const handleRunAutoPilot = () => {
    setIsAutoPilotLoading(true);
    // Simulating a tiny delay for UX (shows the engine "thinking")
    setTimeout(() => {
      const result = generateAutoPilotSchedule({ pendingActivities, employees: fieldWorkers, existingShifts: shifts, weekStart });
      setAutoPilotResult(result);
      setIsAutoPilotLoading(false);
    }, 800);
  };

  const handleConfirmAutoPilot = async (suggestions) => {
    try {
      setIsSyncing(true);
      
      const insertPayload = suggestions.map(s => ({
        company_id: companyId,
        service_request_id: s.service_request_id,
        start_time: s.start_time,
        end_time: s.end_time,
        status: 'scheduled',
        notes: `Agendado por IA Auto-Pilot: Confiança ${s.confidence}%`
      }));

      // 1. Inserir Escalas
      const { data: newShifts, error: shiftErr } = await supabase.from('shifts').insert(insertPayload).select();
      if (shiftErr) throw shiftErr;

      // 2. Alocar Funcionários Sugeridos
      if (newShifts && newShifts.length > 0) {
         for (let i = 0; i < newShifts.length; i++) {
            const shift = newShifts[i];
            const suggestion = suggestions[i];
            await addEmployeeToShift(shift.id, suggestion.assigned_employee_id, true);
         }
      }

      setAutoPilotResult(null);
      await refresh();
      alert(`Auto-Pilot Concluído! ${suggestions.length} escalas geradas com sucesso.`);
    } catch (err) {
      console.error(err);
      alert("Erro ao aplicar lote Auto-Pilot: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const [newShiftData, setNewShiftData] = useState({
    environment_id: '',
    activity_id: '',
    start_time: '',
    end_time: ''
  });

  const availableActivitiesByEnvironment = newShiftData.environment_id 
    ? activities.filter(a => !a.environment_id || a.environment_id === newShiftData.environment_id)
    : activities;

  const handleCreateShift = async (e) => {
    e.preventDefault();
    if (!newShiftData.start_time || !newShiftData.end_time) {
      alert("Por favor, preencha as datas de início e fim obrigatórias.");
      return;
    }

    try {
      setIsSyncing(true);
      const { error } = await supabase.from('shifts').insert([{
        company_id: companyId,
        environment_id: newShiftData.environment_id || null,
        activity_id: newShiftData.activity_id || null,
        start_time: new Date(newShiftData.start_time).toISOString(),
        end_time: new Date(newShiftData.end_time).toISOString(),
        status: 'scheduled'
      }]);

      if (error) throw error;
      
      setIsModalOpen(false);
      setNewShiftData({ environment_id: '', activity_id: '', start_time: '', end_time: '' });
      await refresh();
    } catch (err) {
      alert("Erro ao criar escala: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSuggestTimes = () => {
    const start = new Date();
    start.setMinutes(start.getMinutes() > 30 ? 60 : 30, 0, 0);
    const end = new Date(start.getTime() + (4 * 60 * 60000));
    
    // Format to YYYY-MM-DDTHH:mm for datetime-local
    const format = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setNewShiftData(prev => ({
      ...prev,
      start_time: format(start),
      end_time: format(end)
    }));
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

  const handleDropActivity = async (activity, date, time) => {
    try {
      setIsSyncing(true);
      const startTime = new Date(date);
      if (time) {
        const [hours, minutes] = time.split(':');
        startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        startTime.setHours(8, 0, 0, 0); 
      }
      
      const endTime = new Date(startTime.getTime() + (4 * 60 * 60000));
      
      await supabase.from('shifts').insert([{
        company_id: companyId,
        service_request_id: activity.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
        notes: `Agendado via Arrastar e Soltar no horário ${time || '08:00'}`
      }]);

      await refresh();
    } catch (err) {
      alert("Erro ao criar escala via drop: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMoveShift = async (shiftId, newDate, newTime) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;

    const oldStart = new Date(shift.start_time);
    const oldEnd = new Date(shift.end_time);
    const durationMs = oldEnd - oldStart;

    const newStart = new Date(newDate);
    if (newTime) {
      const [hours, minutes] = newTime.split(':');
      newStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
    }
    const newEnd = new Date(newStart.getTime() + durationMs);

    const originalTimes = { start_time: shift.start_time, end_time: shift.end_time };

    updateShiftLocally(shiftId, { 
      start_time: newStart.toISOString(), 
      end_time: newEnd.toISOString() 
    });

    setIsSyncing(true);

    try {
      await moveShift(shiftId, newStart.toISOString(), newEnd.toISOString());
    } catch (err) {
      console.error("[MoveShift] ❌ Falha:", err);
      updateShiftLocally(shiftId, originalTimes); 
      alert("Erro ao mover escala: " + err.message);
    } finally {
      setIsSyncing(false);
      refresh().catch(() => {});
    }
  };

  return (
    <div className="escalas-page animate-fade-in premium-mode">
      <ShiftStats stats={stats} />

      <div className="shifts-main-layout relative">
        {/* Badge discreto de carregamento inicial — nunca bloqueia a UI */}
        {loading && (
          <div style={{
            position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', zIndex: 20,
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(0, 212, 255, 0.12)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            color: 'var(--accent-cyan)',
            padding: '5px 14px', borderRadius: '20px',
            fontSize: '0.75rem', fontWeight: 700, backdropFilter: 'blur(8px)'
          }}>
            <Loader2 size={13} className="animate-spin" /> Sincronizando...
          </div>
        )}

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

        <div className="shifts-grid-area">
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
            onCheckin={(shift) => setCheckinModal({ isOpen: true, shift })}
          />
        </div>

        <ShiftSidebar 
          pendingActivities={pendingActivities} 
          onQuickSchedule={handleQuickSchedule} 
          onAutoPilot={handleRunAutoPilot}
          isAutoPilotLoading={isAutoPilotLoading}
        />
      </div>

      {autoPilotResult && (
        <AutoPilotReview 
           result={autoPilotResult}
           onConfirm={handleConfirmAutoPilot}
           onCancel={() => setAutoPilotResult(null)}
           isProcessing={isSyncing}
        />
      )}

      {checkinModal.isOpen && (
        <ShiftCheckinModal 
          shift={checkinModal.shift} 
          currentUserEmail={currentUser} 
          onClose={() => setCheckinModal({ isOpen: false, shift: null })} 
          onSuccess={() => refresh()}
        />
      )}

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
                      {filteredFieldWorkers.length}
                    </span>
                  </div>
                  {expandedCategory === 'field' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                <div className={`accordion-content-premium ${expandedCategory === 'field' ? 'active' : ''}`}>
                  <div className="employee-grid-select">
                    {filteredFieldWorkers.map(emp => (
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
                    {filteredFieldWorkers.length === 0 && (
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
                      {filteredStaffMembers.length}
                    </span>
                  </div>
                  {expandedCategory === 'staff' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                <div className={`accordion-content-premium ${expandedCategory === 'staff' ? 'active' : ''}`}>
                  <div className="employee-grid-select">
                    {filteredStaffMembers.map(emp => (
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
                    {filteredStaffMembers.length === 0 && (
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

      {/* 📝 NEW SHIFT MODAL DESIGN REVOLUTION */}
      {isModalOpen && (
        <div className="modal-overlay-pixel glass-morphism">
          <div className="premium-modal-pixel animate-fade-in" style={{ width: '100%', maxWidth: '550px' }}>
            <div className="premium-modal-header border-vibrant">
              <div className="flex items-center gap-3">
                <div className="icon-badge-premium bg-blue-glow">
                   <Users className="text-accent-cyan" size={18} />
                </div>
                <h3>Agendar Nova Escala Inteligente</h3>
              </div>
              <button className="premium-close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
            <form className="modal-form p-8" onSubmit={handleCreateShift}>
              <div className="form-grid-premium mb-8">
                <div className="form-group-premium full-width">
                  <label className="premium-label flex items-center gap-2">
                    <Search size={14} className="text-accent-cyan" /> AMBIENTE DE TRABALHO
                  </label>
                  <div className="premium-input-wrapper">
                    <select 
                      name="environment_id" 
                      className="premium-input-field w-full"
                      value={newShiftData.environment_id}
                      onChange={(e) => setNewShiftData({...newShiftData, environment_id: e.target.value})}
                    >
                      <option value="">Selecione o local (Opcional)</option>
                      {environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <ChevronDown className="input-icon-right" size={16} />
                  </div>
                </div>

                <div className="form-group-premium full-width">
                  <label className="premium-label flex items-center gap-2">
                    <HardHat size={14} className="text-accent-cyan" /> ATIVIDADE RECOMENDADA
                  </label>
                  <div className="premium-input-wrapper">
                    <select 
                      name="activity_id" 
                      className="premium-input-field w-full"
                      value={newShiftData.activity_id}
                      onChange={(e) => setNewShiftData({...newShiftData, activity_id: e.target.value})}
                    >
                      <option value="">Selecione a atividade (Opcional)</option>
                      {availableActivitiesByEnvironment.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <ChevronDown className="input-icon-right" size={16} />
                  </div>
                </div>

                <div className="date-time-flex flex gap-4">
                  <div className="form-group-premium flex-1">
                    <label className="premium-label">INÍCIO</label>
                    <input 
                      name="start_time" 
                      type="datetime-local" 
                      required 
                      className="premium-input-field w-full"
                      value={newShiftData.start_time}
                      onChange={(e) => setNewShiftData({...newShiftData, start_time: e.target.value})}
                    />
                  </div>
                  <div className="form-group-premium flex-1">
                    <label className="premium-label">FIM ESTIMADO</label>
                    <input 
                      name="end_time" 
                      type="datetime-local" 
                      required 
                      className="premium-input-field w-full"
                      value={newShiftData.end_time}
                      onChange={(e) => setNewShiftData({...newShiftData, end_time: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="ai-suggestion-box mb-8 flex items-center justify-between" style={{ padding: '1.25rem' }}>
                <div className="flex items-center gap-3">
                  <div className="pulse-ai-dot"></div>
                  <p className="text-sm font-semibold" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Deseja que a IA sugira o melhor horário?</p>
                </div>
                <button 
                  type="button" 
                  className="btn-ask-brain mt-0"
                  onClick={handleSuggestTimes}
                >
                  <Wand2 size={16} />
                  Sugerir Horários
                </button>
              </div>

              <div className="modal-actions-premium flex justify-end gap-3 pt-6 border-t border-white/5">
                <button 
                  type="button" 
                  className="glow-btn-ghost py-3" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="glow-btn-primary py-3 px-8 flex items-center gap-2"
                  disabled={isSyncing}
                >
                  {isSyncing ? <Loader2 size={16} className="animate-spin" /> : null}
                  Criar Escala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
