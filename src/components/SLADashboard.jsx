import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceLine, Legend
} from 'recharts';
import {
  Clock, CheckCircle2, AlertTriangle, TrendingDown, TrendingUp,
  Download, Settings, Users, Loader2, FileText, X, RefreshCw, ShieldCheck
} from 'lucide-react';
import './SLADashboard.css';

// Default SLA thresholds in hours
const DEFAULT_SLA = {
  'Manutenção Corretiva (Urgente)': 4,
  'Urgente': 4,
  'Elétrica': 24,
  'Hidráulica': 24,
  'Limpeza': 8,
  'Segurança': 12,
  'Jardinagem': 48,
  'Pintura': 72,
  'Padrão': 24,
};

function calcTMAHours(created, updated) {
  if (!created || !updated) return null;
  const c = new Date(created);
  const u = new Date(updated);
  if (isNaN(c) || isNaN(u) || u <= c) return null;
  return (u - c) / 1000 / 60 / 60;
}

function getShift(created) {
  if (!created) return 'Desconhecido';
  const hour = new Date(created).getHours();
  return hour >= 6 && hour < 18 ? 'Manhã' : 'Noite';
}

function getSLAThreshold(type, customSLA) {
  return customSLA[type] ?? customSLA['Padrão'] ?? 24;
}

function formatHours(h) {
  if (h === null || h === undefined) return '-';
  if (h < 1) return `${Math.round(h * 60)}min`;
  return `${h.toFixed(1)}h`;
}

const SLATooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="sla-tooltip">
      <p className="sla-tooltip-label">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatHours(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function SLADashboard({ currentCompany, currentUser }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customSLA, setCustomSLA] = useState(() => {
    const saved = localStorage.getItem('kabania_sla_config');
    return saved ? JSON.parse(saved) : DEFAULT_SLA;
  });
  const [showSLAConfig, setShowSLAConfig] = useState(false);
  const [slaEdit, setSlaEdit] = useState({});
  const [monthOffset, setMonthOffset] = useState(0);
  const reportRef = useRef(null);

  const fetchData = async () => {
    if (!currentCompany?.id) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('activities')
      .select('id, location, type, status, created, updated, collaborator')
      .eq('company_id', currentCompany.id)
      .eq('status', 'Concluída')
      .order('created', { ascending: false });
    if (!error && data) setActivities(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentCompany?.id]);

  // Filter by selected month
  const filteredActivities = useMemo(() => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return activities.filter(a => {
      const d = new Date(a.created);
      return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
    });
  }, [activities, monthOffset]);

  // Derive metrics
  const metrics = useMemo(() => {
    const withTMA = filteredActivities
      .map(a => ({ ...a, tma: calcTMAHours(a.created, a.updated), shift: getShift(a.created) }))
      .filter(a => a.tma !== null);

    if (!withTMA.length) return { kpi: null, byType: [], byShift: [], byCollab: [] };

    const totalTMA = withTMA.reduce((s, a) => s + a.tma, 0);
    const avgTMA = totalTMA / withTMA.length;
    const withinSLA = withTMA.filter(a => a.tma <= getSLAThreshold(a.type, customSLA));
    const slaRate = (withinSLA.length / withTMA.length) * 100;

    // Worst type by avg TMA
    const typeMap = {};
    withTMA.forEach(a => {
      const t = a.type || 'Geral';
      if (!typeMap[t]) typeMap[t] = [];
      typeMap[t].push(a.tma);
    });
    const byType = Object.entries(typeMap).map(([type, tmas]) => ({
      type: type.length > 20 ? type.slice(0, 18) + '…' : type,
      fullType: type,
      tma: parseFloat((tmas.reduce((s, v) => s + v, 0) / tmas.length).toFixed(2)),
      sla: getSLAThreshold(type, customSLA),
      count: tmas.length,
    })).sort((a, b) => b.tma - a.tma);

    const worstType = byType[0];

    // By shift
    const shiftMap = {};
    withTMA.forEach(a => {
      if (!shiftMap[a.shift]) shiftMap[a.shift] = [];
      shiftMap[a.shift].push(a.tma);
    });
    const shifts = ['Manhã', 'Noite'];
    const byShift = shifts.map(s => ({
      shift: s,
      tma: shiftMap[s] ? parseFloat((shiftMap[s].reduce((x, v) => x + v, 0) / shiftMap[s].length).toFixed(2)) : 0,
      count: shiftMap[s]?.length || 0,
    }));

    // By collaborator
    const collabMap = {};
    withTMA.forEach(a => {
      const c = a.collaborator || 'Sem colaborador';
      if (!collabMap[c]) collabMap[c] = [];
      collabMap[c].push(a.tma);
    });
    const byCollab = Object.entries(collabMap).map(([name, tmas]) => ({
      name,
      tma: parseFloat((tmas.reduce((s, v) => s + v, 0) / tmas.length).toFixed(2)),
      count: tmas.length,
      withinSLA: tmas.filter((t, i) => t <= getSLAThreshold(withTMA.filter(a => (a.collaborator || 'Sem colaborador') === name)[i]?.type, customSLA)).length,
    })).sort((a, b) => a.tma - b.tma).slice(0, 10);

    return {
      kpi: { avgTMA, slaRate, worstType: worstType?.fullType, bestCollab: byCollab[0]?.name, total: withTMA.length },
      byType, byShift, byCollab
    };
  }, [filteredActivities, customSLA]);

  const targetMonthLabel = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [monthOffset]);

  const handleExportPDF = () => {
    const html = reportRef.current?.innerHTML;
    if (!html) return;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Relatório SLA - ${currentCompany?.name} - ${targetMonthLabel}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 2rem; color: #1e293b; background: #fff; }
        h1 { color: #0052CC; font-size: 1.5rem; }
        h2 { color: #334155; font-size: 1.1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; margin-top: 2rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th { background: #f1f5f9; color: #475569; font-size: 0.8rem; text-transform: uppercase; padding: 0.6rem; text-align: left; }
        td { border-bottom: 1px solid #e2e8f0; padding: 0.6rem; font-size: 0.9rem; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1rem 0; }
        .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; text-align: center; }
        .kpi-val { font-size: 1.5rem; font-weight: 700; color: #0052CC; }
        .kpi-lbl { font-size: 0.75rem; color: #475569; margin-top: 0.25rem; }
        .footer { margin-top: 3rem; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
        .badge-ok { color: #16a34a; font-weight: 600; }
        .badge-fail { color: #dc2626; font-weight: 600; }
        .chart-note { color: #64748b; font-size: 0.8rem; font-style: italic; margin: 0.5rem 0 1rem; }
      </style>
    </head><body>
      <h1>📊 Relatório de SLA e Auditoria de Contratos</h1>
      <p><strong>Empresa:</strong> ${currentCompany?.name} &nbsp;|&nbsp; <strong>Período:</strong> ${targetMonthLabel} &nbsp;|&nbsp; <strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>

      <h2>KPIs do Período</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-val">${formatHours(metrics.kpi?.avgTMA)}</div><div class="kpi-lbl">TMA Geral</div></div>
        <div class="kpi"><div class="kpi-val">${metrics.kpi?.slaRate?.toFixed(1)}%</div><div class="kpi-lbl">Dentro do SLA</div></div>
        <div class="kpi"><div class="kpi-val">${metrics.kpi?.total}</div><div class="kpi-lbl">Concluídas</div></div>
        <div class="kpi"><div class="kpi-val">${metrics.kpi?.bestCollab?.split(' ')[0] || '-'}</div><div class="kpi-lbl">Melhor Colaborador</div></div>
      </div>

      <h2>TMA por Tipo de Serviço</h2>
      <p class="chart-note">Comparando tempo médio real vs. threshold de SLA configurado.</p>
      <table>
        <thead><tr><th>Tipo</th><th>TMA Médio</th><th>SLA Contrato</th><th>Qtd.</th><th>Status</th></tr></thead>
        <tbody>${metrics.byType.map(t => `
          <tr>
            <td>${t.fullType}</td>
            <td>${formatHours(t.tma)}</td>
            <td>${formatHours(t.sla)}</td>
            <td>${t.count}</td>
            <td class="${t.tma <= t.sla ? 'badge-ok' : 'badge-fail'}">${t.tma <= t.sla ? '✅ OK' : '🚨 Violado'}</td>
          </tr>`).join('')}
        </tbody>
      </table>

      <h2>Performance por Turno</h2>
      <table>
        <thead><tr><th>Turno</th><th>TMA Médio</th><th>Quantidade</th></tr></thead>
        <tbody>${metrics.byShift.map(s => `<tr><td>${s.shift}</td><td>${formatHours(s.tma)}</td><td>${s.count}</td></tr>`).join('')}</tbody>
      </table>

      <h2>Ranking de Colaboradores</h2>
      <table>
        <thead><tr><th>Colaborador</th><th>TMA Médio</th><th>Total Atendimentos</th></tr></thead>
        <tbody>${metrics.byCollab.map((c, i) => `<tr><td>${i + 1}. ${c.name}</td><td>${formatHours(c.tma)}</td><td>${c.count}</td></tr>`).join('')}</tbody>
      </table>

      <div class="footer">Relatório gerado automaticamente pelo <strong>Kabania / Synapse Smart</strong> · Dados precisos até ${new Date().toLocaleString('pt-BR')}</div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  const handleSaveSLA = () => {
    const merged = { ...customSLA, ...slaEdit };
    setCustomSLA(merged);
    localStorage.setItem('kabania_sla_config', JSON.stringify(merged));
    setShowSLAConfig(false);
  };

  return (
    <div className="sla-container animate-fade-in" ref={reportRef}>
      {/* Header */}
      <header className="sla-header">
        <div className="sla-header-left">
          <div className="sla-badge">SLA & AUDITORIA</div>
          <h1>Painel de SLA e Contratos</h1>
          <p>Monitoramento de Tempo Médio de Atendimento para <strong>{currentCompany?.name}</strong></p>
        </div>
        <div className="sla-header-actions">
          <div className="sla-month-nav">
            <button onClick={() => setMonthOffset(m => m - 1)}>‹</button>
            <span>{targetMonthLabel}</span>
            <button onClick={() => setMonthOffset(m => Math.min(0, m + 1))}>›</button>
          </div>
          <button className="sla-btn-config" onClick={() => { setSlaEdit({ ...customSLA }); setShowSLAConfig(true); }}>
            <Settings size={16} /> Configurar SLA
          </button>
          <button className="sla-btn-export" onClick={handleExportPDF}>
            <Download size={16} /> Exportar PDF
          </button>
          <button className="sla-btn-refresh" onClick={fetchData}>
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="sla-loading">
          <Loader2 size={32} className="animate-spin" />
          <p>Calculando métricas de SLA...</p>
        </div>
      ) : !metrics.kpi ? (
        <div className="sla-empty">
          <ShieldCheck size={64} opacity={0.3} />
          <h3>Sem dados para {targetMonthLabel}</h3>
          <p>Não há atividades concluídas neste período. Tente navegar para um mês anterior.</p>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="sla-kpi-grid">
            <div className="sla-kpi-card">
              <div className="sla-kpi-icon" style={{ background: 'rgba(0,82,204,0.1)', color: '#0052CC' }}>
                <Clock size={22} />
              </div>
              <div className="sla-kpi-body">
                <span className="sla-kpi-value">{formatHours(metrics.kpi.avgTMA)}</span>
                <span className="sla-kpi-label">TMA Geral</span>
              </div>
            </div>

            <div className="sla-kpi-card">
              <div className="sla-kpi-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                <CheckCircle2 size={22} />
              </div>
              <div className="sla-kpi-body">
                <span className="sla-kpi-value" style={{ color: metrics.kpi.slaRate >= 80 ? '#22c55e' : '#ef4444' }}>
                  {metrics.kpi.slaRate.toFixed(1)}%
                </span>
                <span className="sla-kpi-label">Dentro do SLA</span>
              </div>
            </div>

            <div className="sla-kpi-card">
              <div className="sla-kpi-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                <AlertTriangle size={22} />
              </div>
              <div className="sla-kpi-body">
                <span className="sla-kpi-value sla-kpi-text">{metrics.kpi.worstType || '-'}</span>
                <span className="sla-kpi-label">Tipo mais lento</span>
              </div>
            </div>

            <div className="sla-kpi-card">
              <div className="sla-kpi-icon" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>
                <Users size={22} />
              </div>
              <div className="sla-kpi-body">
                <span className="sla-kpi-value sla-kpi-text">{metrics.kpi.bestCollab?.split('@')[0] || '-'}</span>
                <span className="sla-kpi-label">Colaborador destaque</span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="sla-charts-row">
            {/* TMA by Type */}
            <div className="sla-chart-card sla-chart-wide">
              <div className="sla-chart-header">
                <h3><TrendingDown size={18} /> TMA por Tipo de Serviço vs. SLA</h3>
                <p>Barras em vermelho indicam violação do threshold contratual</p>
              </div>
              <div className="sla-chart-body">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.byType} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="type" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${v}h`} />
                    <Tooltip content={<SLATooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar dataKey="tma" name="TMA Real (h)" radius={[4, 4, 0, 0]}
                      fill="#0052CC"
                      label={({ x, y, width, value, index }) => {
                        const item = metrics.byType[index];
                        const breached = item && value > item.sla;
                        return (
                          <rect x={x} y={y} width={width} height="100%" fill={breached ? 'rgba(239,68,68,0.85)' : '#0052CC'} rx={4} />
                        );
                      }}
                    />
                    <Bar dataKey="sla" name="Threshold SLA (h)" fill="rgba(34,197,94,0.3)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Shift comparison */}
            <div className="sla-chart-card sla-chart-narrow">
              <div className="sla-chart-header">
                <h3><TrendingUp size={18} /> Turno Manhã vs. Noite</h3>
                <p>TMA médio comparado por horário de abertura</p>
              </div>
              <div className="sla-chart-body">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.byShift} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="shift" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={v => `${v}h`} />
                    <Tooltip content={<SLATooltip />} />
                    <Bar dataKey="tma" name="TMA Médio (h)" radius={[6, 6, 0, 0]}
                      fill="#0052CC"
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="sla-shift-legend">
                  {metrics.byShift.map(s => (
                    <div key={s.shift} className="sla-shift-item">
                      <span>{s.shift}</span>
                      <strong>{s.count} atend.</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Collaborator Ranking */}
          <div className="sla-ranking-card">
            <div className="sla-chart-header">
              <h3><Users size={18} /> Ranking de Colaboradores por TMA</h3>
              <p>Ordenado do mais rápido ao mais lento · Top 10</p>
            </div>
            <div className="sla-ranking-table-wrapper">
              <table className="sla-ranking-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Colaborador</th>
                    <th>TMA Médio</th>
                    <th>Atendimentos</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.byCollab.map((c, i) => (
                    <tr key={c.name} className={i === 0 ? 'sla-row-best' : ''}>
                      <td>
                        <span className={`sla-rank-badge ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td>{c.name.split('@')[0]}</td>
                      <td><strong>{formatHours(c.tma)}</strong></td>
                      <td>{c.count}</td>
                      <td>
                        <div className="sla-perf-bar-shell">
                          <div
                            className="sla-perf-bar"
                            style={{
                              width: `${Math.min(100, (metrics.byCollab[metrics.byCollab.length - 1].tma / c.tma) * 100)}%`,
                              background: i < 3 ? '#22c55e' : '#0052CC'
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SLA Configuration Modal */}
      {showSLAConfig && (
        <div className="sla-modal-overlay" onClick={() => setShowSLAConfig(false)}>
          <div className="sla-modal" onClick={e => e.stopPropagation()}>
            <div className="sla-modal-header">
              <h2><Settings size={20} /> Configurar Thresholds de SLA</h2>
              <button onClick={() => setShowSLAConfig(false)}><X size={20} /></button>
            </div>
            <div className="sla-modal-body">
              <p className="sla-modal-desc">
                Defina o tempo máximo de atendimento (em horas) para cada tipo de serviço conforme seu contrato.
                Atividades que superarem esses limites serão marcadas como <strong>violação de SLA</strong>.
              </p>
              {Object.entries(slaEdit).map(([type, hours]) => (
                <div key={type} className="sla-config-row">
                  <label>{type}</label>
                  <div className="sla-config-input-wrap">
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={hours}
                      onChange={e => setSlaEdit(prev => ({ ...prev, [type]: Number(e.target.value) }))}
                    />
                    <span>horas</span>
                  </div>
                </div>
              ))}
              <button
                className="sla-config-add"
                onClick={() => {
                  const type = prompt('Nome do tipo de serviço:');
                  if (type?.trim()) setSlaEdit(prev => ({ ...prev, [type.trim()]: 24 }));
                }}
              >
                + Adicionar tipo personalizado
              </button>
            </div>
            <div className="sla-modal-footer">
              <button className="sla-btn-cancel" onClick={() => setShowSLAConfig(false)}>Cancelar</button>
              <button className="sla-btn-save" onClick={handleSaveSLA}>Salvar Configuração</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
