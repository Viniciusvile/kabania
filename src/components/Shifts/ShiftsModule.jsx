import React, { useState, useMemo, useEffect } from 'react';
import { Loader2, Search, ChevronDown, ChevronUp, Users, HardHat, UserX, Wand2 } from 'lucide-react';
import { addEmployeeToShift, moveShift, createShift, deleteShift } from '../../services/shiftService';
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
    addShiftLocally,
    updateShiftLocally,
    removeShiftLocally
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
  const [kanbanTasks, setKanbanTasks] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, shiftId: null });

  // ── Busca Kanban tasks de todos projetos da empresa ──────────────────
  useEffect(() => {
    const fetchKanbanTasks = async () => {
      if (!companyId) return;
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, description, column_id, tag, deadline, assignees, customer_name')
        .eq('company_id', companyId)
        .in('column_id', ['backlog', 'todo', 'progress']);
      if (!error && data) {
        setKanbanTasks(data.map(t => ({ ...t, source: 'kanban', desc: t.description })));
      }
    };
    fetchKanbanTasks();
  }, [companyId]);

  // Workspace mostra APENAS os cards do Kanban (backlog, todo, in progress)
  const workspaceItems = useMemo(() => [...kanbanTasks], [kanbanTasks]);

  const handleDeleteShift = (shiftId) => {
    // Abre modal customizado em vez de window.confirm (que é bloqueado em dev/localhost)
    setConfirmModal({ isOpen: true, shiftId });
  };

  const handleConfirmDelete = async () => {
    const shiftId = confirmModal.shiftId;
    setConfirmModal({ isOpen: false, shiftId: null });
    if (!shiftId) return;

    // Atualiza UI imediatamente (otimista)
    removeShiftLocally(shiftId);
    setIsSyncing(true);

    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId);

      if (error) {
        console.error('[deleteShift] Erro no banco:', error);
        refresh();
        alert('Erro ao excluir: ' + (error.message || 'Verifique permissões no banco.'));
      }
    } catch (err) {
      console.error('[deleteShift] Exceção:', err);
      refresh();
      alert('Erro ao excluir: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

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
      const { data: newShifts, error: shiftErr } = await createShift(insertPayload, currentUser);
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
      if (addShiftLocally && newShifts) addShiftLocally(newShifts);
      
      // Não precisamos mais do refresh circular global
      // await refresh(); 
      
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
      
      // DIAGNOSTIC LOGGING: Confirm current context before write
      console.log("[CreateShift] Payload Início:", {
        companyId,
        environment_id: newShiftData.environment_id,
        user: currentUser
      });

      const data = await createShift({
        company_id: companyId,
        environment_id: newShiftData.environment_id || null,
        activity_id: newShiftData.activity_id || null,
        start_time: new Date(newShiftData.start_time).toISOString(),
        end_time: new Date(newShiftData.end_time).toISOString(),
        status: 'scheduled'
      }, currentUser);
      
      setIsModalOpen(false);
      setNewShiftData({ environment_id: '', activity_id: '', start_time: '', end_time: '' });
      
      // Injeção Instantânea
      if (addShiftLocally && data) addShiftLocally(data);
      
      // await refresh(); // Removido para ganho de velocidade instantânea
    } catch (err) {
      const detailedMsg = err.details ? `\nDetalhe: ${err.details}` : '';
      const codeMsg = err.code ? ` [Código: ${err.code}]` : '';
      alert(`Erro ao criar escala:${codeMsg}\n${err.message}${detailedMsg}\n\nDICA: Tente atualizar a página (F5) para sincronizar seu perfil.`);
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
      
      await createShift({
        company_id: companyId,
        service_request_id: activity.id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'scheduled',
        notes: `Agendado via Inteligência Kabania`
      }, currentUser);

      await refresh();
    } catch (err) {
      alert("Erro ao criar escala: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDropActivity = async (activity, date, time, environmentId = null) => {
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
      
      // Prioridade de Ambiente: 
      // 1. Alvo do Drop (environmentId)
      // 2. Original da Atividade/Service Request
      const targetEnvId = environmentId || activity.environment_id || activity.work_environments?.id;

      // 🔄 Lógica de Reconhecimento de Tipo Unificada
      const isKanban = activity.source === 'kanban';
      const isServiceRequest = !isKanban && (activity.source === 'service_request' || !!activity.customer_name);
      const isActivity = !isKanban && activity.source === 'activity';

      // Monta a nota descritiva com o título do card (Kanban não tem FK compatível com shifts)
      const label = activity.title || activity.location || activity.name || 'Tarefa';
      
      const payload = {
        company_id: companyId,
        environment_id: targetEnvId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
        notes: isKanban
          ? `Agendado via Workspace (Kanban): ${label}`
          : `Agendado via Drag & Drop: ${activity.location || activity.name}`
      };

      console.log("[handleDropActivity] Payload construído:", {
        id: activity.id,
        source: activity.source,
        isKanban,
        isServiceRequest,
        isActivity,
        targetEnvId
      });

      if (isServiceRequest) {
        // Vincula a solicitações de serviço externas
        payload.service_request_id = activity.id;
      } else if (isActivity) {
        // Vincula a atividades do catálogo (rotinas)
        payload.activity_id = activity.id;
      }
      // Cards do Kanban (isKanban) não vinculam FK — apenas geram escala com notes descritivas

      const data = await createShift(payload, currentUser);
      
      if (data && addShiftLocally) {
        addShiftLocally(data);
      }
      
      // await refresh(); // Usando injeção instantânea
    } catch (err) {
      alert("Erro ao criar escala via drop: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMoveShift = (shiftId, newDate, newTime) => {
    console.log("[MoveShift] Iniciando mudança:", { shiftId, newDate, newTime });
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

    // 1. Instant Optimistic Update
    updateShiftLocally(shiftId, { 
      start_time: newStart.toISOString(), 
      end_time: newEnd.toISOString() 
    });

    // 2. Background Sync (Silent)
    moveShift(shiftId, newStart.toISOString(), newEnd.toISOString(), shift.environment_id)
      .then(result => {
        if (!result) throw new Error("Sem confirmação do servidor.");
        console.log("[MoveShift] ✅ Sincronizado Silenciosamente:", shiftId);
        // Garantir que os dados estão 100% atualizados no hook
        if (refresh) refresh();
      })
      .catch(err => {
        console.error("[MoveShift] ❌ Falha na sincronização:", err);
        // Só alertamos o usuário se realmente falhar no banco
        updateShiftLocally(shiftId, originalTimes); 
        alert("Erro ao salvar mudança. A escala voltou para a posição original.");
        if (refresh) refresh();
      });
  };

  return (
    <div className="escalas-page animate-fade-in premium-mode">
      <ShiftStats stats={stats} />

      <div className="shifts-main-layout relative">
        {/* ✅ MINIMALIST SYNC INDICATOR (ANTI-ANXIETY) */}
        <style>{`
          .sync-status-minimal {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            font-weight: 800;
            color: rgba(0, 229, 255, 0.8);
            background: rgba(0, 229, 255, 0.04);
            padding: 6px 14px;
            border-radius: 100px;
            opacity: 0;
            transform: translateY(-5px);
            transition: all 0.4s ease;
            pointer-events: none;
            border: 1px solid rgba(0, 229, 255, 0.15);
            backdrop-filter: blur(8px);
          }

          .sync-status-minimal.visible {
            opacity: 1;
            transform: translateY(0);
          }

          .sync-pulse-dot {
            width: 6px;
            height: 6px;
            background: var(--accent-cyan);
            border-radius: 50%;
            box-shadow: 0 0 8px var(--accent-cyan);
            animation: sync-pulse 1.5s infinite;
          }

          @keyframes sync-pulse {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.4); opacity: 0.4; }
            100% { transform: scale(1); opacity: 0.8; }
          }

          [data-theme='light'] .sync-status-minimal {
            background: rgba(0, 229, 255, 0.08);
            color: #0891b2;
            border-color: rgba(0, 229, 255, 0.2);
          }
        `}</style>

        <div className="shifts-grid-area">
          <div className="flex items-center gap-4">
            <h2 className="shifts-title-premium">Gerenciar Escalas</h2>
            {/* Indicador Minimalista de Sincronia */}
            <div className={`sync-status-minimal ${isSyncing ? 'visible' : ''}`}>
              <div className="sync-pulse-dot" />
              <span>Sincronizando...</span>
            </div>
          </div>

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
            onDeleteShift={handleDeleteShift}
          />
        </div>

        <ShiftSidebar 
          pendingActivities={workspaceItems} 
          routineActivities={activities}
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

      {/* 🗑️ MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (substitui window.confirm) */}
      {confirmModal.isOpen && (
        <div className="modal-overlay-pixel glass-morphism" style={{ zIndex: 9999 }}>
          <div className="premium-modal-pixel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ 
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <span style={{ fontSize: '24px' }}>🗑️</span>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Excluir Escala</h3>
              <p style={{ fontSize: '13px', opacity: 0.6 }}>Tem certeza que deseja excluir esta escala? Esta ação não pode ser desfeita.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="glow-btn-ghost py-3"
                style={{ flex: 1 }}
                onClick={() => setConfirmModal({ isOpen: false, shiftId: null })}
              >
                Cancelar
              </button>
              <button
                className="glow-btn-primary py-3"
                style={{ flex: 1, background: 'rgba(239,68,68,0.8)', boxShadow: '0 4px 15px rgba(239,68,68,0.3)' }}
                onClick={handleConfirmDelete}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
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
