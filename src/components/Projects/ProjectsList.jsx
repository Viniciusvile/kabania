import React from 'react';
import { Calendar, Users, Clock, AlertTriangle, CheckCircle2, FolderPlus } from 'lucide-react';
import { computeProjectProgress, computeProjectHealth } from '../../services/projectsService';

function daysBetween(a, b) {
  const ms = new Date(b) - new Date(a);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function formatBR(date) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
}

const HEALTH = {
  on_track: { label: 'Em dia',     color: '#10b981', icon: CheckCircle2 },
  at_risk:  { label: 'Em risco',   color: '#f59e0b', icon: AlertTriangle },
  late:     { label: 'Atrasado',   color: '#ef4444', icon: AlertTriangle }
};

export default function ProjectsList({ projects, tasksByProject, loading, onSelect, onCreate }) {
  if (loading) {
    return <div className="pm-loading">Carregando projetos...</div>;
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="pm-empty">
        <FolderPlus size={56} className="pm-empty-icon" />
        <h2>Nenhum projeto ainda</h2>
        <p>Crie seu primeiro projeto para começar a planejar fases, tarefas e prazos.</p>
        <button className="pm-btn pm-btn-primary" onClick={onCreate}>
          Criar primeiro projeto
        </button>
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="pm-grid">
      {projects.map(p => {
        const tasks = tasksByProject[p.id] || [];
        const progress = computeProjectProgress(tasks);
        const health = HEALTH[computeProjectHealth(p, tasks)] || HEALTH.on_track;
        const HealthIcon = health.icon;
        const remaining = daysBetween(today, p.end_date);
        const assignees = [...new Set(tasks.map(t => t.assignee_email).filter(Boolean))];

        return (
          <div
            key={p.id}
            className="pm-card"
            style={{ borderTopColor: p.color || '#04D94F' }}
            onClick={() => onSelect(p.id)}
          >
            <div className="pm-card-head">
              <h3 className="pm-card-title">{p.name}</h3>
              <span className="pm-health" style={{ color: health.color, borderColor: health.color }}>
                <HealthIcon size={12} /> {health.label}
              </span>
            </div>
            {p.description && <p className="pm-card-desc">{p.description}</p>}

            <div className="pm-progress-shell">
              <div
                className="pm-progress-bar"
                style={{ width: `${progress}%`, background: p.color || '#04D94F' }}
              />
            </div>
            <div className="pm-progress-meta">
              <span>{progress}% concluído</span>
              <span>{tasks.filter(t => t.status === 'completed').length}/{tasks.length} tarefas</span>
            </div>

            <div className="pm-card-foot">
              <div className="pm-meta">
                <Calendar size={13} /> {formatBR(p.start_date)} → {formatBR(p.end_date)}
              </div>
              <div className="pm-meta">
                <Clock size={13} />
                {remaining >= 0 ? `${remaining} dias restantes` : `${Math.abs(remaining)} dias atrasado`}
              </div>
              {assignees.length > 0 && (
                <div className="pm-avatars">
                  <Users size={13} />
                  {assignees.slice(0, 3).map(a => (
                    <span key={a} className="pm-avatar" title={a}>
                      {a.charAt(0).toUpperCase()}
                    </span>
                  ))}
                  {assignees.length > 3 && <span className="pm-avatar more">+{assignees.length - 3}</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
