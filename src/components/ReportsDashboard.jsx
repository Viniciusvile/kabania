import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart2, Clock, Users, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { getDeadlineStatus } from '../services/notificationService';
import './ReportsDashboard.css';

const COLUMN_LABELS = {
  backlog: 'Backlog',
  todo: 'To Do',
  progress: 'Em Progresso',
  ai: 'AI Analysis',
  done: 'Concluído'
};

const COLUMN_COLORS = {
  backlog: '#64748b',
  todo: '#60a5fa',
  progress: '#fbbf24',
  ai: '#00e5ff',
  done: '#34d399'
};

function getInitials(email) {
  return email ? email.substring(0, 2).toUpperCase() : '??';
}
function getAvatarColor(email) {
  const colors = ['#00e5ff', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#60a5fa'];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
function formatDate(isoDate) {
  if (!isoDate) return '';
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function ReportsDashboard({ currentUser, currentCompany }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllCompanyTasks = async () => {
      if (!currentCompany?.id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('company_id', currentCompany.id);

      if (!error && data) {
        const mapped = data.map(t => ({
          ...t,
          columnId: t.column_id,
          tagColor: t.tag_color
        }));
        setTasks(mapped);
      }
      setLoading(false);
    };

    fetchAllCompanyTasks();
  }, [currentCompany]);
  // Tasks by column
  const tasksByColumn = useMemo(() => {
    const counts = { backlog: 0, todo: 0, progress: 0, ai: 0, done: 0 };
    if (!Array.isArray(tasks)) return counts;
    tasks.forEach(t => { if (counts[t.columnId] !== undefined) counts[t.columnId]++; });
    return counts;
  }, [tasks]);

  const totalTasks = tasks.length;
  const completedTasks = tasksByColumn.done;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const maxCount = Math.max(...Object.values(tasksByColumn), 1);

  // Tasks by assignee
  const tasksByAssignee = useMemo(() => {
    const map = {};
    if (!Array.isArray(tasks)) return [];
    tasks.forEach(t => {
      (t.assignees || []).forEach(email => {
        if (!map[email]) map[email] = { total: 0, done: 0 };
        map[email].total++;
        if (t.columnId === 'done') map[email].done++;
      });
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [tasks]);

  // Deadline alerts
  const deadlineAlerts = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    return tasks
      .filter(t => t && t.deadline && t.columnId !== 'done')
      .map(t => ({ ...t, deadlineStatus: getDeadlineStatus(t.deadline) }))
      .filter(t => t.deadlineStatus && t.deadlineStatus.days <= 5)
      .sort((a, b) => (a.deadlineStatus?.days || 0) - (b.deadlineStatus?.days || 0))
      .slice(0, 8);
  }, [tasks]);

  // Recent tasks (last 8 added)
  const recentTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    return [...tasks]
      .filter(t => t && t.id && typeof t.id === 'string')
      .sort((a, b) => {
        const aTime = parseInt(a.id.replace('t_', '')) || 0;
        const bTime = parseInt(b.id.replace('t_', '')) || 0;
        return bTime - aTime;
      })
      .slice(0, 8);
  }, [tasks]);

  return (
    <div className="rd-container animate-fade-in">
      <header className="rd-header">
        <h1><BarChart2 size={24} /> Relatórios e Dashboard</h1>
        <p>Visão geral de produtividade e acompanhamento de tarefas</p>
      </header>

      {/* Summary KPI cards */}
      <div className="rd-kpi-row">
        <div className="rd-kpi">
          <div className="rd-kpi-value">{totalTasks}</div>
          <div className="rd-kpi-label">Total de Tarefas</div>
        </div>
        <div className="rd-kpi rd-kpi-green">
          <div className="rd-kpi-value">{completedTasks}</div>
          <div className="rd-kpi-label">Concluídas</div>
        </div>
        <div className="rd-kpi rd-kpi-cyan">
          <div className="rd-kpi-value">{completionRate}%</div>
          <div className="rd-kpi-label">Taxa de Conclusão</div>
        </div>
        <div className="rd-kpi rd-kpi-yellow">
          <div className="rd-kpi-value">{deadlineAlerts.length}</div>
          <div className="rd-kpi-label">Alertas de Prazo</div>
        </div>
      </div>

      <div className="rd-grid">
        {/* Column Chart */}
        <div className="rd-card rd-chart-card">
          <h3><BarChart2 size={16} /> Tarefas por Coluna</h3>
          <div className="rd-bar-chart">
            {Object.entries(tasksByColumn).map(([colId, count]) => (
              <div key={colId} className="rd-bar-row">
                <span className="rd-bar-label">{COLUMN_LABELS[colId]}</span>
                <div className="rd-bar-track">
                  <div
                    className="rd-bar-fill"
                    style={{
                      width: `${(count / maxCount) * 100}%`,
                      background: COLUMN_COLORS[colId]
                    }}
                  />
                </div>
                <span className="rd-bar-value" style={{ color: COLUMN_COLORS[colId] }}>{count}</span>
              </div>
            ))}
          </div>

          {/* Completion arc */}
          <div className="rd-completion-arc">
            <svg viewBox="0 0 120 70" width="140" height="84">
              <path d="M 10 65 A 55 55 0 0 1 110 65" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
              <path
                d="M 10 65 A 55 55 0 0 1 110 65"
                fill="none"
                stroke="#34d399"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(completionRate / 100) * 172} 172`}
              />
            </svg>
            <div className="rd-arc-label">
              <strong>{completionRate}%</strong>
              <span>Concluído</span>
            </div>
          </div>
        </div>

        {/* Assignee workload */}
        <div className="rd-card">
          <h3><Users size={16} /> Carga por Membro</h3>
          {tasksByAssignee.length === 0 && (
            <p className="rd-empty">Nenhuma tarefa atribuída ainda.</p>
          )}
          <div className="rd-assignee-list">
            {tasksByAssignee.map(([email, data]) => (
              <div key={email} className="rd-assignee-row">
                <div className="rd-a-avatar" style={{ background: getAvatarColor(email) }}>
                  {getInitials(email)}
                </div>
                <div className="rd-a-info">
                  <span className="rd-a-name">{email === currentUser ? 'Você' : email.split('@')[0]}</span>
                  <div className="rd-a-bar-track">
                    <div
                      className="rd-a-bar-fill"
                      style={{ width: `${(data.done / Math.max(data.total, 1)) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="rd-a-count">{data.done}/{data.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Deadline Alerts */}
        <div className="rd-card">
          <h3><Clock size={16} /> Alertas de Prazo</h3>
          {deadlineAlerts.length === 0 ? (
            <div className="rd-empty-deadline">
              <CheckCircle size={28} color="#34d399" />
              <p>Nenhuma tarefa com prazo crítico!</p>
            </div>
          ) : (
            <div className="rd-deadline-list">
              {deadlineAlerts.map(task => (
                <div key={task.id} className={`rd-deadline-row rd-dl-${task.deadlineStatus.color}`}>
                  <span className="rd-dl-icon">{task.deadlineStatus.icon}</span>
                  <div className="rd-dl-info">
                    <span className="rd-dl-title">{task.title}</span>
                    <span className="rd-dl-date">{formatDate(task.deadline)}</span>
                  </div>
                  <span className="rd-dl-badge">{task.deadlineStatus.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rd-card">
          <h3><TrendingUp size={16} /> Tarefas Recentes</h3>
          {recentTasks.length === 0 && (
            <p className="rd-empty">Nenhuma tarefa criada ainda.</p>
          )}
          <div className="rd-recent-list">
            {recentTasks.map(task => (
              <div key={task.id} className="rd-recent-row">
                <div
                  className="rd-recent-dot"
                  style={{ background: COLUMN_COLORS[task.columnId] || '#64748b' }}
                />
                <div className="rd-recent-info">
                  <span className="rd-recent-title">{task.title}</span>
                  <span
                    className="rd-recent-col"
                    style={{ color: COLUMN_COLORS[task.columnId] || '#64748b' }}
                  >
                    {COLUMN_LABELS[task.columnId] || task.columnId}
                  </span>
                </div>
                {task.assignees?.length > 0 && (
                  <div className="rd-recent-avatars">
                    {task.assignees.slice(0, 3).map(email => (
                      <div
                        key={email}
                        className="rd-r-avatar"
                        style={{ background: getAvatarColor(email) }}
                        title={email}
                      >
                        {getInitials(email)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
