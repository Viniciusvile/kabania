import React, { useState, useMemo } from 'react';
import { Plus, Layers, ListChecks, GanttChart } from 'lucide-react';
import {
  createPhase,
  createTask,
  updateTask,
  deleteTask,
  deletePhase
} from '../../services/projectsService';
import ProjectGantt from './ProjectGantt';
import ProjectTaskModal from './ProjectTaskModal';

export default function ProjectDetail({
  project,
  phases,
  tasks,
  companyId,
  currentUser,
  loading,
  onRefresh
}) {
  const [activeTask, setActiveTask] = useState(null);
  const [creatingTaskInPhase, setCreatingTaskInPhase] = useState(null);
  const [addingPhase, setAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');

  const tasksByPhase = useMemo(() => {
    const map = {};
    for (const ph of phases) map[ph.id] = [];
    for (const t of tasks) {
      if (!map[t.phase_id]) map[t.phase_id] = [];
      map[t.phase_id].push(t);
    }
    return map;
  }, [phases, tasks]);

  const handleAddPhase = async () => {
    const name = newPhaseName.trim();
    if (!name) return;
    try {
      await createPhase({
        projectId: project.id,
        companyId,
        name,
        order_index: phases.length
      });
      setNewPhaseName('');
      setAddingPhase(false);
      onRefresh();
    } catch (e) {
      alert('Erro ao criar fase: ' + (e.message || e));
    }
  };

  const handleCreateTask = async (phaseId, payload) => {
    try {
      await createTask({
        ...payload,
        phase_id: phaseId,
        project_id: project.id,
        company_id: companyId,
        order_index: (tasksByPhase[phaseId]?.length || 0)
      });
      setCreatingTaskInPhase(null);
      onRefresh();
    } catch (e) {
      alert('Erro ao criar tarefa: ' + (e.message || e));
    }
  };

  const handleUpdateTask = async (id, patch) => {
    try {
      await updateTask(id, patch);
      onRefresh();
    } catch (e) {
      alert('Erro ao atualizar tarefa: ' + (e.message || e));
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Excluir esta tarefa?')) return;
    try {
      await deleteTask(id);
      setActiveTask(null);
      onRefresh();
    } catch (e) {
      alert('Erro ao excluir tarefa: ' + (e.message || e));
    }
  };

  const handleDeletePhase = async (id) => {
    if (!window.confirm('Excluir esta fase e todas as suas tarefas?')) return;
    try {
      await deletePhase(id);
      onRefresh();
    } catch (e) {
      alert('Erro ao excluir fase: ' + (e.message || e));
    }
  };

  return (
    <div className="pm-detail">
      <div className="pm-detail-tools">
        <div className="pm-detail-stat">
          <Layers size={14} /> {phases.length} fases
        </div>
        <div className="pm-detail-stat">
          <ListChecks size={14} /> {tasks.length} tarefas
        </div>
        <div className="pm-detail-stat">
          <GanttChart size={14} /> Timeline
        </div>
        <div className="pm-detail-spacer" />
        <button
          className="pm-btn pm-btn-secondary"
          onClick={() => setAddingPhase(true)}
        >
          <Plus size={16} /> Nova Fase
        </button>
      </div>

      {addingPhase && (
        <div className="pm-inline-add">
          <input
            autoFocus
            placeholder="Nome da fase (ex: Planejamento)"
            value={newPhaseName}
            onChange={e => setNewPhaseName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddPhase();
              if (e.key === 'Escape') { setAddingPhase(false); setNewPhaseName(''); }
            }}
          />
          <button className="pm-btn pm-btn-primary" onClick={handleAddPhase}>Criar</button>
          <button className="pm-btn pm-btn-secondary" onClick={() => { setAddingPhase(false); setNewPhaseName(''); }}>
            Cancelar
          </button>
        </div>
      )}

      {loading ? (
        <div className="pm-loading">Carregando timeline...</div>
      ) : phases.length === 0 ? (
        <div className="pm-empty pm-empty-inline">
          <Layers size={42} className="pm-empty-icon" />
          <h3>Nenhuma fase ainda</h3>
          <p>Adicione fases (ex: Planejamento, Execução, Entrega) para organizar tarefas.</p>
          <button className="pm-btn pm-btn-primary" onClick={() => setAddingPhase(true)}>
            <Plus size={16} /> Adicionar primeira fase
          </button>
        </div>
      ) : (
        <ProjectGantt
          project={project}
          phases={phases}
          tasksByPhase={tasksByPhase}
          onTaskClick={setActiveTask}
          onAddTask={(phaseId) => setCreatingTaskInPhase(phaseId)}
          onDeletePhase={handleDeletePhase}
        />
      )}

      {(activeTask || creatingTaskInPhase) && (
        <ProjectTaskModal
          task={activeTask}
          phaseId={creatingTaskInPhase}
          phases={phases}
          allTasks={tasks}
          project={project}
          onClose={() => { setActiveTask(null); setCreatingTaskInPhase(null); }}
          onSave={(payload) => {
            if (activeTask) {
              handleUpdateTask(activeTask.id, payload);
              setActiveTask(null);
            } else {
              handleCreateTask(creatingTaskInPhase, payload);
            }
          }}
          onDelete={activeTask ? () => handleDeleteTask(activeTask.id) : null}
        />
      )}
    </div>
  );
}
