import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  BarChart2, TrendingUp, Zap, Users, Clock, CheckCircle, 
  AlertCircle, Layout, ArrowRight, Sparkles, Loader2, RotateCcw 
} from 'lucide-react';
import { analyzeCompanyPerformance } from '../services/geminiService';
import './ReportsDashboard.css';

const COLUMN_COLORS = {
  backlog: '#94a3b8',
  todo: '#60a5fa',
  progress: '#fcd34d',
  ai: '#a78bfa',
  done: '#34d399'
};

const COLUMN_LABELS = {
  backlog: 'Backlog',
  todo: 'To Do',
  progress: 'Em Progresso',
  ai: 'Análise IA',
  done: 'Concluído'
};

// ---- Helpers ----
function getInitials(email) { return email ? email.substring(0, 2).toUpperCase() : '?'; }
function getAvatarColor(email) {
  const colors = ['#00e5ff', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#60a5fa'];
  let h = 0;
  for (let i = 0; i < email.length; i++) h = email.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}
function formatDate(isoDate) {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleDateString('pt-BR');
}
function getDeadlineStatus(deadline) {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: 'Atrasado', color: 'red', icon: '🚨', days };
  if (days <= 2) return { label: 'Urgente', color: 'orange', icon: '⏰', days };
  return { label: 'No prazo', color: 'green', icon: '📅', days };
}

