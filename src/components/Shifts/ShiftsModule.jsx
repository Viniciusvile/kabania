import React, { useState, useMemo, useEffect } from 'react';
import { Loader2, Search, ChevronDown, ChevronUp, ChevronRight, Users, HardHat, UserX } from 'lucide-react';
import { addEmployeeToShift, moveShift, createShift, deleteShift, updateShift, replaceEmployeeInShift } from '../../services/shiftService';
import { supabase } from '../../supabaseClient';
import { useShifts } from '../../hooks/useShifts';
import ShiftStats from './ShiftStats';
import ShiftSidebar from './ShiftSidebar';
import ShiftControls from './ShiftControls';
import ShiftGrid from './ShiftGrid';
import IntelligencePanel from './IntelligencePanel';
import ShiftCheckinModal from './ShiftCheckinModal';
import AutoPilotReview from './AutoPilotReview';
import HoursReport from './HoursReport';
import ShiftSwapMarketplace from './ShiftSwapMarketplace';
import { generateAutoPilotSchedule } from '../../services/aiSchedulingService';
import './ShiftsRedesign.css';
import './ShiftsPremium.css';

export default function ShiftsModule({ 
  companyId, 
  currentUser, 
  userRole, 
  crmFuncionarios = [], 
  crmOcorrencias = [], 
  selectedCondominioId = null, 
  selectedCondominioNome = null 
}) {
  const { 
    stats, 
    shifts, 
    employees: dbEmployees, 
    environments, 
    activities, 
    pendingActivities, 
    loading, 
    weekStart, 
    setWeekStart, 
    refresh,
    addShiftLocally,
    updateShiftLocally,
    removeShiftLocally,
    removePendingLocally,
    addPendingLocally
  } = useShifts(companyId);

  const employees = useMemo(() => {
    const local = dbEmployees || [];
    const crmMapped = (crmFuncionarios || []).map(f => {
      const id = `crm-func-${f.id}`;
      return {
        id: id,
        shift_profile_id: id,
        profile_id: id,
        name: f.nome,
        role: `${f.funcao} (${f.escala})`,
        is_external: f.tipo === 'Portaria' || f.tipo === 'Administrativo/Operacional',
        skills: [f.tipo, f.escala, f.condominio_nome],
        condominio_id: f.condominio_id,
        condominio_nome: f.condominio_nome,
        source: 'crm',
        ativo: f.ativo
      };
    });
    
    const merged = [...local, ...crmMapped];
    if (selectedCondominioId && selectedCondominioNome) {
      const selectedNomeLower = selectedCondominioNome.toLowerCase();
      return merged.filter(e => 
        String(e.condominio_id) === String(selectedCondominioId) ||
        (e.condominio_nome && e.condominio_nome.toLowerCase() === selectedNomeLower) ||
        !e.id?.toString().startsWith('crm-')
      );
    }
    return merged;
  }, [dbEmployees, crmFuncionarios, selectedCondominioId, selectedCondominioNome]);

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
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [kanbanTasks, setKanbanTasks] = useState(() => {
    try {
      const cached = localStorage.getItem(`kanban_tasks_cache_${companyId}`);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, shiftId: null });
  const [showHoursReport, setShowHoursReport] = useState(false);
  const [showSwapMarketplace, setShowSwapMarketplace] = useState(false);

  // ── Helper: Extrai ID do Kanban das notas ────────────────────────────
  const getKanbanId = (notes) => {
    if (!notes) return null;
    const match = notes.match(/\[KANBAN_ID:([^\]]*)\]/);
    return match ? match[1].trim() : null;
  };

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
        const transformed = data.map(t => ({ ...t, source: 'kanban', desc: t.description }));
        setKanbanTasks(transformed);
        localStorage.setItem(`kanban_tasks_cache_${companyId}`, JSON.stringify(transformed));
      }
    };
    fetchKanbanTasks();
  }, [companyId]);

  // ── Ler contexto de navegação do Kanban ──────────────────────────────
  const [kanbanToShift, setKanbanToShift] = useState(() => {
    try {
      const raw = sessionStorage.getItem('kanban_to_shift');
      if (raw) { sessionStorage.removeItem('kanban_to_shift'); return JSON.parse(raw); }
    } catch (_) {}
    return null;
  });

  // Quando vem do Kanban, abre modal de nova escala com dados pré-preenchidos
  useEffect(() => {
    if (kanbanToShift) {
      // Pequeno delay para garantir que o módulo carregou
      const t = setTimeout(() => setIsModalOpen(true), 400);
      return () => clearTimeout(t);
    }
  }, [kanbanToShift]);
  // ─────────────────────────────────────────────────────────────────────

  // Merge local Kanban tasks and CRM occurrences
  const mergedKanbanTasks = useMemo(() => {
    const crmTasks = (crmOcorrencias || []).map(o => ({
      id: `crm-oc-${o.id}`,
      title: o.categoria || 'Ocorrência',
      desc: o.descricao,
      column_id: o.status === 'Pendente' ? 'backlog' : 'done',
      tag: o.categoria,
      customer_name: o.condominio_nome,
      condominio_id: o.condominio_id,
      source: 'crm',
      is_external: true,
      severidade: o.severidade
    }));

    const combined = [...kanbanTasks, ...crmTasks];

    if (selectedCondominioId && selectedCondominioNome) {
      const selectedNomeLower = selectedCondominioNome.toLowerCase();
      return combined.filter(t => 
        String(t.condominio_id) === String(selectedCondominioId) ||
        (t.customer_name && t.customer_name.toLowerCase() === selectedNomeLower)
      );
    }
    return combined;
  }, [kanbanTasks, crmOcorrencias, selectedCondominioId, selectedCondominioNome]);

  // Workspace mostra os cards do Kanban enriquecidos com status de agendamento
  const workspaceItems = useMemo(() => {
    return mergedKanbanTasks
      .map(task => {
        const isScheduled = shifts.some(s => s.notes?.includes(`[KANBAN_ID:${task.id}]`));
        return { ...task, isScheduled, source: 'kanban' }; // Garante source: 'kanban'
      })
      .filter(task => !task.isScheduled); 
  }, [mergedKanbanTasks, shifts]);

  // ── Separação de Atividades Pendentes (Solicitações vs Rotinas) ───────
  const { sidebarServiceRequests, sidebarRoutines } = useMemo(() => {
    let srs = pendingActivities.filter(p => p.source === 'service_request');
    let routines = pendingActivities.filter(p => p.source === 'activity');

    if (selectedCondominioId && selectedCondominioNome) {
      const selectedNomeLower = selectedCondominioNome.toLowerCase();
      srs = srs.filter(p => 
        String(p.condominio_id) === String(selectedCondominioId) ||
        (p.customer_name && p.customer_name.toLowerCase() === selectedNomeLower) ||
        (p.location && p.location.toLowerCase().includes(selectedNomeLower))
      );
      routines = routines.filter(p => 
        String(p.condominio_id) === String(selectedCondominioId) ||
        (p.customer_name && p.customer_name.toLowerCase() === selectedNomeLower) ||
        (p.location && p.location.toLowerCase().includes(selectedNomeLower))
      );
    }

    return {
      sidebarServiceRequests: srs,
      sidebarRoutines: routines
    };
  }, [pendingActivities, selectedCondominioId, selectedCondominioNome]);

  const unifiedWorkspaceItems = useMemo(() => {
    return [...workspaceItems, ...sidebarServiceRequests];
  }, [workspaceItems, sidebarServiceRequests]);

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
      const { error } = await deleteShift(shiftId, companyId);

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

  const formatForInput = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleEditShift = (shift) => {
    setEditingShiftId(shift.id);
    const assigned = shift.assigned_employees?.[0];
    setNewShiftData({
      environment_id: shift.environment_id || '',
      activity_id: shift.activity_id || '',
      assigned_employee_id: assigned?.employee_id || assigned?.collaborator_id || '',
      is_external: !!assigned?.collaborator_id,
      start_time: formatForInput(shift.start_time),
      end_time: formatForInput(shift.end_time)
    });
    setIsModalOpen(true);
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

  const handlePrevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const handleNextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  // Enrich shifts with CRM employee assignments parsed from notes
  const processedShifts = useMemo(() => {
    return shifts.map(shift => {
      const match = shift.notes?.match(/\[CRM_EMPLOYEE_ID:([^\]]*)\]/);
      if (match) {
        const crmEmpId = `crm-func-${match[1].trim()}`;
        const crmEmp = (crmFuncionarios || []).find(f => `crm-func-${f.id}` === crmEmpId);
        if (crmEmp) {
          const alreadyAssigned = shift.assigned_employees?.some(e => e.id === crmEmpId);
          if (!alreadyAssigned) {
            const assigned = [
              ...(shift.assigned_employees || []),
              {
                id: crmEmpId,
                employee_id: crmEmpId,
                name: crmEmp.nome,
                role: `${crmEmp.funcao} (${crmEmp.escala})`,
                is_external: true,
                skills: [crmEmp.tipo, crmEmp.escala, crmEmp.condominio_nome],
                avatar_url: null,
                condominio_id: crmEmp.condominio_id,
                condominio_nome: crmEmp.condominio_nome
              }
            ];
            return { ...shift, assigned_employees: assigned };
          }
        }
      }
      return shift;
    });
  }, [shifts, crmFuncionarios]);

  const filteredShifts = useMemo(() => {
    let result = processedShifts;

    // Filter by Condominium
    if (selectedCondominioId && selectedCondominioNome) {
      const selectedNomeLower = selectedCondominioNome.toLowerCase();
      result = result.filter(s => {
        // 1. Check if any assigned employee matches the condominio_id or condominio_nome
        const matchesEmployee = s.assigned_employees?.some(e => 
          String(e.condominio_id) === String(selectedCondominioId) ||
          (e.condominio_nome && e.condominio_nome.toLowerCase() === selectedNomeLower)
        );
        if (matchesEmployee) return true;

        // 2. Check if the environment name matches the condominium name
        const envName = s.work_environments?.name || '';
        if (envName.toLowerCase().includes(selectedNomeLower)) return true;

        // 3. Check if notes has a KANBAN_ID of a task that matches the condominium
        const kanbanId = getKanbanId(s.notes);
        if (kanbanId) {
          const linkedTask = mergedKanbanTasks.find(t => t.id === kanbanId);
          if (linkedTask) {
            if (String(linkedTask.condominio_id) === String(selectedCondominioId) ||
                (linkedTask.customer_name && linkedTask.customer_name.toLowerCase() === selectedNomeLower)) {
              return true;
            }
          }
        }

        // 4. Check if the notes text itself contains the condominium name
        if (s.notes && s.notes.toLowerCase().includes(selectedNomeLower)) return true;

        return false;
      });
    }

    // Filter by status and search query
    return result.filter(s => {
      if (filterStatus === 'ativos') return s.status === 'in_progress' || s.status === 'open';
      if (filterStatus === 'concluidos') return s.status === 'concluded';
      return true;
    }).filter(s => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return s.work_environments?.name?.toLowerCase().includes(q) || 
             s.work_activities?.name?.toLowerCase().includes(q) ||
             s.notes?.toLowerCase().includes(q);
    });
  }, [processedShifts, selectedCondominioId, selectedCondominioNome, filterStatus, searchQuery, mergedKanbanTasks]);

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

      if (profileId && profileId.toString().startsWith('crm-func-')) {
        const shift = shifts.find(s => s.id === targetId);
        if (shift) {
          let cleanedNotes = (shift.notes || '').replace(/\[CRM_EMPLOYEE_ID:[^\]]*\]/g, '').trim();
          const rawCrmId = profileId.replace('crm-func-', '');
          const newNotes = cleanedNotes ? `${cleanedNotes} [CRM_EMPLOYEE_ID:${rawCrmId}]` : `[CRM_EMPLOYEE_ID:${rawCrmId}]`;

          updateShiftLocally(targetId, {
            notes: newNotes,
            assigned_employees: [
              ...(shift.assigned_employees || []).filter(e => !e.id?.toString().startsWith('crm-func-')),
              {
                id: profileId,
                employee_id: profileId,
                name: emp?.name || 'Colaborador CRM',
                role: emp?.role || 'Zelador',
                is_external: true,
                skills: emp?.skills || [],
                avatar_url: null,
                condominio_id: emp?.condominio_id,
                condominio_nome: emp?.condominio_nome
              }
            ]
          });

          await supabase.from('shift_assignments').delete().eq('shift_id', targetId);
          await updateShift(targetId, { notes: newNotes }, currentUser);
        }
        setAssignmentModal({ isOpen: false, shiftId: null });
        return;
      }

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
      // await refresh(); // Sincronizado via Realtime
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
        status: 'draft',
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
    assigned_employee_id: '',
    is_external: false,
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
      
      const payload = {
        company_id: companyId,
        environment_id: newShiftData.environment_id || null,
        activity_id: newShiftData.activity_id || null,
        start_time: new Date(newShiftData.start_time).toISOString(),
        end_time: new Date(newShiftData.end_time).toISOString(),
        status: editingShiftId ? undefined : 'draft' // Default status is draft (rascunho)
      };

      const isCrmEmp = newShiftData.assigned_employee_id?.toString().startsWith('crm-func-');
      const rawCrmId = isCrmEmp ? newShiftData.assigned_employee_id.replace('crm-func-', '') : null;

      let result;
      if (editingShiftId) {
        let shiftNotes = shifts.find(s => s.id === editingShiftId)?.notes || '';
        shiftNotes = shiftNotes.replace(/\[CRM_EMPLOYEE_ID:[^\]]*\]/g, '').trim();
        if (isCrmEmp) {
          shiftNotes = shiftNotes ? `${shiftNotes} [CRM_EMPLOYEE_ID:${rawCrmId}]` : `[CRM_EMPLOYEE_ID:${rawCrmId}]`;
        }
        payload.notes = shiftNotes;

        result = await updateShift(editingShiftId, payload, currentUser);
        
        if (isCrmEmp) {
          await supabase.from('shift_assignments').delete().eq('shift_id', editingShiftId);
        } else {
          await replaceEmployeeInShift(editingShiftId, newShiftData.assigned_employee_id, newShiftData.is_external);
        }

        if (updateShiftLocally && result) {
          const env = environments.find(e => e.id === result.environment_id);
          const act = activities.find(a => a.id === result.activity_id);
          const emp = employees.find(e => (e.shift_profile_id || e.id) === newShiftData.assigned_employee_id);
          
          const enriched = {
            ...result,
            work_environments: { name: env?.name || 'Local Não Definido' },
            work_activities: {
              name: act?.name || 'Atividade',
              required_role: act?.required_role || result.required_role,
              required_skills: act?.required_skills || result.required_skills || []
            },
            assigned_employees: emp ? [{ 
              ...emp, 
              employee_id: emp.shift_profile_id || emp.id,
              name: emp.name 
            }] : []
          };
          updateShiftLocally(editingShiftId, enriched);
        }
      } else {
        if (isCrmEmp) {
          payload.notes = `[CRM_EMPLOYEE_ID:${rawCrmId}]`;
        }
        result = await createShift(payload, currentUser);
        if (newShiftData.assigned_employee_id) {
          if (isCrmEmp) {
            // CRM employee assignment is in notes metadata, no db assignment table write
          } else {
            await addEmployeeToShift(result.id, newShiftData.assigned_employee_id, newShiftData.is_external);
          }
        }
        if (addShiftLocally && result) {
          const env = environments.find(e => e.id === result.environment_id);
          const act = activities.find(a => a.id === result.activity_id);
          const emp = employees.find(e => (e.shift_profile_id || e.id) === newShiftData.assigned_employee_id);

          const enriched = {
            ...result,
            work_environments: { name: env?.name || 'Local Não Definido' },
            work_activities: {
              name: act?.name || 'Atividade',
              required_role: act?.required_role || result.required_role,
              required_skills: act?.required_skills || result.required_skills || []
            },
            assigned_employees: emp ? [{ 
              ...emp, 
              employee_id: emp.shift_profile_id || emp.id,
              name: emp.name 
            }] : []
          };
          addShiftLocally(enriched);
        }
      }
      
      setIsModalOpen(false);
      setEditingShiftId(null);
      setNewShiftData({ environment_id: '', activity_id: '', assigned_employee_id: '', is_external: false, start_time: '', end_time: '' });
      
    } catch (err) {
      const detailedMsg = err.details ? `\nDetalhe: ${err.details}` : '';
      const codeMsg = err.code ? ` [Código: ${err.code}]` : '';
      alert(`Erro ao ${editingShiftId ? 'atualizar' : 'criar'} escala:${codeMsg}\n${err.message}${detailedMsg}`);
    } finally {
      setIsSyncing(false);
    }
  };


  const handleQuickSchedule = async (activity) => {
    try {
      setIsSyncing(true);
      const isKanban = activity.source === 'kanban';
      const startDate = activity.last_appointment ? new Date(activity.last_appointment) : new Date();
      const endDate = new Date(startDate.getTime() + (60 * 60000));
      
      const payload = {
        company_id: companyId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'draft',
        notes: isKanban 
          ? `[KANBAN_ID:${activity.id}] ${activity.desc || activity.title}`
          : `Agendado via Inteligência Kabania`
      };

      if (!isKanban) {
        payload.service_request_id = activity.id;
      }

      const data = await createShift(payload, currentUser);
      
      if (data && addShiftLocally) {
        addShiftLocally(data);
      }
    } catch (err) {
      alert("Erro ao criar escala: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDropActivity = async (activity, date, time, environmentId = null, durationHours = 4) => {
    try {
      setIsSyncing(true);
      const startTime = new Date(date);
      if (time) {
        const [hours, minutes] = time.split(':');
        startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        startTime.setHours(8, 0, 0, 0); 
      }
      
      const endTime = new Date(startTime.getTime() + (durationHours * 60 * 60000));
      
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
        status: 'draft',
        notes: isKanban
          ? `[KANBAN_ID:${activity.id}] ${activity.desc || activity.title}`
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

      // 🧹 REMOÇÃO LOCAL PARA OUTROS TIPOS
      if (!isKanban && removePendingLocally) {
        removePendingLocally(activity.id);
      }
    } catch (err) {
      console.error('Error dropping activity:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReturnShift = async (shiftInput) => {
    // Normalização: aceita ID direto ou objeto completo
    const shift = (typeof shiftInput === 'string') 
      ? shifts.find(s => s.id === shiftInput) 
      : shiftInput;

    if (!shift || !shift.id) {
      console.warn('[handleReturnShift] Payload inválido ou ID não encontrado:', shiftInput);
      return;
    }

    console.log('[handleReturnShift] 🔄 Iniciando devolução otimista:', shift.id);

    // 1. Instant Optimistic UI: Remove do grid IMEDIATAMENTE
    if (removeShiftLocally) removeShiftLocally(shift.id);

    setIsSyncing(true);

    // 🛡️ SAFETY TIMEOUT: Se o banco travar (Lock erro), libera a UI em 8s
    const syncTimeout = setTimeout(() => {
        setIsSyncing(false);
        console.warn('[handleReturnShift] ⚠️ Timeout de sincronização atingido. Liberando UI.');
    }, 8000);

    try {
      const kanbanId = getKanbanId(shift.notes);
      console.log('[handleReturnShift] Link detectado:', { kanbanId, srId: shift.service_request_id });

      // 2. Deletar a escala do banco de dados (Sincronização silenciosa)
      const { error: deleteError } = await deleteShift(shift.id);
      if (deleteError) throw deleteError;

      // 3. Sincronizar origem (Kanban)
      if (kanbanId && !kanbanId.startsWith('crm-')) {
        const { error: taskError } = await supabase
          .from('tasks')
          .update({ column_id: 'todo' })
          .eq('id', kanbanId);
        if (taskError) console.error('[handleReturnShift] Erro ao atualizar tarefa:', taskError);
      }
      
      console.log('[handleReturnShift] ✅ Sincronizado com sucesso');

    } catch (err) {
      console.error('[handleReturnShift] ❌ Erro crítico na sincronização:', err);
      // Notificamos mas não travamos a UI se for um erro de Lock (já lidado pelo timeout)
      if (!err.message?.includes('Lock')) {
        alert('Houve um erro técnico de conexão com o banco. A interface recarregará. ' + err.message);
        if (refresh) refresh();
      }
    } finally {
      clearTimeout(syncTimeout);
      setIsSyncing(false);
    }
  };

  const handleTimeEdit = (shiftId, newStartISO, newEndISO, environmentId) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;

    const original = { start_time: shift.start_time, end_time: shift.end_time };
    updateShiftLocally(shiftId, { start_time: newStartISO, end_time: newEndISO });

    moveShift(shiftId, newStartISO, newEndISO, environmentId || shift.environment_id, companyId)
      .catch(err => {
        console.error('[handleTimeEdit] Erro:', err);
        updateShiftLocally(shiftId, original);
        alert('Erro ao salvar horário: ' + err.message);
      });
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
    moveShift(shiftId, newStart.toISOString(), newEnd.toISOString(), shift.environment_id, companyId)
      .then(result => {
        if (!result) throw new Error("Sem confirmação do servidor.");
        console.log("[MoveShift] ✅ Sincronizado Silenciosamente:", shiftId);
        // Sincronizado via Realtime
      })
      .catch(err => {
        console.error("[MoveShift] ❌ Falha na sincronização:", err);
        // Só alertamos o usuário se realmente falhar no banco
        updateShiftLocally(shiftId, originalTimes); 
        alert("Erro ao salvar mudança. A escala voltou para a posição original.");
      });
  };

  return (
    <div className="escalas-page animate-fade-in premium-mode">
      <div className="shifts-main-layout relative">
        {/* ✅ MINIMALIST SYNC INDICATOR (ANTI-ANXIETY) */}
        <style>{`
          .sync-status-minimal {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            font-weight: 800;
            color: rgba(255, 255, 255, 0.8);
            background: rgba(255, 255, 255, 0.04);
            padding: 6px 14px;
            border-radius: 100px;
            opacity: 0;
            transform: translateY(-5px);
            transition: all 0.4s ease;
            pointer-events: none;
            border: 1px solid rgba(255, 255, 255, 0.15);
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
            background: rgba(255, 255, 255, 0.08);
            color: #0891b2;
            border-color: rgba(255, 255, 255, 0.2);
          }
        `}</style>

        <div className="shifts-grid-area">
          <div className="shifts-header-row-premium">
            <h2 className="shifts-title-premium">Gerenciar Escalas</h2>
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
            onHoursReport={() => setShowHoursReport(true)}
            onSwapMarketplace={() => setShowSwapMarketplace(true)}
            stats={stats}
          />

          <ShiftGrid
            shifts={filteredShifts}
            weekDays={weekDays}
            onAddEmployee={(id) => setAssignmentModal({ isOpen: true, shiftId: id })}
            onDropActivity={handleDropActivity}
            onMoveShift={handleMoveShift}
            onTimeEdit={handleTimeEdit}
            onRefresh={refresh}
            updateShiftLocally={updateShiftLocally}
            isSyncing={isSyncing}
            setIsSyncing={setIsSyncing}
            onCheckin={(shift) => setCheckinModal({ isOpen: true, shift })}
            onDeleteShift={handleDeleteShift}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            onEditShift={handleEditShift}
          />
        </div>

        <ShiftSidebar 
          pendingActivities={unifiedWorkspaceItems} 
          routineActivities={sidebarRoutines}
          onQuickSchedule={handleQuickSchedule} 
          onAutoPilot={handleRunAutoPilot}
          isAutoPilotLoading={isAutoPilotLoading}
          onReturnShift={handleReturnShift}
        />
      </div>

      {showHoursReport && (
        <HoursReport
          companyId={companyId}
          employees={employees}
          onClose={() => setShowHoursReport(false)}
        />
      )}

      {showSwapMarketplace && (
        <ShiftSwapMarketplace
          companyId={companyId}
          currentUser={currentUser}
          userRole={userRole}
          onClose={() => setShowSwapMarketplace(false)}
        />
      )}

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
        <div className="modal-overlay-pixel glass-morphism" style={{ zIndex: 9999 }}>
          <div style={{ width: '100%', maxWidth: '440px' }}>
            <ShiftCheckinModal 
              shift={checkinModal.shift} 
              currentUserEmail={currentUser} 
              onClose={() => setCheckinModal({ isOpen: false, shift: null })} 
              onSuccess={() => refresh()}
            />
          </div>
        </div>
      )}

      {/* 🤝 ASSIGNMENT MODAL — redesenho profissional */}
      {assignmentModal.isOpen && (
        <div className="modal-overlay-pixel glass-morphism" style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.45)' }}>
          <style>{`
            /* ── Assign modal scoped styles ── */
            .assign-modal {
              width: 92%;
              max-width: 480px;
              max-height: 82vh;
              display: flex;
              flex-direction: column;
              border-radius: 20px;
              overflow: hidden;
              background: #0f172a;
              border: 1px solid rgba(255,255,255,0.09);
              box-shadow: 0 24px 60px rgba(0,0,0,0.55);
            }
            [data-theme='light'] .assign-modal {
              background: #ffffff !important;
              border-color: rgba(0,0,0,0.1) !important;
              box-shadow: 0 8px 40px rgba(0,0,0,0.12) !important;
            }

            /* Header */
            .assign-modal-header {
              padding: 18px 20px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 1px solid rgba(255,255,255,0.07);
              flex-shrink: 0;
            }
            [data-theme='light'] .assign-modal-header {
              background: #f8fafc;
              border-bottom-color: #e2e8f0 !important;
            }
            .assign-modal-title {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .assign-modal-title-icon {
              width: 34px; height: 34px; border-radius: 10px;
              background: rgba(255,255,255,0.07);
              display: flex; align-items: center; justify-content: center;
              flex-shrink: 0;
            }
            [data-theme='light'] .assign-modal-title-icon {
              background: #e2e8f0 !important;
            }
            .assign-modal-title h3 {
              font-size: 15px;
              font-weight: 700;
              color: #f1f5f9;
              letter-spacing: -0.01em;
            }
            [data-theme='light'] .assign-modal-title h3 {
              color: #0f172a !important;
            }
            .assign-modal-close {
              width: 30px; height: 30px; border-radius: 8px;
              background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.08);
              color: rgba(148,163,184,0.8);
              display: flex; align-items: center; justify-content: center;
              cursor: pointer; font-size: 18px; line-height: 1;
              transition: all 0.15s;
            }
            .assign-modal-close:hover { background: rgba(239,68,68,0.15); color: #ef4444; }
            [data-theme='light'] .assign-modal-close {
              background: #f1f5f9 !important;
              border-color: #e2e8f0 !important;
              color: #64748b !important;
            }

            /* Search */
            .assign-search-box {
              padding: 14px 16px;
              border-bottom: 1px solid rgba(255,255,255,0.05);
              flex-shrink: 0;
            }
            [data-theme='light'] .assign-search-box {
              background: #ffffff;
              border-bottom-color: #e2e8f0 !important;
            }
            .assign-search-inner {
              display: flex; align-items: center; gap: 10px;
              background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.1);
              border-radius: 10px;
              padding: 9px 13px;
              transition: border-color 0.15s;
            }
            .assign-search-inner:focus-within {
              border-color: rgba(255,255,255,0.25);
            }
            [data-theme='light'] .assign-search-inner {
              background: #f8fafc !important;
              border-color: #e2e8f0 !important;
            }
            [data-theme='light'] .assign-search-inner:focus-within {
              border-color: #94a3b8 !important;
            }
            .assign-search-inner svg { color: rgba(148,163,184,0.6); flex-shrink: 0; }
            [data-theme='light'] .assign-search-inner svg { color: #94a3b8 !important; }
            .assign-search-input {
              flex: 1; background: none; border: none; outline: none;
              font-size: 13px; color: #e2e8f0; font-family: inherit;
            }
            .assign-search-input::placeholder { color: rgba(148,163,184,0.5); }
            [data-theme='light'] .assign-search-input { color: #0f172a !important; }
            [data-theme='light'] .assign-search-input::placeholder { color: #94a3b8 !important; }

            /* Scrollable list area */
            .assign-modal-body {
              flex: 1;
              overflow-y: auto;
              scrollbar-width: thin;
              scrollbar-color: rgba(255,255,255,0.1) transparent;
            }
            [data-theme='light'] .assign-modal-body { background: #ffffff; }
            .assign-modal-body::-webkit-scrollbar { width: 4px; }
            .assign-modal-body::-webkit-scrollbar-track { background: transparent; }
            .assign-modal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 8px; }

            /* Section header (accordion trigger) */
            .assign-section-header {
              padding: 11px 16px;
              display: flex; align-items: center; justify-content: space-between;
              cursor: pointer;
              border-bottom: 1px solid rgba(255,255,255,0.04);
              transition: background 0.15s;
              position: sticky; top: 0;
              background: #0f172a;
              z-index: 1;
            }
            .assign-section-header:hover { background: rgba(255,255,255,0.02); }
            [data-theme='light'] .assign-section-header {
              background: #f8fafc !important;
              border-bottom-color: #f1f5f9 !important;
            }
            [data-theme='light'] .assign-section-header:hover { background: #f1f5f9 !important; }
            .assign-section-left {
              display: flex; align-items: center; gap: 8px;
            }
            .assign-section-left svg { color: rgba(148,163,184,0.5); }
            [data-theme='light'] .assign-section-left svg { color: #94a3b8 !important; }
            .assign-section-label {
              font-size: 10px; font-weight: 700; text-transform: uppercase;
              letter-spacing: 0.07em; color: rgba(148,163,184,0.6);
            }
            [data-theme='light'] .assign-section-label { color: #94a3b8 !important; }
            .assign-section-count {
              font-size: 10px; font-weight: 800; padding: 1px 7px;
              border-radius: 20px; background: rgba(255,255,255,0.08);
              color: rgba(148,163,184,0.7);
            }
            [data-theme='light'] .assign-section-count {
              background: #e2e8f0 !important;
              color: #64748b !important;
            }
            .assign-section-chevron { color: rgba(148,163,184,0.4); transition: transform 0.2s; }
            .assign-section-chevron.open { transform: rotate(180deg); }
            [data-theme='light'] .assign-section-chevron { color: #94a3b8 !important; }

            /* Employee list */
            .assign-emp-list {
              padding: 6px 10px 10px;
              display: flex; flex-direction: column; gap: 4px;
            }

            /* Employee row */
            .assign-emp-row {
              display: flex; align-items: center; gap: 12px;
              padding: 10px 12px;
              border-radius: 10px;
              cursor: pointer;
              transition: all 0.15s;
              border: 1px solid transparent;
            }
            .assign-emp-row:hover {
              background: rgba(255,255,255,0.05);
              border-color: rgba(255,255,255,0.08);
            }
            [data-theme='light'] .assign-emp-row:hover {
              background: #f1f5f9 !important;
              border-color: #e2e8f0 !important;
            }

            /* Avatar */
            .assign-avatar {
              width: 38px; height: 38px; border-radius: 10px;
              display: flex; align-items: center; justify-content: center;
              font-size: 14px; font-weight: 700;
              flex-shrink: 0; overflow: hidden;
              background: rgba(255,255,255,0.08);
              border: 1px solid rgba(255,255,255,0.1);
              color: #cbd5e1;
            }
            .assign-avatar img { width: 100%; height: 100%; object-fit: cover; }
            [data-theme='light'] .assign-avatar {
              background: #e2e8f0 !important;
              border-color: rgba(0,0,0,0.06) !important;
              color: #475569 !important;
            }

            /* Name + role */
            .assign-emp-info { flex: 1; min-width: 0; }
            .assign-emp-name {
              font-size: 13px; font-weight: 600;
              color: #e2e8f0;
              white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
              display: block;
            }
            [data-theme='light'] .assign-emp-name { color: #0f172a !important; }
            .assign-emp-sub {
              font-size: 11px; color: rgba(148,163,184,0.65);
              white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
              display: block; margin-top: 1px;
            }
            [data-theme='light'] .assign-emp-sub { color: #64748b !important; }

            /* Skills chips */
            .assign-skills {
              display: flex; gap: 4px; flex-shrink: 0;
            }
            .assign-skill-chip {
              font-size: 10px; font-weight: 600; padding: 2px 7px;
              border-radius: 6px;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.08);
              color: rgba(148,163,184,0.75);
              white-space: nowrap;
            }
            [data-theme='light'] .assign-skill-chip {
              background: #e2e8f0 !important;
              border-color: rgba(0,0,0,0.04) !important;
              color: #475569 !important;
            }

            /* Add arrow icon on hover */
            .assign-emp-arrow {
              color: rgba(148,163,184,0.25);
              flex-shrink: 0;
              transition: all 0.15s;
            }
            .assign-emp-row:hover .assign-emp-arrow { color: rgba(148,163,184,0.7); transform: translateX(2px); }
            [data-theme='light'] .assign-emp-arrow { color: #cbd5e1 !important; }
            [data-theme='light'] .assign-emp-row:hover .assign-emp-arrow { color: #94a3b8 !important; }

            /* Empty state */
            .assign-empty {
              padding: 32px 16px; text-align: center;
              color: rgba(148,163,184,0.45); font-size: 13px;
              display: flex; flex-direction: column; align-items: center; gap: 10px;
            }
            [data-theme='light'] .assign-empty { color: #94a3b8 !important; }
            .assign-empty svg { opacity: 0.3; }
          `}</style>

          <div className="assign-modal animate-slide-up">
            {/* Header */}
            <div className="assign-modal-header">
              <div className="assign-modal-title">
                <div className="assign-modal-title-icon">
                  <Users size={16} style={{ color: 'rgba(148,163,184,0.8)' }} />
                </div>
                <h3>Direcionar para Colaboradores</h3>
              </div>
              <button className="assign-modal-close" onClick={() => { setAssignmentModal({ isOpen: false, shiftId: null }); setSearchTerm(''); }}>×</button>
            </div>

            {/* Search */}
            <div className="assign-search-box">
              <div className="assign-search-inner">
                <Search size={15} />
                <input
                  type="text"
                  className="assign-search-input"
                  placeholder="Buscar colaborador ou habilidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Body */}
            <div className="assign-modal-body">
              {/* Colaboradores de Campo */}
              <div>
                <div
                  className="assign-section-header"
                  onClick={() => setExpandedCategory(expandedCategory === 'field' ? '' : 'field')}
                >
                  <div className="assign-section-left">
                    <HardHat size={14} />
                    <span className="assign-section-label">Colaboradores de Campo</span>
                    <span className="assign-section-count">{filteredFieldWorkers.length}</span>
                  </div>
                  <ChevronDown size={14} className={`assign-section-chevron${expandedCategory === 'field' ? ' open' : ''}`} />
                </div>

                {expandedCategory === 'field' && (
                  <div className="assign-emp-list">
                    {filteredFieldWorkers.length === 0 ? (
                      <div className="assign-empty">
                        <UserX size={28} />
                        <span>Nenhum colaborador encontrado</span>
                      </div>
                    ) : filteredFieldWorkers.map(emp => (
                      <div
                        key={emp.profile_id}
                        className="assign-emp-row"
                        onClick={() => handleAddEmployee(emp.shift_profile_id || emp.profile_id, null, emp.is_external)}
                      >
                        <div className="assign-avatar">
                          {emp.avatar_url ? <img src={emp.avatar_url} alt="" /> : <span>{emp.name?.[0]?.toUpperCase() || '?'}</span>}
                        </div>
                        <div className="assign-emp-info">
                          <span className="assign-emp-name">{emp.name}</span>
                          {emp.skills?.length > 0 && (
                            <span className="assign-emp-sub">{emp.skills.slice(0, 3).join(' · ')}</span>
                          )}
                        </div>
                        {emp.skills?.length > 0 && (
                          <div className="assign-skills">
                            {emp.skills.slice(0, 2).map(s => <span key={s} className="assign-skill-chip">{s}</span>)}
                          </div>
                        )}
                        <ChevronRight size={14} className="assign-emp-arrow" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Membros da Equipe */}
              <div>
                <div
                  className="assign-section-header"
                  onClick={() => setExpandedCategory(expandedCategory === 'staff' ? '' : 'staff')}
                >
                  <div className="assign-section-left">
                    <Users size={14} />
                    <span className="assign-section-label">Membros da Equipe</span>
                    <span className="assign-section-count">{filteredStaffMembers.length}</span>
                  </div>
                  <ChevronDown size={14} className={`assign-section-chevron${expandedCategory === 'staff' ? ' open' : ''}`} />
                </div>

                {expandedCategory === 'staff' && (
                  <div className="assign-emp-list">
                    {filteredStaffMembers.length === 0 ? (
                      <div className="assign-empty">
                        <UserX size={28} />
                        <span>Nenhum membro encontrado</span>
                      </div>
                    ) : filteredStaffMembers.map(emp => (
                      <div
                        key={emp.profile_id}
                        className="assign-emp-row"
                        onClick={() => handleAddEmployee(emp.shift_profile_id || emp.profile_id, null, emp.is_external)}
                      >
                        <div className="assign-avatar">
                          {emp.avatar_url ? <img src={emp.avatar_url} alt="" /> : <span>{emp.name?.[0]?.toUpperCase() || '?'}</span>}
                        </div>
                        <div className="assign-emp-info">
                          <span className="assign-emp-name">{emp.name}</span>
                          {emp.role && <span className="assign-emp-sub">{emp.role}</span>}
                        </div>
                        <ChevronRight size={14} className="assign-emp-arrow" />
                      </div>
                    ))}
                  </div>
                )}
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
              <div className="modal-header-content flex items-center gap-3">
                <div className="icon-badge-premium bg-blue-glow">
                   <Users className="text-accent-cyan" size={18} />
                </div>
                <h3>{editingShiftId ? 'Personalizar Escala Existente' : 'Agendar Nova Escala Inteligente'}</h3>
              </div>
              <button className="premium-close-btn" onClick={() => { setIsModalOpen(false); setEditingShiftId(null); }}>×</button>
            </div>
            
            <form className="modal-form p-8" onSubmit={handleCreateShift}>
              {/* Banner de contexto do Kanban */}
              {kanbanToShift && !editingShiftId && (
                <div style={{
                  background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)',
                  borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem',
                  display: 'flex', flexDirection: 'column', gap: '4px',
                }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(96,165,250,0.9)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    📋 Card do Kanban
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0' }}>
                    {kanbanToShift.title}
                  </span>
                  {(kanbanToShift.customer_name || kanbanToShift.tag) && (
                    <span style={{ fontSize: '0.78rem', color: 'rgba(148,163,184,0.85)' }}>
                      {[kanbanToShift.customer_name, kanbanToShift.tag].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
              )}
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

                <div className="form-group-premium full-width">
                  <label className="premium-label flex items-center gap-2">
                    <Users size={14} className="text-accent-cyan" /> COLABORADOR RESPONSÁVEL
                  </label>
                  <div className="premium-input-wrapper">
                    <select 
                      name="assigned_employee_id" 
                      className="premium-input-field w-full"
                      value={newShiftData.assigned_employee_id}
                      onChange={(e) => {
                        const selectedEmp = employees.find(emp => (emp.shift_profile_id || emp.id) === e.target.value);
                        setNewShiftData({
                          ...newShiftData, 
                          assigned_employee_id: e.target.value,
                          is_external: !!selectedEmp?.is_external
                        });
                      }}
                    >
                      <option value="">Nenhum colaborador atribuído</option>
                      <optgroup label="Colaboradores de Campo">
                        {fieldWorkers.map(emp => (
                          <option key={emp.shift_profile_id || emp.id} value={emp.shift_profile_id || emp.id}>
                            {emp.name} {emp.role ? `(${emp.role})` : ''}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Equipe Interna">
                        {staffMembers.map(emp => (
                          <option key={emp.shift_profile_id || emp.id} value={emp.shift_profile_id || emp.id}>
                            {emp.name} {emp.role ? `(${emp.role})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <ChevronDown className="input-icon-right" size={16} />
                  </div>
                </div>

                <div className="date-time-flex flex" style={{ gap: '24px' }}>
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


              <div className="modal-actions-premium flex justify-end gap-3 pt-6 border-t border-white/5">
                <button 
                  type="button" 
                  className="glow-btn-ghost py-3" 
                  onClick={() => { setIsModalOpen(false); setEditingShiftId(null); }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="glow-btn-primary py-3 px-8 flex items-center gap-2"
                  disabled={isSyncing}
                >
                  {isSyncing ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editingShiftId ? 'Salvar Alterações' : 'Criar Escala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
