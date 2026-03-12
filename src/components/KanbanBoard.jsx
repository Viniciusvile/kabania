import React, { useState, useEffect } from 'react';
import { processTaskWithAI } from '../services/geminiService';
import { MoreHorizontal, Plus, AlertTriangle, Sparkles, ExternalLink, Trash2, Edit2 } from 'lucide-react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import './Kanban.css';

// Initial data structure matching exactly what we had visually
const initialTasks = [];

const COLUMNS = [
  { id: 'backlog', title: 'BACKLOG' },
  { id: 'todo', title: 'TO DO' },
  { id: 'progress', title: 'IN PROGRESS' },
  { id: 'ai', title: 'AI ANALYSIS', isHighlighted: true },
  { id: 'done', title: 'DONE' }
];

function SortableTaskCard({ task, onDelete, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, data: { type: 'Task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  if (task.type === 'bottleneck-alert') {
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="task-card bottleneck-alert">
        <div className="card-title text-sm mb-1 flex items-center justify-between group">
          <div className="flex items-center gap-2">
            {task.title} <AlertTriangle size={14} className="text-red-500"/>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              onPointerDown={e => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-blue-400 p-1 pointer-events-auto"
              title="Editar"
            >
              <Edit2 size={13} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} 
              onPointerDown={e => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-500 p-1 pointer-events-auto"
              title="Remove Task"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <p className="card-desc text-xs mt-2">
          {task.desc} <br/>
          <span className="text-accent underline cursor-pointer pointer-events-auto" onPointerDown={e=>e.stopPropagation()}>View AI recommendation?</span>
        </p>
      </div>
    );
  }

  if (task.type === 'ghost') {
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="card-ghost">
        <Sparkles size={14} className="text-purple-400 mr-2" />
        <span className="text-xs text-muted">{task.title}</span>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="task-card group">
      <div className="card-header">
        <span className="card-title">{task.title}</span>
        <div className="flex items-center gap-3">
          {task.hasAlert ? <AlertTriangle size={14} className="text-red-500" /> : <Sparkles size={14} className="text-accent opacity-30" />}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            onPointerDown={e => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-blue-400 p-1 pointer-events-auto"
            title="Editar"
          >
            <Edit2 size={13} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} 
            onPointerDown={e => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-500 p-1 pointer-events-auto"
            title="Remove Task"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <p className="card-desc">{task.desc}</p>
      
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
      
      <div className="card-footer">
        <div className="card-assignees">
          <span>Assignees</span>
          {task.tag && (
            <span className="badge" style={{ backgroundColor: `rgba(255,255,255,0.1)`, color: `var(--color-${task.tagColor})` }}>
              {task.tag}
            </span>
          )}
        </div>
        <img src="https://ui-avatars.com/api/?name=User&background=random" className="avatar-small" alt="Assignee" />
      </div>
    </div>
  );
}

function KanbanColumn({ col, tasks, onAddTask, onDeleteTask, onEditTask, searchQuery }) {
  const { setNodeRef } = useDroppable({
    id: col.id,
    data: {
      type: 'Column',
      column: col
    }
  });

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
            <SortableTaskCard key={task.id} task={task} onDelete={onDeleteTask} onEdit={onEditTask} />
          ))}
          
        </SortableContext>
      </div>
    </div>
  );
}

function AddTaskForm({ columnId, onAdd, onCancel }) {
  const [title, setTitle] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(columnId, title);
      setTitle(''); // Clear input after adding
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-task-form">
      <input 
        autoFocus
        type="text" 
        placeholder="Digite um título..." 
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="add-task-input"
      />
      <div className="add-task-actions">
        <button type="submit" className="add-task-btn bg-accent text-bg-app px-3 py-1 rounded text-xs font-semibold">Salvar</button>
        <button type="button" onClick={onCancel} className="add-task-btn text-muted hover:text-white px-2 text-xs">Cancelar</button>
      </div>
    </form>
  );
}

