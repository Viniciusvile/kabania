import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Calendar, AlertCircle, Zap, Loader2, Sparkles, CheckCircle2, RotateCcw, LineChart } from 'lucide-react';
import { analyzeProductivity, generateWeeklySummary, suggestPrioritization, detectBottlenecks, predictDemand } from '../services/geminiService';
import './AIInsights.css';

export default function AIInsights({ currentUser, currentCompany }) {
  const getCacheKey = (type) => `kabania_ai_${type}_${currentCompany?.id}`;

  const [loading, setLoading] = useState({
    productivity: false,
    summary: false,
    priority: false,
    bottlenecks: false,
    demand: false,
    data: false
  });

  const [results, setResults] = useState(() => {
    // Initial load from cache
    return {
      productivity: localStorage.getItem(getCacheKey('productivity')) || '',
      summary: localStorage.getItem(getCacheKey('summary')) || '',
      priority: localStorage.getItem(getCacheKey('priority')) || '',
      bottlenecks: localStorage.getItem(getCacheKey('bottlenecks')) || '',
      demand: localStorage.getItem(getCacheKey('demand')) || ''
    };
  });

  const [selectedHub, setSelectedHub] = useState('corporativo');

  const [chartData, setChartData] = useState(() => {
    // Initial load from cache
    const cachedCharts = localStorage.getItem(getCacheKey('charts'));
    return cachedCharts ? JSON.parse(cachedCharts) : { productivity: [], sectors: [] };
  });

  useEffect(() => {
    fetchRealTimeData();
  }, [currentCompany?.id]);

  const fetchRealTimeData = async () => {
    if (!currentCompany?.id) return;
    setLoading(prev => ({ ...prev, data: true }));

    try {
      // Fetch Kanban Tasks
      const { data: tasks, error: tError } = await supabase
        .from('tasks')
        .select('*')
        .eq('company_id', currentCompany.id);

      // Fetch Activities
      const { data: activities, error: aError } = await supabase
        .from('activities')
        .select('*')
        .eq('company_id', currentCompany.id);

      if (!tError && !aError) {
        processChartData(tasks, activities);
      }
    } catch (err) {
      console.error("Erro ao buscar dados para gráficos:", err);
    } finally {
      // Add a slight delay to allow smooth skeleton transition if data is fast
      setTimeout(() => setLoading(prev => ({ ...prev, data: false })), 300);
    }
  };

  const processChartData = (tasks, activities) => {
    // 1. Productivity (Last 7 Days)
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const prodMap = tasks
      .filter(t => t.column_id === 'done')
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
    const sectorMap = activities.reduce((acc, a) => {
      const type = a.type || 'Geral';
      const cleanType = type.split('-')[0].trim();
      acc[cleanType] = (acc[cleanType] || 0) + 1;
      return acc;
    }, {});

    const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value }));

    const newChartData = { productivity: productivityData, sectors: sectorData };
    setChartData(newChartData);
    localStorage.setItem(getCacheKey('charts'), JSON.stringify(newChartData));
  };

  const runAnalysis = async (type) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    let res = '';
    
    // Refresh data before analysis to ensure Gemini has latest context
    const { data: tasks } = await supabase.from('tasks').select('*').eq('company_id', currentCompany.id);
    const { data: activities } = await supabase.from('activities').select('*').eq('company_id', currentCompany.id);

    const coName = currentCompany?.name || 'Empresa';
    const coId = currentCompany?.id;
    
    switch(type) {
      case 'productivity':
        res = await analyzeProductivity({ kanban: tasks || [], activities: activities || [] }, coName, coId, selectedHub);
        break;
      case 'summary':
        res = await generateWeeklySummary(activities || [], coName, coId, selectedHub);
        break;
      case 'priority':
        res = await suggestPrioritization(tasks || [], coName, coId, selectedHub);
        break;
      case 'bottlenecks':
        res = await detectBottlenecks(tasks || [], coName, coId, selectedHub);
        break;
      case 'demand':
        res = await predictDemand(activities || [], coName, coId, selectedHub);
        break;
      default: break;
    }

    setResults(prev => ({ ...prev, [type]: res }));
    localStorage.setItem(getCacheKey(type), res);
    setLoading(prev => ({ ...prev, [type]: false }));
  };

  const PIE_COLORS = ['#00e5ff', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#60a5fa'];

  const InsightCard = ({ title, icon: Icon, type, description, colorClass }) => (
    <div className={`ai-insight-card ${colorClass}`}>
      <div className="ai-card-header">
        <div className="ai-icon-box">
          <Icon size={24} />
        </div>
        <div className="ai-title-box">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      
      <div className="ai-card-content">
        {results[type] ? (
          <div className="ai-result-box animate-slide-up">
            <div className="ai-result-header">
              <Sparkles size={14} /> <span>Insight da IA</span>
            </div>
            <div className="ai-result-text">
              {results[type].split('\n').map((line, i) => <p key={i}>{line}</p>)}
            </div>
            <div className="ai-card-actions">
              <button className="ai-btn-refresh" onClick={() => runAnalysis(type)}>
                <Loader2 size={14} className={loading[type] ? 'animate-spin' : ''} /> Recalcular
              </button>
              <button className="ai-btn-reset" onClick={() => {
                setResults(prev => ({ ...prev, [type]: '' }));
                localStorage.removeItem(getCacheKey(type));
              }}>
                <RotateCcw size={14} /> Resetar
              </button>
            </div>
          </div>
        ) : (
          <button 
            className="ai-btn-generate" 
            onClick={() => runAnalysis(type)}
            disabled={loading[type]}
          >
            {loading[type] ? (
              <><Loader2 size={18} className="animate-spin" /> Analisando...</>
            ) : (
              <><Zap size={18} /> Gerar Insight</>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="ai-insights-container animate-fade-in">
      <header className="ai-header">
        <div className="ai-header-main">
          <div className="ai-badge">INTELIGÊNCIA ARTIFICIAL</div>
          <h1>Insights de IA</h1>
          <p>Análise avançada de produtividade e padrões para {currentCompany?.name}</p>
          
          <div className="ai-hub-selector">
            <span className="ai-hub-label">Foco da IA:</span>
            <div className="ai-hub-options">
              {['operacional', 'corporativo', 'inteligencia'].map(hub => (
                <button 
                  key={hub} 
                  className={`ai-hub-btn ${selectedHub === hub ? 'active' : ''}`}
                  onClick={() => setSelectedHub(hub)}
                >
                  {hub === 'operacional' && '⚙️ Operacional'}
                  {hub === 'corporativo' && '💼 Corporativo'}
                  {hub === 'inteligencia' && '🧠 Inteligência'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="ai-header-stats">
          <div className="ai-mini-stat">
            <span className="label">Precisão</span>
            <span className="value">98.4%</span>
          </div>
          <div className="ai-mini-stat">
            <span className="label">Status</span>
            <span className="value text-green-500">Online</span>
          </div>
        </div>
      </header>

      {/* NEW: Visual Charts Section */}
      <section className="ai-visuals-grid">
        <div className="ai-chart-card">
          <div className="ai-chart-header">
            <h3><TrendingUp size={18} /> Fluxo de Entregas</h3>
            <p>Tarefas concluídas nos últimos 7 dias</p>
          </div>
          <div className="ai-chart-body">
            {loading.data && chartData.productivity.length === 0 ? (
              <div className="chart-skeleton skeleton-pulse"></div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData.productivity}>
                  <defs>
                    <linearGradient id="colorEntregas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                    itemStyle={{ color: '#00e5ff' }}
                  />
                  <Area type="monotone" dataKey="entregas" stroke="#00e5ff" fillOpacity={1} fill="url(#colorEntregas)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="ai-chart-card">
          <div className="ai-chart-header">
            <h3><Zap size={18} /> Distribuição por Setor</h3>
            <p>Mix de atividades atuais</p>
          </div>
          <div className="ai-chart-body pie-chart-body">
            {loading.data && chartData.sectors.length === 0 ? (
              <div className="chart-skeleton skeleton-pulse" style={{ borderRadius: '50%', width: '160px', height: '160px', margin: 'auto' }}></div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={chartData.sectors}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.sectors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <div className="ai-grid">
        <InsightCard 
          title="Análise de Produtividade"
          icon={TrendingUp}
          type="productivity"
          description="Padrões do Kanban e sugestões de melhoria"
          colorClass="cyan"
        />
        <InsightCard 
          title="Resumo Semanal"
          icon={Calendar}
          type="summary"
          description="Relatório automatizado de todas as atividades"
          colorClass="purple"
        />
        <InsightCard 
          title="Priorização Inteligente"
          icon={CheckCircle2}
          type="priority"
          description="Sugestão baseada em prazos e importância"
          colorClass="green"
        />
        <InsightCard 
          title="Previsão de Demanda"
          icon={LineChart}
          type="demand"
          description="Previsão dos próximos tipos de serviços focados"
          colorClass="blue"
        />
        <InsightCard 
          title="Detecção de Gargalos"
          icon={AlertCircle}
          type="bottlenecks"
          description="Identifica tarefas paradas ou colunas cheias"
          colorClass="orange"
        />
      </div>
    </div>
  );
}
