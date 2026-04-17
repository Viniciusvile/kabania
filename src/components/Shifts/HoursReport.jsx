import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, Clock, AlertTriangle, CheckCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const PERIODS = [
  { id: 'week',      label: 'Esta semana' },
  { id: 'last_week', label: 'Semana anterior' },
  { id: 'month',     label: 'Este mês' },
  { id: 'custom',    label: 'Personalizado' }
];

function getPeriodRange(period, customStart, customEnd) {
  const now = new Date();
  if (period === 'week') {
    const day = now.getDay() || 7;
    const start = new Date(now);
    start.setDate(now.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'last_week') {
    const day = now.getDay() || 7;
    const end = new Date(now);
    end.setDate(now.getDate() - day);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'custom' && customStart && customEnd) {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  return null;
}

function StatusBadge({ status }) {
  if (status === 'over')
    return <span className="hr-status-badge hr-status-over"><AlertTriangle size={11} /> Acima do limite</span>;
  if (status === 'warning')
    return <span className="hr-status-badge hr-status-warn"><Clock size={11} /> Próximo do limite</span>;
  return <span className="hr-status-badge hr-status-ok"><CheckCircle size={11} /> Dentro do limite</span>;
}

function fmtHours(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}

export default function HoursReport({ companyId, employees, onClose }) {
  const [period, setPeriod]         = useState('week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]   = useState('');
  const [rawShifts, setRawShifts]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [sortBy, setSortBy]         = useState('hours_desc');

  useEffect(() => {
    const range = getPeriodRange(period, customStart, customEnd);
    if (!range || !companyId) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data: shiftsData } = await supabase
        .from('shifts')
        .select('id, start_time, end_time, status')
        .eq('company_id', companyId)
        .gte('start_time', range.start.toISOString())
        .lte('start_time', range.end.toISOString());

      if (cancelled || !shiftsData) { setLoading(false); return; }

      const ids = shiftsData.map(s => s.id);
      let assignments = [];
      if (ids.length > 0) {
        const { data } = await supabase
          .from('shift_assignments')
          .select('shift_id, employee_id, collaborator_id, status')
          .in('shift_id', ids);
        assignments = data || [];
      }

      const enriched = shiftsData.map(s => ({
        ...s,
        assignments: assignments.filter(a => a.shift_id === s.id)
      }));

      if (!cancelled) {
        setRawShifts(enriched);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [period, customStart, customEnd, companyId]);

  const isMonthView = period === 'month';

  const employeeStats = useMemo(() => {
    const rows = employees.map(emp => {
      const empId = emp.shift_profile_id || emp.id;
      const empShifts = rawShifts.filter(s =>
        s.assignments.some(a => a.employee_id === empId || a.collaborator_id === empId)
      );

      let totalMinutes = 0;
      let concludedCount = 0;
      empShifts.forEach(s => {
        const dur = (new Date(s.end_time) - new Date(s.start_time)) / 60000;
        if (dur > 0) totalMinutes += dur;
        if (s.status === 'concluded' || s.status === 'completed') concludedCount++;
      });

      const totalHours = totalMinutes / 60;
      const weeklyLimit  = emp.max_weekly_hours || 44;
      const maxHours     = isMonthView ? weeklyLimit * 4 : weeklyLimit;
      const percentage   = maxHours > 0 ? Math.min((totalHours / maxHours) * 100, 110) : 0;
      const status =
        totalHours > maxHours        ? 'over' :
        totalHours > maxHours * 0.85 ? 'warning' : 'ok';

      return {
        ...emp,
        totalHours: Math.round(totalHours * 10) / 10,
        maxHours,
        percentage,
        status,
        shiftCount: empShifts.length,
        concludedCount
      };
    });

    return rows.sort((a, b) => {
      if (sortBy === 'hours_desc')  return b.totalHours - a.totalHours;
      if (sortBy === 'hours_asc')   return a.totalHours - b.totalHours;
      if (sortBy === 'alpha')       return a.name.localeCompare(b.name);
      if (sortBy === 'status')      return ['over','warning','ok'].indexOf(a.status) - ['over','warning','ok'].indexOf(b.status);
      return 0;
    });
  }, [employees, rawShifts, isMonthView, sortBy]);

  const exportCSV = () => {
    const range = getPeriodRange(period, customStart, customEnd);
    const header = 'Nome,Horas Trabalhadas,Limite de Horas,Utilização (%),Escalas,Concluídas,Status';
    const rows = employeeStats.map(e =>
      `"${e.name}",${e.totalHours},${e.maxHours},${Math.round(e.percentage)},${e.shiftCount},${e.concludedCount},${
        e.status === 'over' ? 'Acima do limite' : e.status === 'warning' ? 'Próximo do limite' : 'Ok'
      }`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `folha-de-ponto-${period}-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const overCount  = employeeStats.filter(e => e.status === 'over').length;
  const warnCount  = employeeStats.filter(e => e.status === 'warning').length;
  const totalHours = employeeStats.reduce((s, e) => s + e.totalHours, 0);

  return (
    <div className="modal-overlay-pixel glass-morphism" style={{ zIndex: 9999 }} onClick={onClose}>
      <div
        className="premium-modal-pixel animate-slide-up hr-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="premium-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={20} className="text-accent" />
            <h3 style={{ margin: 0, fontWeight: 800 }}>Folha de Ponto</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="glow-btn-ghost" style={{ padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={exportCSV}>
              <Download size={14} /> Exportar CSV
            </button>
            <button className="premium-close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Controls */}
        <div className="hr-controls">
          <div className="hr-period-pills">
            {PERIODS.map(p => (
              <button
                key={p.id}
                className={`hr-pill ${period === p.id ? 'active' : ''}`}
                onClick={() => setPeriod(p.id)}
              >{p.label}</button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="hr-custom-range">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>até</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
          )}

          <div className="hr-sort-select">
            <ChevronDown size={14} style={{ pointerEvents: 'none', position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="hours_desc">Mais horas primeiro</option>
              <option value="hours_asc">Menos horas primeiro</option>
              <option value="alpha">Alfabético</option>
              <option value="status">Por status</option>
            </select>
          </div>
        </div>

        {/* Summary cards */}
        <div className="hr-summary-row">
          <div className="hr-summary-card">
            <span className="hr-summary-label">Total de Horas</span>
            <span className="hr-summary-value blue">{fmtHours(totalHours)}</span>
          </div>
          <div className="hr-summary-card">
            <span className="hr-summary-label">Colaboradores</span>
            <span className="hr-summary-value">{employeeStats.length}</span>
          </div>
          {overCount > 0 && (
            <div className="hr-summary-card">
              <span className="hr-summary-label">Acima do limite</span>
              <span className="hr-summary-value red">{overCount}</span>
            </div>
          )}
          {warnCount > 0 && (
            <div className="hr-summary-card">
              <span className="hr-summary-label">Próximos do limite</span>
              <span className="hr-summary-value amber">{warnCount}</span>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="hr-table-wrapper custom-scrollbar">
          {loading ? (
            <div className="hr-empty">
              <div className="sync-pulse-dot" style={{ margin: '0 auto 12px' }} />
              <p>Carregando dados...</p>
            </div>
          ) : employeeStats.length === 0 ? (
            <div className="hr-empty">
              <Clock size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
              <p>Nenhum colaborador cadastrado.</p>
            </div>
          ) : (
            <table className="hr-table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Escalas</th>
                  <th>Horas / Limite</th>
                  <th style={{ minWidth: '180px' }}>Utilização</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employeeStats.map(emp => (
                  <tr key={emp.id} className={emp.status === 'over' ? 'hr-row-over' : ''}>
                    <td>
                      <div className="hr-emp-cell">
                        <div className="emp-avatar-premium" style={{ width: '32px', height: '32px', fontSize: '12px', flexShrink: 0 }}>
                          {emp.avatar_url
                            ? <img src={emp.avatar_url} alt="" />
                            : <span>{emp.name?.[0] || '?'}</span>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px' }}>{emp.name}</div>
                          {emp.role && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.role}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{emp.shiftCount}</span>
                      {emp.concludedCount > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                          ({emp.concludedCount} concl.)
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {fmtHours(emp.totalHours)}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '12px' }}>
                        {' '}/ {emp.maxHours}h
                      </span>
                    </td>
                    <td>
                      <div className="hr-bar-track">
                        <div
                          className={`hr-bar-fill hr-bar-${emp.status}`}
                          style={{ width: `${Math.min(emp.percentage, 100)}%` }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                        {Math.round(emp.percentage)}%
                      </span>
                    </td>
                    <td><StatusBadge status={emp.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
