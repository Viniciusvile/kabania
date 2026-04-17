import React, { useState, useEffect, useCallback } from 'react';
import { FolderKanban, Plus, ArrowLeft } from 'lucide-react';
import {
  listProjects,
  listPhases,
  listTasks,
  createProject
} from '../../services/projectsService';
import ProjectsList from './ProjectsList';
import ProjectDetail from './ProjectDetail';
import NewProjectModal from './NewProjectModal';
import './ProjectsModule.css';

export default function ProjectsModule({ companyId, currentUser, userRole }) {
  const [projects, setProjects] = useState([]);
  const [tasksByProject, setTasksByProject] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [phases, setPhases] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  const refreshProjects = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const list = await listProjects(companyId);
    setProjects(list);
    // Lightweight per-project task summary for list cards
    const map = {};
    for (const p of list) {
      map[p.id] = await listTasks(p.id);
    }
    setTasksByProject(map);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { refreshProjects(); }, [refreshProjects]);

  const refreshDetail = useCallback(async (projectId) => {
    if (!projectId) return;
    setDetailLoading(true);
    const [ph, tk] = await Promise.all([listPhases(projectId), listTasks(projectId)]);
    setPhases(ph);
    setTasks(tk);
    setTasksByProject(prev => ({ ...prev, [projectId]: tk }));
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (selectedId) refreshDetail(selectedId);
  }, [selectedId, refreshDetail]);

  const handleCreateProject = async (form) => {
    try {
      const created = await createProject({
        companyId,
        currentUser,
        ...form
      });
      setProjects(prev => [created, ...prev]);
      setTasksByProject(prev => ({ ...prev, [created.id]: [] }));
      setShowNewModal(false);
      setSelectedId(created.id);
    } catch (e) {
      alert('Erro ao criar projeto: ' + (e.message || e));
    }
  };

  const selectedProject = projects.find(p => p.id === selectedId);

  return (
    <div className="pm-module">
      <div className="pm-header">
        <div className="pm-header-info">
          <div className="pm-header-title-row">
            {selectedProject && (
              <button className="pm-back-btn" onClick={() => setSelectedId(null)} title="Voltar">
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="pm-header-icon-box">
              <FolderKanban className="text-emerald-400" size={32} />
            </div>
            <h1>{selectedProject ? selectedProject.name : 'Projetos'}</h1>
          </div>
          <p className="pm-header-subtitle">
            {selectedProject
              ? selectedProject.description || 'Linha do tempo, fases e tarefas'
              : 'Visão estratégica e temporal dos projetos da empresa.'}
          </p>
        </div>

        {!selectedProject && (
          <div className="pm-header-actions">
            <button className="pm-btn pm-btn-primary" onClick={() => setShowNewModal(true)}>
              <Plus size={18} /> Novo Projeto
            </button>
          </div>
        )}
      </div>

      <div className="pm-content">
        {!selectedProject ? (
          <ProjectsList
            projects={projects}
            tasksByProject={tasksByProject}
            loading={loading}
            onSelect={setSelectedId}
            onCreate={() => setShowNewModal(true)}
          />
        ) : (
          <ProjectDetail
            project={selectedProject}
            phases={phases}
            tasks={tasks}
            companyId={companyId}
            currentUser={currentUser}
            loading={detailLoading}
            onRefresh={() => refreshDetail(selectedProject.id)}
          />
        )}
      </div>

      {showNewModal && (
        <NewProjectModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  );
}
