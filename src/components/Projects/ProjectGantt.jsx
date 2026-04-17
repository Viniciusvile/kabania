import React, { useMemo, useState } from 'react';
import { Plus, Trash2, ZoomIn, ZoomOut } from 'lucide-react';

const STATUS_COLORS = {
  pending:     { bg: 'rgba(148, 163, 184, 0.45)', border: '#94a3b8' },
  in_progress: { bg: 'rgba(14, 165, 233, 0.55)',  border: '#0ea5e9' },
  completed:   { bg: 'rgba(16, 185, 129, 0.55)',  border: '#10b981' },
  blocked:     { bg: 'rgba(239, 68, 68, 0.55)',   border: '#ef4444' }
};

const ZOOMS = [
  { id: 'day',   label: 'Dia',     pxPerDay: 48 },
  { id: 'week',  label: 'Semana',  pxPerDay: 18 },
  { id: 'month', label: 'Mês',     pxPerDay: 6 }
];

function dayDiff(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function ymd(d) {
  return new Date(d).toISOString().slice(0, 10);
}

export default function ProjectGantt({
  project,
  phases,
  tasksByPhase,
  onTaskClick,
  onAddTask,
  onDeletePhase
}) {
  const [zoomId, setZoomId] = useState('day');
  const zoom = ZOOMS.find(z => z.id === zoomId);
  const pxPerDay = zoom.pxPerDay;

  // Determine timeline span
  const allTasks = Object.values(tasksByPhase).flat();
  const dates = [
    project.start_date,
    project.end_date,
    ...allTasks.flatMap(t => [t.start_date, t.end_date]).filter(Boolean)
  ];
  const minDate = dates.reduce((a, b) => (new Date(a) < new Date(b) ? a : b));
  const maxDate = dates.reduce((a, b) => (new Date(a) > new Date(b) ? a : b));
  const totalDays = Math.max(1, dayDiff(minDate, maxDate) + 1);
  const trackWidth = totalDays * pxPerDay;

  // Build header date columns
  const headerCells = useMemo(() => {
    const cells = [];
    if (zoomId === 'day') {
      for (let i = 0; i < totalDays; i++) {
        const d = addDays(minDate, i);
        cells.push({
          left: i * pxPerDay,
          width: pxPerDay,
          label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          sub: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
          isWeekend: d.getDay() === 0 || d.getDay() === 6
        });
      }
    } else if (zoomId === 'week') {
      let cursor = new Date(minDate);
      while (cursor <= new Date(maxDate)) {
        const startOffset = Math.max(0, dayDiff(minDate, cursor));
        const endOfWeek = addDays(cursor, 6);
        const end = endOfWeek > new Date(maxDate) ? new Date(maxDate) : endOfWeek;
        const w = (dayDiff(cursor, end) + 1) * pxPerDay;
        cells.push({
          left: startOffset * pxPerDay,
          width: w,
          label: `Sem ${cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`,
          sub: ''
        });
        cursor = addDays(cursor, 7);
      }
    } else {
      let cursor = new Date(minDate);
      cursor.setDate(1);
      while (cursor <= new Date(maxDate)) {
        const startOffset = Math.max(0, dayDiff(minDate, cursor));
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        const end = monthEnd > new Date(maxDate) ? new Date(maxDate) : monthEnd;
        const w = (dayDiff(cursor < new Date(minDate) ? minDate : cursor, end) + 1) * pxPerDay;
        cells.push({
          left: startOffset * pxPerDay,
          width: w,
          label: cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
          sub: ''
        });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
    }
    return cells;
  }, [zoomId, minDate, maxDate, totalDays, pxPerDay]);

  // "Today" marker
  const today = ymd(new Date());
  const todayOffset = today >= ymd(minDate) && today <= ymd(maxDate)
    ? dayDiff(minDate, today) * pxPerDay
    : null;

  const renderTaskBar = (task) => {
    if (!task.start_date || !task.end_date) return null;
    const left = dayDiff(minDate, task.start_date) * pxPerDay;
    const width = Math.max(pxPerDay * 0.6, (dayDiff(task.start_date, task.end_date) + 1) * pxPerDay);
    const colors = STATUS_COLORS[task.status] || STATUS_COLORS.pending;
    return (
      <div
        key={task.id}
        className="pm-gantt-bar"
        style={{
          left,
          width,
          background: colors.bg,
          borderColor: colors.border,
          color: '#fff'
        }}
        onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
        title={`${task.title} • ${task.start_date} → ${task.end_date}`}
      >
        <span className="pm-gantt-bar-label">{task.title}</span>
      </div>
    );
  };

  return (
    <div className="pm-gantt">
      <div className="pm-gantt-toolbar">
        <div className="pm-zoom">
          <ZoomOut size={14} />
          {ZOOMS.map(z => (
            <button
              key={z.id}
              className={`pm-zoom-btn ${z.id === zoomId ? 'active' : ''}`}
              onClick={() => setZoomId(z.id)}
            >
              {z.label}
            </button>
          ))}
          <ZoomIn size={14} />
        </div>
        <div className="pm-gantt-legend">
          {Object.entries(STATUS_COLORS).map(([k, v]) => (
            <span key={k} className="pm-legend-item">
              <span className="pm-legend-swatch" style={{ background: v.bg, borderColor: v.border }} />
              {k === 'pending' ? 'Pendente' : k === 'in_progress' ? 'Em andamento' : k === 'completed' ? 'Concluído' : 'Bloqueado'}
            </span>
          ))}
        </div>
      </div>

      <div className="pm-gantt-scroll">
        <div className="pm-gantt-inner" style={{ width: 260 + trackWidth }}>
          {/* Header */}
          <div className="pm-gantt-row pm-gantt-header-row">
            <div className="pm-gantt-side">Fase / Tarefa</div>
            <div className="pm-gantt-track" style={{ width: trackWidth }}>
              {headerCells.map((c, i) => (
                <div
                  key={i}
                  className={`pm-gantt-headcell ${c.isWeekend ? 'weekend' : ''}`}
                  style={{ left: c.left, width: c.width }}
                >
                  <div className="pm-gantt-headcell-label">{c.label}</div>
                  {c.sub && <div className="pm-gantt-headcell-sub">{c.sub}</div>}
                </div>
              ))}
              {todayOffset !== null && (
                <div className="pm-gantt-today" style={{ left: todayOffset }} title="Hoje" />
              )}
            </div>
          </div>

          {/* Phases + tasks */}
          {phases.map(phase => {
            const tasks = tasksByPhase[phase.id] || [];
            return (
              <React.Fragment key={phase.id}>
                <div className="pm-gantt-row pm-gantt-phase-row">
                  <div className="pm-gantt-side pm-gantt-side-phase">
                    <span className="pm-phase-name">{phase.name}</span>
                    <div className="pm-phase-actions">
                      <button
                        className="pm-icon-btn"
                        title="Adicionar tarefa"
                        onClick={() => onAddTask(phase.id)}
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        className="pm-icon-btn danger"
                        title="Excluir fase"
                        onClick={() => onDeletePhase(phase.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="pm-gantt-track pm-gantt-track-phase" style={{ width: trackWidth }}>
                    {todayOffset !== null && (
                      <div className="pm-gantt-today-line" style={{ left: todayOffset }} />
                    )}
                  </div>
                </div>

                {tasks.map(task => (
                  <div className="pm-gantt-row pm-gantt-task-row" key={task.id}>
                    <div className="pm-gantt-side pm-gantt-side-task">
                      <span className="pm-task-title" onClick={() => onTaskClick(task)}>
                        {task.title}
                      </span>
                      {task.assignee_email && (
                        <span className="pm-task-assignee" title={task.assignee_email}>
                          {task.assignee_email.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="pm-gantt-track" style={{ width: trackWidth }}>
                      {todayOffset !== null && (
                        <div className="pm-gantt-today-line" style={{ left: todayOffset }} />
                      )}
                      {renderTaskBar(task)}
                    </div>
                  </div>
                ))}

                {tasks.length === 0 && (
                  <div className="pm-gantt-row pm-gantt-empty-row">
                    <div className="pm-gantt-side pm-gantt-side-empty">
                      <button className="pm-link-btn" onClick={() => onAddTask(phase.id)}>
                        <Plus size={12} /> Adicionar tarefa
                      </button>
                    </div>
                    <div className="pm-gantt-track" style={{ width: trackWidth }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
