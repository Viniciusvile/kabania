import React, { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, Calendar, AlertCircle, Zap, Loader2, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';
import { analyzeProductivity, generateWeeklySummary, suggestPrioritization, detectBottlenecks } from '../services/geminiService';
import './AIInsights.css';

export default function AIInsights({ currentUser, currentCompany }) {
  const [loading, setLoading] = useState({
    productivity: false,
    summary: false,
    priority: false,
    bottlenecks: false
  });

  const [results, setResults] = useState({
    productivity: '',
    summary: '',
    priority: '',
    bottlenecks: ''
  });

  const getKanbanData = () => {
    try {
      const tasks = JSON.parse(localStorage.getItem(`synapseTasks_${currentUser}`) || '[]');
      return tasks;
    } catch { return []; }
  };

  const getActivitiesData = () => {
    try {
      const STORAGE_KEY = 'synapseActivities_v2';
      const stored = localStorage.getItem(STORAGE_KEY);
      const activities = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(activities)) return [];
      return activities.filter(a => a.companyId === currentCompany?.id);
    } catch { return []; }
  };

  const runAnalysis = async (type) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    let res = '';
    
    const kanbanData = getKanbanData();
    const activitiesData = getActivitiesData();

    switch(type) {
      case 'productivity':
        res = await analyzeProductivity({ kanban: kanbanData, activities: activitiesData });
        break;
      case 'summary':
        res = await generateWeeklySummary(activitiesData);
        break;
      case 'priority':
        res = await suggestPrioritization(kanbanData);
        break;
      case 'bottlenecks':
        res = await detectBottlenecks(kanbanData);
        break;
      default: break;
    }

    setResults(prev => ({ ...prev, [type]: res }));
    setLoading(prev => ({ ...prev, [type]: false }));
  };

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
              <button className="ai-btn-reset" onClick={() => setResults(prev => ({ ...prev, [type]: '' }))}>
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
