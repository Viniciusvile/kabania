import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { processTaskWithAI } from '../services/geminiService';
import {
  notifyTaskMoved,
  notifyAssignment,
  checkDeadlineNotifications,
  getDeadlineStatus
} from '../services/notificationService';
import {
  MoreHorizontal, Plus, AlertTriangle, Sparkles, Trash2, Edit2,
  Calendar, Users, MessageSquare, X, Check, Clock
} from 'lucide-react';
import {
  DndContext, closestCorners, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import CardDetailModal from './CardDetailModal';
import './Kanban.css';

const COLUMNS = [
  { id: 'backlog',  title: 'BACKLOG' },
  { id: 'todo',     title: 'TO DO' },
  { id: 'progress', title: 'IN PROGRESS' },
  { id: 'ai',       title: 'AI ANALYSIS', isHighlighted: true },
  { id: 'done',     title: 'DONE' }
];

const COLUMN_LABELS = {
  backlog: 'Backlog', todo: 'To Do', progress: 'Em Progresso', ai: 'AI Analysis', done: 'Concluído'
};

// ---- Avatar helpers ----
function getInitials(email) { return email ? email.substring(0, 2).toUpperCase() : '?'; }
function getAvatarColor(email) {
  const colors = ['#00e5ff', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#60a5fa'];
  let h = 0;
  for (let i = 0; i < email.length; i++) h = email.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}
function formatDeadlineShort(isoDate) {
  if (!isoDate) return '';
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ---- Sortable Task Card ----
function SortableTaskCard({ task, onDelete, onEdit, onOpenDetail }) {
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
      onDoubleClick={(e) => { e.stopPropagation(); onOpenDetail(task); }}
    >
      {/* Card Header */}
      <div className="card-header">
        <span className="card-title">{task.title}</span>
        <div className="flex items-center gap-2">
          {deadlineStatus?.color === 'red' && <AlertTriangle size={13} className="text-red-500" />}
          {task.hasAlert && !deadlineStatus && <AlertTriangle size={14} className="text-red-500" />}
          {!task.hasAlert && !deadlineStatus && <Sparkles size={14} className="text-accent opacity-30" />}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            onPointerDown={e => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-blue-400 p-1 pointer-events-auto"
            title="Editar"
          ><Edit2 size={13} /></button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            onPointerDown={e => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-500 p-1 pointer-events-auto"
            title="Excluir"
          ><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Description */}
      <p className="card-desc">{task.desc}</p>

      {/* AI Loading / Response */}
      {task.isAiLoading && (
        <div className="mt-2 text-xs text-accent flex items-center gap-1 animate-pulse">
          <Sparkles size={12} /> Analisando com IA...
        </div>
      )}
      {task.aiResponse && (
        <div className="mt-2 p-2 bg-black/20 rounded border border-accent/20 text-xs">
          <div className="flex items-center gap-1 text-accent font-semibold mb-1">
            <Sparkles size={12} /> Sugestão da IA
          </div>
          <p className="text-gray-300 leading-tight">{task.aiResponse}</p>
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
          {task.tag && (
            <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: `var(--color-${task.tagColor}, #00e5ff)` }}>
              {task.tag}
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
            <div className="card-avatar card-avatar-empty" title="Sem responsável">?</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Kanban Column ----
function KanbanColumn({ col, tasks, onAddTask, onDeleteTask, onEditTask, onOpenDetail }) {
  const { setNodeRef } = useDroppable({ id: col.id, data: { type: 'Column', column: col } });
  return (
    <div className={`kanban-column ${col.isHighlighted ? 'column-highlighted' : ''}`}>
      <div className={`column-header ${col.isHighlighted ? 'text-accent' : ''}`}>
        <span>{col.title}</span>
        {!col.isHighlighted && (
          <button onClick={() => onAddTask(col.id)} className="add-task-btn" style={{ padding: '0.25rem', borderRadius: '4px', cursor: 'pointer', outline: 'none' }}>
            <Plus size={16} className="text-muted" />
          </button>
        )}
      </div>
      <div ref={setNodeRef} className="column-content relative" style={{ minHeight: '100px' }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} onDelete={onDeleteTask} onEdit={onEditTask} onOpenDetail={onOpenDetail} />
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
            <span>{email.split('@')[0]}</span>
            {isSelected && <Check size={12} className="km-mp-check" />}
          </button>
        );
      })}
    </div>
  );
}

// ---- Main Board ----
export default function KanbanBoard({ searchQuery = '', currentUser = 'default', currentCompany = null, projectId = null }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTask, setActiveTask] = useState(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskCol, setNewTaskCol] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [dragStartColumn, setDragStartColumn] = useState(null);

  // Modal form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formAssignees, setFormAssignees] = useState([]);

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

  // Fetch tasks from Supabase
  useEffect(() => {
    const fetchTasks = async () => {
      if (!projectId) {
        setTasks([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId);

      if (!error && data) {
        // Map back consistent with UI (snake_case to camelCase)
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
      } else if (error) {
        console.error('Error fetching tasks:', error);
      }
      setLoading(false);
    };

    fetchTasks();
  }, [projectId]);

  // Deadline notifications on load
  useEffect(() => {
    if (tasks.length > 0 && currentUser) {
      checkDeadlineNotifications(tasks, currentUser);
    }
  }, []);

  // AI Analysis column watcher
  useEffect(() => {
    const unanalyzed = tasks.filter(t => t.columnId === 'ai' && !t.aiResponse && !t.isAiLoading);
    if (unanalyzed.length === 0) return;
    
    unanalyzed.forEach(async (task) => {
      // Set loading state locally
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isAiLoading: true } : t));
      
      const response = await processTaskWithAI(task.desc || task.title, currentCompany?.id, true);
      
      // Update locally
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isAiLoading: false, aiResponse: response } : t));
      
      // Persist to database
      const { error } = await supabase
        .from('tasks')
        .update({ ai_response: response })
        .eq('id', task.id);
        
      if (error) {
        console.error('Error persisting AI response:', error);
      }
    });
  }, [tasks]);

  // Keep detail panel in sync with task updates
  useEffect(() => {
    if (detailTask) {
      const updated = tasks.find(t => t.id === detailTask.id);
      if (updated) setDetailTask(updated);
    }
  }, [tasks]);

  const openAddModal = (colId) => {
    setNewTaskCol(colId);
    setFormTitle(''); setFormDesc(''); setFormDeadline(''); setFormAssignees([]);
    setIsAddingTask(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setFormTitle(task.title || '');
    setFormDesc(task.desc || '');
    setFormDeadline(task.deadline || '');
    setFormAssignees(task.assignees || []);
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
      project_id: projectId
    };

    const { error } = await supabase.from('tasks').insert([newTask]);

    if (!error) {
      // Map for local state consistency
      const mapped = { 
        ...newTask, 
        columnId: newTaskCol, 
        desc: formDesc.trim(), 
        tagColor: 'green', 
        projectId, 
        companyId: currentCompany?.id 
      };
      setTasks(prev => [...prev, mapped]);
      if (formAssignees.length > 0) notifyAssignment(mapped, formAssignees, currentUser);
      setIsAddingTask(false);
    } else {
      console.error('Error adding task:', error);
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    const prevTask = editingTask;
    const payload = {
      title: formTitle.trim(),
      description: formDesc.trim(),
      deadline: formDeadline || null,
      assignees: formAssignees,
      ai_response: null
    };

    const { error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', prevTask.id);

    if (!error) {
      const updatedTask = {
        ...prevTask,
        title: formTitle.trim(),
        desc: formDesc.trim(),
        deadline: formDeadline || null,
        assignees: formAssignees,
        aiResponse: null,
        isAiLoading: false
      };
      setTasks(prev => prev.map(t => t.id === prevTask.id ? updatedTask : t));
      const newAssignees = formAssignees.filter(e => !(prevTask.assignees || []).includes(e));
      if (newAssignees.length > 0) notifyAssignment(updatedTask, newAssignees, currentUser);
      setEditingTask(null);
    } else {
      console.error('Error updating task:', error);
    }
  };

  const handleUpdateFromDetail = async (updatedTask) => {
    const payload = {
      title: updatedTask.title,
      description: updatedTask.desc,
      column_id: updatedTask.columnId,
      deadline: updatedTask.deadline,
      assignees: updatedTask.assignees,
      comments: updatedTask.comments,
      ai_response: updatedTask.aiResponse
    };

    const { error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', updatedTask.id);

    if (!error) {
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
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
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = ({ active }) => {
    const task = tasks.find(t => t.id === active.id);
    setDragStartColumn(task?.columnId || null);
    setActiveTask(task);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    if (isActiveTask && isOverTask) {
      setTasks(tasks => {
        const ai = tasks.findIndex(t => t.id === active.id);
        const oi = tasks.findIndex(t => t.id === over.id);
        if (tasks[ai].columnId !== tasks[oi].columnId) {
          const t = [...tasks];
          const newColId = tasks[oi].columnId;
          const oldColId = tasks[ai].columnId;
          t[ai] = { ...t[ai], columnId: newColId };
          
          // Only clear AI response if moving INTO the AI column from somewhere else
          if (newColId === 'ai' && oldColId !== 'ai') {
            t[ai].aiResponse = null;
          } else if (newColId !== 'ai') {
            // Stop loading state if moving out of AI
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
          const oldColId = tasks[ai].columnId;
          if (oldColId !== over.id) {
            const t = [...tasks];
            t[ai] = { ...t[ai], columnId: over.id };
            
            // Only clear AI response if moving INTO the AI column from somewhere else
            if (over.id === 'ai' && oldColId !== 'ai') {
              t[ai].aiResponse = null;
            } else if (over.id !== 'ai') {
              // Stop loading state if moving out of AI
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
    setActiveTask(null);
    if (!over) {
      setDragStartColumn(null);
      return;
    }

    const currentTask = tasks.find(t => t.id === active.id);
    const newColId = over.data.current?.type === 'Task'
      ? tasks.find(t => t.id === over.id)?.columnId
      : over.id;

    if (currentTask && newColId && newColId !== dragStartColumn) {
      // Persist column change to Supabase
      const payload = { 
        column_id: newColId
      };

      // Only clear AI response if moving INTO the AI column to force a new analysis
      if (newColId === 'ai') {
        payload.ai_response = null;
      }
      
      const { error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', currentTask.id);

      if (!error) {
        // notify about move
        notifyTaskMoved({ ...currentTask, columnId: newColId }, COLUMN_LABELS[newColId] || newColId, currentUser);
      } else {
        console.error('Error persisting drag and drop:', error);
      }
    }
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
        className="km-modal"
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
              <input autoFocus placeholder="Título da tarefa" value={formTitle} onChange={e => setFormTitle(e.target.value)} required />
            </div>
            <div className="km-field">
              <label>Descrição</label>
              <textarea placeholder="Descreva a tarefa..." value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} />
            </div>
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
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => {
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
              />
            );
          })}
        </div>
        <DragOverlay>
          {activeTask ? <SortableTaskCard task={activeTask} onDelete={() => {}} onEdit={() => {}} onOpenDetail={() => {}} /> : null}
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
    </div>
  );
}
