import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { processTaskWithAI } from '../services/geminiService';
import {
  notifyTaskMoved,
  notifyAssignment,
  checkDeadlineNotifications,
  getDeadlineStatus,
  createNotification
} from '../services/notificationService';
import {
  MoreHorizontal, Plus, AlertTriangle, Sparkles, Trash2, Edit2,
  Calendar, Users, MessageSquare, X, Check, Clock, CheckCircle, User
} from 'lucide-react';
import {
  DndContext, KeyboardSensor, PointerSensor, TouchSensor, MouseSensor,
  useSensor, useSensors, DragOverlay, pointerWithin
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates,
  verticalListSortingStrategy, rectSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import CardDetailModal from './CardDetailModal';
import CardResponseModal from './CardResponseModal';
import { resolveCrmOccurrence } from '../services/crmIntegrationService';
import './Kanban.css';

const COLUMNS = [
  { id: 'backlog',  title: 'A Fazer' },
  { id: 'progress', title: 'Em Andamento' },
  { id: 'ai',       title: 'Análise IA', isHighlighted: true },
  { id: 'done',     title: 'Concluídos' }
];

const COLUMN_LABELS = {
  backlog: 'A Fazer', progress: 'Em Andamento', ai: 'Análise IA', done: 'Concluídos'
};

// ---- Avatar helpers ----
function getInitials(email) { return email ? email.substring(0, 2).toUpperCase() : '?'; }
function getAvatarColor(email) {
  const colors = ['rgba(255,255,255,0.85)', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#60a5fa'];
  let h = 0;
  for (let i = 0; i < email.length; i++) h = email.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}
function formatDeadlineShort(isoDate) {
  if (!isoDate) return '';
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ---- Sortable Task Card ----
function SortableTaskCard({ task, onDelete, onEdit, onOpenDetail, onOpenResponse }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id, data: { type: 'Task', task }
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const deadlineStatus = getDeadlineStatus(task.deadline);
  const commentCount = task.comments?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`task-card group ${deadlineStatus?.color === 'red' ? 'card-overdue' : ''}`}
      onClick={(e) => { e.stopPropagation(); onOpenResponse(task); }}
      onDoubleClick={(e) => { e.stopPropagation(); onOpenDetail(task); }}
    >
      {/* Card Header */}
      <div className="card-header">
        <span className="card-title">{task.title}</span>
        <div className="card-header-actions">
          {deadlineStatus?.color === 'red' && (
            <span title="Prazo vencido" className="card-header-icon"><AlertTriangle size={13} className="text-red-500" /></span>
          )}
          {task.hasAlert && !deadlineStatus && (
            <span title="Atenção" className="card-header-icon"><AlertTriangle size={14} className="text-red-500" /></span>
          )}
          {!task.hasAlert && !deadlineStatus && (
            <span title="Análise por IA disponível" className="card-header-icon"><Sparkles size={14} className="text-accent opacity-30" /></span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            onPointerDown={e => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-blue-400 p-1 pointer-events-auto"
            title="Editar chamado"
          ><Edit2 size={13} /></button>
          {task.source !== 'crm' && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              onPointerDown={e => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-500 p-1 pointer-events-auto"
              title="Excluir chamado"
            ><Trash2 size={14} /></button>
          )}
        </div>
      </div>

      {/* Description — oculta quando redundante com o título (caso das ocorrências CRM) */}
      {task.desc && task.desc !== task.title && (
        <p className="card-desc">{task.desc}</p>
      )}

      {/* AI Loading / Response */}
      {task.isAiLoading && (
        <div className="mt-2 text-xs text-accent flex items-center gap-1 animate-pulse">
          <Sparkles size={12} /> Analisando com IA...
        </div>
      )}
      {task.aiResponse && (
        <div className="card-ai-suggestion">
          <div className="card-ai-suggestion-header">
            <Sparkles size={12} /> Sugestão da IA
          </div>
          <p className="card-ai-suggestion-text">{task.aiResponse}</p>
        </div>
      )}

      {/* Deadline badge */}
      {task.deadline && deadlineStatus && (
        <div className={`card-deadline-badge card-dl-${deadlineStatus.color}`}>
          <Clock size={11} />
          <span>{formatDeadlineShort(task.deadline)}</span>
          <span className="card-dl-label">{deadlineStatus.icon} {deadlineStatus.label}</span>
        </div>
      )}

      {/* Footer: assignees + tag + comments */}
      <div className="card-footer">
        <div className="card-meta-left">
          {task.customer_name && (
            <span className="card-tag card-tag--customer">
              {task.customer_name}
            </span>
          )}
          {task.tag && (
            <span className="card-tag card-tag--category" style={{ color: `var(--color-${task.tagColor}, var(--accent-orange, #fb923c))` }}>
              {task.tag}
            </span>
          )}
          {task.isReaberto && (
            <span className="card-tag card-tag--reopened animate-pulse">
              REABERTO
            </span>
          )}
          {task.isScheduled && (
            <span className="card-tag card-tag--scheduled">
              <CheckCircle size={10} /> Agendado
            </span>
          )}

          {commentCount > 0 && (
            <span className="card-comment-badge" onPointerDown={e => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onOpenDetail(task); }}>
              <MessageSquare size={11} /> {commentCount}
            </span>
          )}
        </div>
        <div className="card-assignee-avatars">
          {task.assignees?.slice(0, 4).map(email => (
            <div
              key={email}
              className="card-avatar"
              style={{ background: getAvatarColor(email) }}
              title={email}
            >
              {getInitials(email)}
            </div>
          ))}
          {!task.assignees?.length && (
            <div className="card-avatar card-avatar-empty" title="Sem responsável">
              <User size={12} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Kanban Column ----
function KanbanColumn({ col, tasks, onAddTask, onDeleteTask, onEditTask, onOpenDetail, onOpenResponse }) {
  const { setNodeRef } = useDroppable({ id: col.id, data: { type: 'Column', column: col } });
  const isBacklog = col.id === 'backlog';
  return (
    <div 
      ref={setNodeRef}
      className={`kanban-column ${col.isHighlighted ? 'column-highlighted' : ''}`}
      style={{
        flex: isBacklog ? '2 1 520px' : '1 1 260px',
        minWidth: isBacklog ? '480px' : '240px'
      }}
    >
      <div className={`column-header ${col.isHighlighted ? 'text-accent' : ''}`}>
        <span className="column-header-label">
          {col.title}
          <span className="column-count">{tasks.length}</span>
        </span>
        {!col.isHighlighted && (
          <button onClick={() => onAddTask(col.id)} className="add-task-btn" style={{ padding: '0.25rem', borderRadius: '4px', cursor: 'pointer', outline: 'none' }}>
            <Plus size={16} className="text-muted" />
          </button>
        )}
      </div>
      <div 
        className="column-content relative" 
        style={{ 
          minHeight: '100px',
          display: isBacklog ? 'grid' : 'flex',
          gridTemplateColumns: isBacklog ? '1fr 1fr' : 'none',
          gap: '0.75rem',
          alignContent: 'start'
        }}
      >
        <SortableContext 
          items={tasks.map(t => t.id)} 
          strategy={isBacklog ? rectSortingStrategy : verticalListSortingStrategy}
        >
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} onDelete={onDeleteTask} onEdit={onEditTask} onOpenDetail={onOpenDetail} onOpenResponse={onOpenResponse} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

// ---- Assignee Picker ----
function AssigneePicker({ companyMembers, selected, onChange }) {
  return (
    <div className="km-assignee-picker">
      {companyMembers.length === 0 && (
        <p className="km-no-members">Nenhum membro na empresa ainda.</p>
      )}
      {companyMembers.map(email => {
        const isSelected = selected.includes(email);
        return (
          <button
            key={email}
            type="button"
            className={`km-member-pill ${isSelected ? 'selected' : ''}`}
            onClick={() => {
              onChange(isSelected ? selected.filter(e => e !== email) : [...selected, email]);
            }}
          >
            <div className="km-mp-avatar" style={{ background: getAvatarColor(email) }}>
              {getInitials(email)}
            </div>
            <span>{typeof email === 'string' ? email.split('@')[0] : 'Usuário'}</span>
            {isSelected && <Check size={12} className="km-mp-check" />}
          </button>
        );
      })}
    </div>
  );
}

// ---- Main Board ----
export default function KanbanBoard({ searchQuery = '', currentUser = 'default', currentCompany = null, projectId = null, crmOcorrencias = [], selectedCondominioId = null, condominios = [] }) {
  // Click Condomínios local columns overrides for occurrences
  const [crmColumns, setCrmColumns] = useState(() => {
    if (!projectId) return {};
    const cached = localStorage.getItem(`crm_columns_${projectId}`);
    return cached ? JSON.parse(cached) : {};
  });

  // Local AI responses cache for CRM occurrences
  const [crmAiResponses, setCrmAiResponses] = useState(() => {
    if (!projectId) return {};
    const saved = localStorage.getItem(`crm_ai_responses_${projectId}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [crmAiLoading, setCrmAiLoading] = useState({});

  // Sync crmColumns and crmAiResponses when project changes
  useEffect(() => {
    if (projectId) {
      const cached = localStorage.getItem(`crm_columns_${projectId}`);
      setCrmColumns(cached ? JSON.parse(cached) : {});
      const savedAi = localStorage.getItem(`crm_ai_responses_${projectId}`);
      setCrmAiResponses(savedAi ? JSON.parse(savedAi) : {});
    } else {
      setCrmColumns({});
      setCrmAiResponses({});
    }
  }, [projectId]);

  // Instant Hydration from cache
  const [tasks, setTasks] = useState(() => {
    if (!projectId) return [];
    const cacheKey = `kanban_tasks_${projectId}`;
    const cached = localStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(!tasks.length && !!projectId);

  const [activeTask, setActiveTask] = useState(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskCol, setNewTaskCol] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [responseTask, setResponseTask] = useState(null);
  const [dragStartColumn, setDragStartColumn] = useState(null);
  const [shifts, setShifts] = useState([]);

  // Sincronização de Escalas (Shifts) para mostrar o selo "Agendado"
  useEffect(() => {
    const fetchShifts = async () => {
      if (!currentCompany?.id) return;
      const { data, error } = await supabase
        .from('shifts')
        .select('id, notes')
        .eq('company_id', currentCompany.id);
      if (!error && data) setShifts(data);
    };

    fetchShifts();

    const shiftsChannel = supabase.channel(`kanban-shifts-${currentCompany?.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'shifts', 
        filter: `company_id=eq.${currentCompany?.id}` 
      }, () => fetchShifts())
      .subscribe();

    return () => { supabase.removeChannel(shiftsChannel); };
  }, [currentCompany?.id]);

  // Enriquecer e mesclar com ocorrências do CRM + aplicar filtro de condomínio
  const processedTasks = useMemo(() => {
    // Separate local tasks into regular tasks and CRM overrides
    const crmOverrides = {};
    const regularTasks = [];
    
    tasks.forEach(t => {
      if (t.id && t.id.toString().startsWith('crm-oc-')) {
        crmOverrides[t.id] = t;
      } else {
        regularTasks.push(t);
      }
    });

    // 1. Mapear ocorrências do CRM para o formato de tarefas do Kanban, mesclando com os overrides do banco
    const mappedCrmOcorrencias = (crmOcorrencias || []).map(o => {
      const crmId = `crm-oc-${o.id}`;
      const override = crmOverrides[crmId];
      
      const isReaberto = o.descricao?.includes('[Reabertura - Novas Informações]') || o.descricao?.includes('[Chamado Reaberto]');
      const defaultColumn = o.status === 'Pendente' ? 'backlog' : 'done';
      
      let colId = override?.columnId || override?.column_id || crmColumns[crmId] || defaultColumn;
      if (isReaberto && colId === 'done') {
        colId = 'backlog';
      }
      
      return {
        // O assunto do chamado (descricao) é o título; a categoria vira apenas tag.
        // Ocorrências do CRM só têm um campo de texto (descricao), então title e desc
        // referenciam o mesmo conteúdo — o card suprime o desc redundante, mas o modal
        // "Responder e Solucionar" continua lendo task.desc na "Descrição do Chamado".
        id: crmId,
        title: override?.title || o.descricao || o.categoria || 'Ocorrência',
        desc: override?.desc || override?.description || o.descricao,
        columnId: colId,
        tag: override?.tag || o.categoria,
        tagColor: override?.tagColor || 'orange',
        customer_name: override?.customer_name || o.condominio_nome,
        isScheduled: override?.isScheduled || false,
        assignees: override?.assignees || [],
        comments: override?.comments || [],
        deadline: override?.deadline || null,
        source: 'crm',
        condominio_id: o.condominio_id,
        created_at: o.created_at,
        projectId: projectId,
        aiResponse: (isReaberto && !override?.aiResponse && !override?.ai_response && !crmAiResponses[crmId]) ? null : (override?.aiResponse || override?.ai_response || crmAiResponses[crmId] || null),
        isAiLoading: override?.isAiLoading || !!crmAiLoading[crmId],
        isReaberto: isReaberto
      };
    });


    const all = [...regularTasks, ...mappedCrmOcorrencias];

    // 2. Enriquecer com agendamento
    const enriched = all.map(t => ({
      ...t,
      isScheduled: shifts.some(s => s.notes?.includes(`[KANBAN_ID:${t.id}]`))
    }));

    // 3. Filtrar por Condomínio se houver filtro ativo
    if (selectedCondominioId) {
      const selectedNome = condominios.find(c => String(c.id) === String(selectedCondominioId))?.nome || 
                           crmOcorrencias.find(c => String(c.condominio_id) === String(selectedCondominioId))?.condominio_nome;
      return enriched.filter(t => 
        String(t.condominio_id) === String(selectedCondominioId) ||
        (t.customer_name && selectedNome && t.customer_name.toLowerCase() === selectedNome.toLowerCase())
      );
    }

    return enriched;
  }, [tasks, shifts, crmOcorrencias, selectedCondominioId, condominios, crmColumns, crmAiResponses, crmAiLoading, projectId]);

  // Modal form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formAssignees, setFormAssignees] = useState([]);
  const [formCustomer, setFormCustomer] = useState('');
  const [formAiResponse, setFormAiResponse] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [companyMembers, setCompanyMembers] = useState([]);

  // Fetch company members from Supabase
  useEffect(() => {
    const fetchMembers = async () => {
      if (!currentCompany?.id) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('company_id', currentCompany.id);

      if (!error && data) {
        setCompanyMembers(data.map(p => p.email));
      } else if (error) {
        console.error('Error fetching company members:', error);
      }
    };
    fetchMembers();
  }, [currentCompany]);

  // Fetch customers for the task modal
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!currentCompany?.id) return;
      setLoadingCustomers(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('name')
          .eq('company_id', currentCompany.id)
          .order('name', { ascending: true });
        
        if (!error && data) {
          setCustomers(data.map(c => c.name));
        }
      } catch (err) {
        console.error('Error fetching customers for Kanban:', err);
      } finally {
        setLoadingCustomers(false);
      }
    };
    if (isAddingTask || editingTask) fetchCustomers();
  }, [currentCompany, isAddingTask, editingTask]);

  // Fetch tasks from Supabase and sync cache
  useEffect(() => {
    const fetchTasks = async () => {
      if (!projectId) {
        setTasks([]);
        setLoading(false);
        return;
      }

      // 1. RE-HYDRATION: Try loading from cache for THIS SPECIFIC projectId immediately
      const cacheKey = `kanban_tasks_${projectId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          console.log(`Re-hydrating tasks for project ${projectId} from cache...`);
          setTasks(parsed);
          setLoading(false); // No spinner if we have data
        } catch (e) {
          console.error("Cache parse error during re-hydration:", e);
        }
      } else {
        setLoading(true);
      }

      // 2. BACKGROUND SYNC
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId);

      if (!error && data) {
        const mapped = data.map(t => ({
          ...t,
          desc: t.description,
          projectId: t.project_id,
          companyId: t.company_id,
          columnId: t.column_id,
          aiResponse: t.ai_response,
          tagColor: t.tag_color
        }));
        
        setTasks(mapped);
        localStorage.setItem(cacheKey, JSON.stringify(mapped));
      } else if (error) {
        console.error('Error fetching tasks:', error);
      }
      setLoading(false);
    };

    fetchTasks();
    
    // 3. REALTIME SUBSCRIPTION
    if (!projectId) return;
    
    const channel = supabase
      .channel(`public:tasks:project_id=eq.${projectId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks',
        filter: `project_id=eq.${projectId}`
      }, (payload) => {
        
        setTasks(prevTasks => {
          let updated = [...prevTasks];
          
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new;
            // Avoid duplicates if we already optimistically added it
            if (!updated.find(t => t.id === newTask.id)) {
              updated.push({
                ...newTask,
                desc: newTask.description,
                projectId: newTask.project_id,
                companyId: newTask.company_id,
                columnId: newTask.column_id,
                aiResponse: newTask.ai_response,
                tagColor: newTask.tag_color
              });
            }
          } 
          else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new;
            updated = updated.map(t => t.id === updatedTask.id ? {
              ...t,
              ...updatedTask,
              desc: updatedTask.description,
              projectId: updatedTask.project_id,
              companyId: updatedTask.company_id,
              columnId: updatedTask.column_id,
              aiResponse: updatedTask.ai_response,
              tagColor: updatedTask.tag_color
            } : t);
          } 
          else if (payload.eventType === 'DELETE') {
            updated = updated.filter(t => t.id !== payload.old.id);
          }
          
          localStorage.setItem(`kanban_tasks_${projectId}`, JSON.stringify(updated));
          return updated;
        });
        
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [projectId]);

  // Deadline notifications on load
  useEffect(() => {
    if (tasks.length > 0 && currentCompany?.id) {
      checkDeadlineNotifications(tasks, currentCompany.id);
    }
  }, []);

  // AI Analysis column watcher - Sequential processing to respect API quotas
  useEffect(() => {
    let isMounted = true;

    const runAI = async () => {
      const unanalyzed = processedTasks.filter(t => 
        t.columnId === 'ai' && 
        !t.aiResponse && 
        !t.isAiLoading && 
        t.id !== activeTask?.id
      );

      if (unanalyzed.length === 0) return;

      // Process only the first one found to let the next Effect catch the rest
      const task = unanalyzed[0];

      if (!isMounted) return;

      // Mark as loading to prevent other Effects from picking it up
      if (task.source === 'crm') {
        setCrmAiLoading(prev => ({ ...prev, [task.id]: true }));
      } else {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isAiLoading: true } : t));
      }

      try {
        const response = await processTaskWithAI(task.desc || task.title, currentCompany?.id, true);
        
        if (task.source === 'crm') {
          setCrmAiLoading(prev => ({ ...prev, [task.id]: false }));
          setCrmAiResponses(prev => {
            const next = { ...prev, [task.id]: response };
            localStorage.setItem(`crm_ai_responses_${projectId}`, JSON.stringify(next));
            return next;
          });
        } else {
          // Update locally
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isAiLoading: false, aiResponse: response } : t));
          
          // Persist to database
          const { error } = await supabase
            .from('tasks')
            .update({ ai_response: response })
            .eq('id', task.id);
            
          if (error) console.error('Error persisting AI response:', error);
        }

        // Subtle delay before next card is picked up
        await new Promise(resolve => setTimeout(resolve, 1200));
      } catch (err) {
        if (task.source === 'crm') {
          setCrmAiLoading(prev => ({ ...prev, [task.id]: false }));
          setCrmAiResponses(prev => {
            const next = { ...prev, [task.id]: 'Erro ao processar.' };
            localStorage.setItem(`crm_ai_responses_${projectId}`, JSON.stringify(next));
            return next;
          });
        } else {
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isAiLoading: false, aiResponse: 'Erro ao processar.' } : t));
        }
      }
    };

    runAI();

    return () => { isMounted = false; };
  }, [processedTasks, activeTask, currentCompany?.id, projectId]);


  // Keep detail panel in sync with task updates
  useEffect(() => {
    if (detailTask) {
      const updated = tasks.find(t => t.id === detailTask.id);
      if (updated) setDetailTask(updated);
    }
  }, [tasks]);

  const openAddModal = (colId) => {
    setNewTaskCol(colId);
    setFormTitle(''); setFormDesc(''); setFormDeadline(''); setFormAssignees([]); setFormCustomer(''); setFormAiResponse('');
    setIsAddingTask(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setFormTitle(task.title || '');
    setFormDesc(task.desc || '');
    setFormDeadline(task.deadline || '');
    setFormAssignees(task.assignees || []);
    setFormCustomer(task.customer_name || '');
    setFormAiResponse(task.aiResponse || '');
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    
    const newId = `t_${Date.now()}`;
    const newTask = {
      id: newId,
      column_id: newTaskCol,
      title: formTitle.trim(),
      description: formDesc.trim(),
      tag: 'New',
      tag_color: 'green',
      deadline: formDeadline || null,
      assignees: formAssignees,
      comments: [],
      company_id: currentCompany?.id,
      project_id: projectId,
      customer_name: formCustomer
    };

    // Optimistic Mapping
    const mapped = { 
      ...newTask, 
      columnId: newTaskCol, 
      desc: formDesc.trim(), 
      tagColor: 'green', 
      projectId, 
      companyId: currentCompany?.id 
    };

    // 1. Update State & Cache Immediately
    const updatedTasks = [...tasks, mapped];
    setTasks(updatedTasks);
    localStorage.setItem(`kanban_tasks_${projectId}`, JSON.stringify(updatedTasks));
    setIsAddingTask(false);

    // 2. Persist to DB in background
    const { error } = await supabase.from('tasks').insert([newTask]);

    if (error) {
      console.error('Error adding task:', error);
      // Rollback on error
      const rolledBack = tasks.filter(t => t.id !== newId);
      setTasks(rolledBack);
      localStorage.setItem(`kanban_tasks_${projectId}`, JSON.stringify(rolledBack));
      alert('Erro ao salvar no banco. O card foi removido.');
    } else {
      if (formAssignees.length > 0) notifyAssignment(mapped, formAssignees, currentUser);
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    const prevTask = editingTask;
    const isCrmOverride = prevTask.id.toString().startsWith('crm-oc-');

    const payload = {
      title: formTitle.trim(),
      description: formDesc.trim(),
      deadline: formDeadline || null,
      assignees: formAssignees,
      ai_response: null,
      customer_name: formCustomer
    };

    let error;
    if (isCrmOverride) {
      const upsertPayload = {
        id: prevTask.id,
        column_id: prevTask.columnId || 'backlog',
        project_id: projectId,
        company_id: currentCompany?.id,
        title: formTitle.trim(),
        description: formDesc.trim(),
        deadline: formDeadline || null,
        assignees: formAssignees,
        ai_response: formAiResponse.trim() || null,
        customer_name: formCustomer
      };
      const res = await supabase.from('tasks').upsert(upsertPayload);
      error = res.error;
    } else {
      const res = await supabase.from('tasks').update(payload).eq('id', prevTask.id);
      error = res.error;
    }

    if (!error) {
      const updatedTask = {
        ...prevTask,
        title: formTitle.trim(),
        desc: formDesc.trim(),
        deadline: formDeadline || null,
        assignees: formAssignees,
        aiResponse: isCrmOverride ? (formAiResponse.trim() || null) : null,
        isAiLoading: false
      };
      
      setTasks(prev => {
        const exists = prev.some(t => t.id === prevTask.id);
        const next = exists
          ? prev.map(t => t.id === prevTask.id ? updatedTask : t)
          : [...prev, {
              ...updatedTask,
              column_id: prevTask.columnId,
              project_id: projectId,
              company_id: currentCompany?.id,
              columnId: prevTask.columnId,
              projectId: projectId,
              companyId: currentCompany?.id
            }];
        localStorage.setItem(`kanban_tasks_${projectId}`, JSON.stringify(next));
        return next;
      });
      
      const newAssignees = formAssignees.filter(e => !(prevTask.assignees || []).includes(e));
      if (newAssignees.length > 0) notifyAssignment(updatedTask, newAssignees, currentUser);
      setEditingTask(null);
    } else {
      console.error('Error updating task:', error);
    }
  };

  const handleResolveFromModal = async (task, responseText) => {
    const isCrmOverride = task.id.toString().startsWith('crm-oc-');
    const updatedTask = {
      ...task,
      aiResponse: responseText,
      columnId: 'done'
    };

    let error;
    if (isCrmOverride) {
      // 1. Resolve CRM occurrence on Railway API
      try {
        await resolveCrmOccurrence(task.id, responseText);
      } catch (err) {
        console.error("Error resolving CRM occurrence from modal:", err);
      }

      // 2. Upsert custom override in Supabase tasks table
      const { error: upsertError } = await supabase.from('tasks').upsert({
        id: task.id,
        column_id: 'done',
        project_id: projectId,
        company_id: currentCompany?.id,
        ai_response: responseText
      });
      error = upsertError;

      // 3. Update local CRM columns cache to match Done column
      setCrmColumns(prev => {
        const next = { ...prev, [task.id]: 'done' };
        localStorage.setItem(`crm_columns_${projectId}`, JSON.stringify(next));
        return next;
      });

      // 4. Update local CRM AI responses cache
      setCrmAiResponses(prev => {
        const next = { ...prev, [task.id]: responseText };
        localStorage.setItem(`crm_ai_responses_${projectId}`, JSON.stringify(next));
        return next;
      });
    } else {
      const payload = {
        ai_response: responseText,
        column_id: 'done'
      };
      const { error: updateError } = await supabase.from('tasks').update(payload).eq('id', task.id);
      error = updateError;
    }

    if (!error) {
      setTasks(prev => {
        const exists = prev.some(t => t.id === task.id);
        const next = exists
          ? prev.map(t => t.id === task.id ? updatedTask : t)
          : [...prev, { ...updatedTask, column_id: 'done', project_id: projectId, company_id: currentCompany?.id }];
        localStorage.setItem(`kanban_tasks_${projectId}`, JSON.stringify(next));
        return next;
      });
    } else {
      console.error('Error resolving task from modal:', error);
    }
  };

  const handleUpdateFromDetail = async (updatedTask) => {
    const isCrmOverride = updatedTask.id.toString().startsWith('crm-oc-');
    const payload = {
      title: updatedTask.title,
      description: updatedTask.desc,
      column_id: updatedTask.columnId,
      deadline: updatedTask.deadline,
      assignees: updatedTask.assignees,
      comments: updatedTask.comments,
      ai_response: updatedTask.aiResponse
    };

    let error;
    if (isCrmOverride) {
      const upsertPayload = {
        id: updatedTask.id,
        column_id: updatedTask.columnId || 'backlog',
        project_id: projectId,
        company_id: currentCompany?.id,
        title: updatedTask.title,
        description: updatedTask.desc,
        deadline: updatedTask.deadline,
        assignees: updatedTask.assignees,
        comments: updatedTask.comments,
        ai_response: updatedTask.aiResponse,
        customer_name: updatedTask.customer_name
      };
      const res = await supabase.from('tasks').upsert(upsertPayload);
      error = res.error;
    } else {
      const res = await supabase.from('tasks').update(payload).eq('id', updatedTask.id);
      error = res.error;
    }

    if (!error) {
      setTasks(prev => {
        const exists = prev.some(t => t.id === updatedTask.id);
        const next = exists
          ? prev.map(t => t.id === updatedTask.id ? updatedTask : t)
          : [...prev, { ...updatedTask, column_id: updatedTask.columnId, project_id: projectId, company_id: currentCompany?.id }];
        localStorage.setItem(`kanban_tasks_${projectId}`, JSON.stringify(next));
        return next;
      });
    } else {
      console.error('Error updating from detail:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } else {
      console.error('Error deleting task:', error);
    }
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = ({ active }) => {
    const task = processedTasks.find(t => t.id === active.id);
    setDragStartColumn(task?.columnId || null);
    setActiveTask(task);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';

    // 1. Handling CRM card dragging
    if (active.id.toString().startsWith('crm-')) {
      const overColId = isOverTask
        ? processedTasks.find(t => t.id === over.id)?.columnId
        : over.id;
      
      if (overColId) {
        setCrmColumns(prev => {
          if (prev[active.id] === overColId) return prev;
          return { ...prev, [active.id]: overColId };
        });
      }
      return;
    }

    // 2. Handling regular card dragging over a CRM card
    if (over.id.toString().startsWith('crm-')) {
      const overColId = processedTasks.find(t => t.id === over.id)?.columnId;
      if (overColId) {
        setTasks(prev => {
          const activeIndex = prev.findIndex(t => t.id === active.id);
          if (activeIndex !== -1) {
            if (prev[activeIndex].columnId === overColId) return prev;
            const updated = [...prev];
            updated[activeIndex] = { ...updated[activeIndex], columnId: overColId };
            return updated;
          }
          return prev;
        });
      }
      return;
    }

    // 3. Regular card dragging over regular card or column
    if (isActiveTask && isOverTask) {
      setTasks(tasks => {
        const ai = tasks.findIndex(t => t.id === active.id);
        const oi = tasks.findIndex(t => t.id === over.id);
        if (ai === -1 || oi === -1) return tasks;
        if (tasks[ai].columnId !== tasks[oi].columnId) {
          const t = [...tasks];
          const newColId = tasks[oi].columnId;
          t[ai] = { ...t[ai], columnId: newColId };
          
          if (newColId !== 'ai') {
            t[ai].isAiLoading = false;
          }
          
          return arrayMove(t, ai, oi);
        }
        return arrayMove(tasks, ai, oi);
      });
    }

    if (isActiveTask && !isOverTask) {
      const isOverCol = COLUMNS.some(c => c.id === over.id);
      if (isOverCol) {
        setTasks(tasks => {
          const ai = tasks.findIndex(t => t.id === active.id);
          if (ai === -1) return tasks;
          const oldColId = tasks[ai].columnId;
          if (oldColId !== over.id) {
            const t = [...tasks];
            t[ai] = { ...t[ai], columnId: over.id };
            
            if (over.id !== 'ai') {
              t[ai].isAiLoading = false;
            }
            
            return t;
          }
          return tasks;
        });
      }
    }
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over) {
      setActiveTask(null);
      setDragStartColumn(null);
      return;
    }

    const currentTask = processedTasks.find(t => t.id === active.id);
    const newColId = over.data.current?.type === 'Task'
      ? processedTasks.find(t => t.id === over.id)?.columnId
      : over.id;

    if (currentTask && newColId) {
      // 1. CRM Task Column Update
      if (currentTask.id.toString().startsWith('crm-')) {
        if (newColId !== dragStartColumn) {
          setCrmColumns(prev => {
            const nextColumns = { ...prev, [currentTask.id]: newColId };
            localStorage.setItem(`crm_columns_${projectId}`, JSON.stringify(nextColumns));
            return nextColumns;
          });

          // Salva/atualiza o override de coluna do CRM no Supabase para sincronizar entre todos os dispositivos/usuários
          const exists = tasks.some(t => t.id === currentTask.id);
          const updatedTasks = exists
            ? tasks.map(t => t.id === currentTask.id ? { ...t, columnId: newColId } : t)
            : [...tasks, { id: currentTask.id, columnId: newColId, projectId, title: currentTask.title }];
          
          setTasks(updatedTasks);
          localStorage.setItem(`kanban_tasks_${projectId}`, JSON.stringify(updatedTasks));

          const payload = {
            id: currentTask.id,
            column_id: newColId,
            project_id: projectId,
            company_id: currentCompany?.id
          };
          if (newColId === 'ai') payload.ai_response = null;

          supabase.from('tasks').upsert(payload).then(({ error }) => {
            if (error) console.error('Error persisting CRM override column in DB:', error);
          });

          // Se foi movido para Done, envia a resolução para a API do CRM
          if (newColId === 'done') {
            const responseMsg = currentTask.aiResponse || 'Ocorrência resolvida via painel de projetos.';
            console.log(`[CRM Resolve] Resolvendo ocorrência ${currentTask.id} no CRM com a mensagem: "${responseMsg}"`);
            resolveCrmOccurrence(currentTask.id, responseMsg);
          }
        }
        setActiveTask(null);
        setDragStartColumn(null);
        return;
      }

      // 2. Sync local Supabase tasks state immediately
      const updatedTasks = tasks.map(t => t.id === currentTask.id ? { ...t, columnId: newColId } : t);
      setTasks(updatedTasks);
      
      // 3. Persist to Cache immediately
      localStorage.setItem(`kanban_tasks_${projectId}`, JSON.stringify(updatedTasks));
      
      // 4. Persist to DB if column changed
      if (newColId !== dragStartColumn) {
        const payload = { column_id: newColId };
        if (newColId === 'ai') payload.ai_response = null;

        const { error } = await supabase.from('tasks').update(payload).eq('id', currentTask.id);

        if (!error) {
          notifyTaskMoved({ ...currentTask, columnId: newColId }, COLUMN_LABELS[newColId] || newColId, currentUser);
          
          if (newColId === 'done') {
            createNotification(
              currentCompany?.id, 
              null,
              'kanban_done',
              `🎉 A tarefa "${currentTask.title}" foi movida para Concluído por ${typeof currentUser === 'string' ? currentUser.split('@')[0] : 'Usuário'}!`
            );
          }
        } else {
          console.error('Error persisting drag and drop:', error);
        }
      }
    }

    setActiveTask(null);
    setDragStartColumn(null);
  };

  const closeModal = () => { setIsAddingTask(false); setEditingTask(null); };

  // Shared Modal Form JSX
  const renderModalForm = (isEditing, onSubmit) => (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={closeModal}
    >
      <div
        className="km-modal animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="km-modal-header">
          <h3><Edit2 size={17} style={{ color: 'var(--accent-cyan)' }} /> {isEditing ? 'Editar Tarefa' : `Nova Tarefa — ${COLUMNS.find(c => c.id === newTaskCol)?.title}`}</h3>
          <button className="km-modal-close" onClick={closeModal}><X size={18} /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="km-modal-body">
            <div className="km-field">
              <label>Título <span className="km-required">*</span></label>
              <input
                autoFocus
                type="text"
                placeholder="Ex: Revisar contrato"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                required
              />
            </div>

            <div className="km-field">
              <label>Cliente (CRM)</label>
              <select
                value={formCustomer}
                onChange={e => setFormCustomer(e.target.value)}
                className="km-select"
                disabled={loadingCustomers}
              >
                <option value="">Selecione um cliente...</option>
                {customers.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="km-field">
              <label>Descrição</label>
              <textarea placeholder="Descreva a tarefa..." value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} />
            </div>

            {editingTask?.id?.toString().startsWith('crm-') && (
              <div className="km-field">
                <label>
                  <Sparkles size={13} className="text-accent" />
                  Resposta para o Cliente (CRM)
                </label>
                <textarea
                  placeholder="Edite a sugestão de resposta gerada pela IA ou digite a resolução..."
                  value={formAiResponse}
                  onChange={e => setFormAiResponse(e.target.value)}
                  rows={4}
                />
              </div>
            )}
            <div className="km-two-col">
              <div className="km-field">
                <label><Calendar size={13} /> Prazo / Deadline</label>
                <input type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} />
              </div>
            </div>
            <div className="km-field">
              <label><Users size={13} /> Responsáveis</label>
              <AssigneePicker companyMembers={companyMembers} selected={formAssignees} onChange={setFormAssignees} />
            </div>
          </div>
          <div className="km-modal-footer">
            <button type="button" className="km-btn-cancel" onClick={closeModal}>Cancelar</button>
            <button type="submit" className="km-btn-submit">{isEditing ? 'Salvar Alterações' : 'Criar Tarefa'}</button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="kanban-wrapper">
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {COLUMNS.map(col => {
            const colTasks = processedTasks.filter(t => {
              if (t.columnId !== col.id) return false;
              // Strict Project filtering
              if (projectId && t.projectId !== projectId) return false;
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return t.title.toLowerCase().includes(q) || (t.desc?.toLowerCase().includes(q));
            });
            return (
              <KanbanColumn
                key={col.id}
                col={col}
                tasks={colTasks}
                onAddTask={openAddModal}
                onDeleteTask={handleDeleteTask}
                onEditTask={openEditModal}
                onOpenDetail={(task) => setDetailTask(task)}
                onOpenResponse={(task) => setResponseTask(task)}
              />
            );
          })}
        </div>
        <DragOverlay>
          {activeTask ? (
            <SortableTaskCard 
              task={processedTasks.find(t => t.id === activeTask.id) || activeTask} 
              onDelete={() => {}} 
              onEdit={() => {}} 
              onOpenDetail={() => {}} 
              onOpenResponse={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {isAddingTask && renderModalForm(false, handleAddTask)}
      {editingTask && renderModalForm(true, handleUpdateTask)}

      {detailTask && (
        <CardDetailModal
          task={detailTask}
          currentUser={currentUser}
          onClose={() => setDetailTask(null)}
          onUpdate={handleUpdateFromDetail}
        />
      )}

      {responseTask && (
        <CardResponseModal
          task={responseTask}
          currentUser={currentUser}
          onClose={() => setResponseTask(null)}
          onUpdate={handleUpdateFromDetail}
          onResolve={handleResolveFromModal}
        />
      )}
    </div>
  );
}