export default function KanbanBoard({ searchQuery = '', currentUser = 'default' }) {
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem(`synapseTasks_${currentUser}`);
    if (savedTasks) {
      try {
        return JSON.parse(savedTasks);
      } catch (e) {
        console.error("Failed to parse tasks from local storage", e);
      }
    }
    return initialTasks;
  });

  // Save to local database on every task change, tied to the user
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`synapseTasks_${currentUser}`, JSON.stringify(tasks));
    }
  }, [tasks, currentUser]);

  // Monitor AI column
  useEffect(() => {
    const unanalyzedTasks = tasks.filter(t => t.columnId === 'ai' && !t.aiResponse && !t.isAiLoading);
    if (unanalyzedTasks.length === 0) return;

    unanalyzedTasks.forEach(taskToProcess => {
      // Mark as loading immediately to avoid infinite loop
      setTasks(prev => prev.map(t => 
        t.id === taskToProcess.id ? { ...t, isAiLoading: true } : t
      ));
      
      // Fire off AI request
      processTaskWithAI(taskToProcess.desc || taskToProcess.title).then(response => {
        setTasks(prev => prev.map(t => 
          t.id === taskToProcess.id ? { ...t, isAiLoading: false, aiResponse: response } : t
        ));
      });
    });
  }, [tasks]);

  const [activeTask, setActiveTask] = useState(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskCol, setNewTaskCol] = useState(null);
  const [editingTask, setEditingTask] = useState(null); // task being edited

  const handleDeleteTask = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleUpdateTask = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const title = fd.get('title');
    const desc = fd.get('desc');
    if (!title.trim()) return;
    setTasks(prev => prev.map(t =>
      t.id === editingTask.id ? { ...t, title, desc } : t
    ));
    setEditingTask(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    setActiveTask(task);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    
    // Dragging over another task
    if (isActiveTask && isOverTask) {
      setTasks(tasks => {
        const activeIndex = tasks.findIndex(t => t.id === activeId);
        const overIndex = tasks.findIndex(t => t.id === overId);
        
        if (tasks[activeIndex].columnId !== tasks[overIndex].columnId) {
          const newTasks = [...tasks];
          newTasks[activeIndex] = { ...newTasks[activeIndex], columnId: tasks[overIndex].columnId };
          
          // Clear AI response when moving OUT of the AI column
          if (newTasks[activeIndex].columnId !== 'ai') {
            newTasks[activeIndex].aiResponse = null;
            newTasks[activeIndex].isAiLoading = false;
          }
          
          return arrayMove(newTasks, activeIndex, overIndex);
        }
        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    // Dragging over an empty column area
    if (isActiveTask && !isOverTask) {
      const isOverColumn = COLUMNS.some(col => col.id === overId);
      if (isOverColumn) {
        setTasks(tasks => {
          const activeIndex = tasks.findIndex(t => t.id === activeId);
          if (tasks[activeIndex].columnId !== overId) {
             const newTasks = [...tasks];
             newTasks[activeIndex] = { ...newTasks[activeIndex], columnId: overId };
             
             // Clear AI response when moving OUT of the AI column
             if (overId !== 'ai') {
               newTasks[activeIndex].aiResponse = null;
               newTasks[activeIndex].isAiLoading = false;
             }
             
             return newTasks;
          }
          return tasks;
        });
      }
    }
  };

  const handleDragEnd = (event) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;
  };

  const addTask = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const title = fd.get('title');
    const desc = fd.get('desc');
    if (!title) return;

    setTasks(prev => [...prev, {
      id: `t_${Date.now()}`,
      columnId: newTaskCol,
      title,
      desc,
      tag: 'New',
      tagColor: 'green'
    }]);
    setIsAddingTask(false);
    setNewTaskCol(null);
  };

  return (
    <div className="kanban-wrapper">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => {
              if (t.columnId !== col.id) return false;
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return t.title.toLowerCase().includes(q) || (t.desc && t.desc.toLowerCase().includes(q));
            });
            return <KanbanColumn key={col.id} col={col} tasks={colTasks} onAddTask={(id) => { setIsAddingTask(true); setNewTaskCol(id); }} onDeleteTask={handleDeleteTask} onEditTask={(task) => setEditingTask(task)} />;
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <SortableTaskCard task={activeTask} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Basic Modal for New Task */}
      {isAddingTask && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '8px', width: '380px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Add New Task to {COLUMNS.find(c=>c.id===newTaskCol)?.title}</h3>
            <form onSubmit={addTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input name="title" autoFocus placeholder="Task Title" style={{ backgroundColor: 'var(--bg-app)', color: 'white', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '4px', outline: 'none' }} />
              <textarea name="desc" placeholder="Task Description" style={{ backgroundColor: 'var(--bg-app)', color: 'white', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '4px', outline: 'none', height: '6rem', resize: 'none' }}></textarea>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsAddingTask(false)} style={{ padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--accent-cyan)', color: 'black', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 600 }}>Add Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '8px', width: '380px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit2 size={18} style={{ color: 'var(--accent-cyan)' }} /> Editar Card
            </h3>
            <form onSubmit={handleUpdateTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Título</label>
                <input name="title" autoFocus defaultValue={editingTask.title} placeholder="Título do card" style={{ backgroundColor: 'var(--bg-app)', color: 'white', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '4px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Descrição</label>
                <textarea name="desc" defaultValue={editingTask.desc || ''} placeholder="Descrição do card" style={{ backgroundColor: 'var(--bg-app)', color: 'white', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '4px', outline: 'none', height: '6rem', resize: 'none' }}></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditingTask(null)} style={{ padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.875rem', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--accent-cyan)', color: 'black', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