export default function ReportsDashboard({ currentUser, currentCompany }) {
  // SWR Caching pattern: Load from cache instantly if available
  const [tasks, setTasks] = useState(() => {
    if (!currentCompany?.id) return [];
    const cached = localStorage.getItem(`reports_tasks_${currentCompany.id}`);
    return cached ? JSON.parse(cached) : [];
  });
  
  const [activities, setActivities] = useState(() => {
    if (!currentCompany?.id) return [];
    const cached = localStorage.getItem(`reports_activities_${currentCompany.id}`);
    return cached ? JSON.parse(cached) : [];
  });
  
  const [loading, setLoading] = useState(!tasks.length || !activities.length);
  const [syncing, setSyncing] = useState(false); // Background sync state

  const [chartData, setChartData] = useState(() => {
    if (!currentCompany?.id) return { productivity: [], sectors: [] };
    const cached = localStorage.getItem(`reports_charts_${currentCompany.id}`);
    return cached ? JSON.parse(cached) : { productivity: [], sectors: [] };
  });

  // AI Narrative Analysis state
  const [aiReport, setAiReport] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const runAiAnalysis = async () => {
    if (!currentCompany?.id) return;
    setIsAnalyzing(true);
    const metrics = {
      totalTasks: tasks.length,
      completionRate,
      inProgress: tasksByColumn.progress,
      deadlineAlerts: deadlineAlerts.length
    };
    const result = await analyzeCompanyPerformance(metrics, currentCompany.id);
    setAiReport(result);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!currentCompany?.id) return;
      
      // If we don't have cached data, show hard loading
      if (tasks.length === 0 && activities.length === 0) {
        setLoading(true);
      } else {
        setSyncing(true); // Silent background sync
      }
      
      try {
        // Fetch Only Necessary Columns for Tasks
        const { data: tData, error: tError } = await supabase
          .from('tasks')
          .select('id, title, column_id, tag_color, deadline, updated_at, created_at, assignees')
          .eq('company_id', currentCompany.id);

        // Fetch Only Necessary Columns for Activities
        const { data: aData, error: aError } = await supabase
          .from('activities')
          .select('id, type, status, created')
          .eq('company_id', currentCompany.id);

        if (!tError && tData) {
          const mappedTasks = tData.map(t => ({
            ...t,
            columnId: t.column_id,
            tagColor: t.tag_color
          }));
          
          setTasks(mappedTasks);
          setActivities(aData || []);
          
          // Persist to Cache
          localStorage.setItem(`reports_tasks_${currentCompany.id}`, JSON.stringify(mappedTasks));
          localStorage.setItem(`reports_activities_${currentCompany.id}`, JSON.stringify(aData || []));
          
          processChartConfigs(mappedTasks, aData || []);
        }
      } catch (err) {
        console.error("Erro no dashboard:", err);
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    };

    fetchData();
  }, [currentCompany]);

  const processChartConfigs = (allTasks, allActivities) => {
    // 1. Productivity (Last 7 Days)
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const prodMap = allTasks
      .filter(t => t.columnId === 'done')
      .reduce((acc, t) => {
        const date = t.updated_at?.split('T')[0] || t.created_at?.split('T')[0];
        if (date) acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

    const productivityData = last7Days.map(date => ({
      name: date.split('-').reverse().slice(0, 2).join('/'),
      entregas: prodMap[date] || 0
    }));

    // 2. Sectors (Distribution)
    const sectorMap = allActivities.reduce((acc, a) => {
      const type = a.type || 'Geral';
      const cleanType = type.split('-')[0].trim();
      acc[cleanType] = (acc[cleanType] || 0) + 1;
      return acc;
    }, {});

    const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value }));
    const newChartData = { productivity: productivityData, sectors: sectorData };
    
    setChartData(newChartData);
    if (currentCompany?.id) {
       localStorage.setItem(`reports_charts_${currentCompany.id}`, JSON.stringify(newChartData));
    }
  };

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

  const deadlineAlerts = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    return tasks
      .filter(t => t && t.deadline && t.columnId !== 'done')
      .map(t => ({ ...t, deadlineStatus: getDeadlineStatus(t.deadline) }))
      .filter(t => t.deadlineStatus && t.deadlineStatus.days <= 5)
      .sort((a, b) => (a.deadlineStatus?.days || 0) - (b.deadlineStatus?.days || 0))
      .slice(0, 8);
  }, [tasks]);

  const recentTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    return [...tasks]
      .filter(t => t && t.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);
  }, [tasks]);

  const PIE_COLORS = ['#00e5ff', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#60a5fa'];

  return (
    <div className="rd-container animate-fade-in">
      {syncing && (
         <div className="fixed top-4 right-4 flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 backdrop-blur-sm z-50">
           <Zap size={12} className="animate-pulse" /> Sincronizando dados...
         </div>
      )}
      <header className="rd-header">
        <h1><BarChart2 size={24} /> Relatórios e Dashboard</h1>
        <p>Visão geral de produtividade e acompanhamento de tarefas para {currentCompany?.name}</p>
      </header>

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

      {/* AI Narrative Analysis Section */}
      <div className="rd-ai-analysis-box animate-slide-up">
        <div className="rd-ai-header">
          <Sparkles size={18} className="text-cyan-400" />
          <h2>Análise Estratégica da IA</h2>
        </div>
        {aiReport ? (
          <div className="rd-ai-content text-main">
            <p>{aiReport}</p>
            <button className="rd-ai-retry-btn" onClick={runAiAnalysis} disabled={isAnalyzing}>
               <RotateCcw size={14} className={isAnalyzing ? 'animate-spin' : ''} /> Refazer Análise
            </button>
          </div>
        ) : (
          <div className="rd-ai-cta">
            <p className="text-muted">A IA pode analisar esses números e sugerir ações de melhoria baseadas no Hub Corporativo.</p>
            <button className="rd-ai-gen-btn" onClick={runAiAnalysis} disabled={isAnalyzing}>
              {isAnalyzing ? <><Loader2 size={16} className="animate-spin" /> Analisando métricas...</> : 'Gerar Insight Estratégico'}
            </button>
          </div>
        )}
      </div>

      {/* NEW: Visual Charts Section */}
      <div className="rd-visuals-grid">
        <div className="rd-card rd-chart-box">
          <div className="rd-chart-title">
            <h3><TrendingUp size={16} /> Fluxo de Produtividade</h3>
            <span>Últimos 7 dias</span>
          </div>
          <div className="rd-chart-body">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-50 text-sm">
                <TrendingUp size={32} className="mb-2 opacity-50" />
                <p>Nenhuma tarefa registrada.</p>
                <span className="text-xs">Crie tarefas no Kanban para ver o fluxo.</span>
              </div>
            ) : chartData.productivity.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full opacity-50">Carregando...</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData.productivity}>
                  <defs>
                    <linearGradient id="rdColorProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Area 
                    key={`area-${chartData.productivity.length}`}
                    type="monotone" 
                    dataKey="entregas" 
                    stroke="#00e5ff" 
                    fillOpacity={1} 
                    fill="url(#rdColorProd)" 
                    strokeWidth={2} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rd-card rd-chart-box">
          <div className="rd-chart-title">
            <h3><Zap size={16} /> Volume por Atividade</h3>
            <span>Mix de serviços</span>
          </div>
          <div className="rd-chart-body">
            {chartData.sectors.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-50 text-sm">
                <Zap size={32} className="mb-2 opacity-50" />
                <p>Nenhuma atividade registrada.</p>
                <span className="text-xs">Registre horas/serviços para ver a distribuição.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    key={`pie-${chartData.sectors.length}`}
                    data={chartData.sectors}
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.sectors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rd-grid">
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
