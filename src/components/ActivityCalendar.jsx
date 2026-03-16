import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Filter, RefreshCw, X, Eye } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './ActivityCalendar.css';

const STORAGE_KEY = 'synapseActivities_v2';

const STATUS_COLORS = {
  'Pendente':  { bg: '#f59e0b', text: '#fff' },
  'Agendada':  { bg: '#3b82f6', text: '#fff' },
  'Concluída': { bg: '#22c55e', text: '#fff' },
  'Cancelada': { bg: '#ef4444', text: '#fff' },
};

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_LONG  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];



// Extracts a date string 'YYYY-MM-DD' from activity fields
function activityDate(a) {
  // 1. Check last_appointment (Supabase field) or visitDate (Legacy/Modal field)
  const dateVal = a.last_appointment || a.visitDate;
  if (dateVal && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal;

  // 2. Check created (ISO string from Supabase or Localized string)
  if (a.created) {
    // If it's an ISO string (starts with YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(a.created)) {
      return a.created.split('T')[0];
    }
    // Fallback for localized string "12/03/2026, 16:24"
    const match = a.created.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return null;
}

function activityTime(a) {
  if (a.visitTime) return a.visitTime;
  if (a.created) {
    // If ISO string
    if (a.created.includes('T')) {
      const timePart = a.created.split('T')[1];
      if (timePart) return timePart.substring(0, 5);
    }
    const match = a.created.match(/(\d{2}:\d{2})/);
    if (match) return match[1];
  }
  return '';
}

function sameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth()    === d2.getMonth() &&
         d1.getDate()     === d2.getDate();
}

// ─── Event chip ───────────────────────────────────────────────────────────────
function EventChip({ activity, onClick }) {
  const col = STATUS_COLORS[activity.status] || { bg: '#6366f1', text: '#fff' };
  const time = activityTime(activity);
  return (
    <div
      className="cal-chip"
      style={{ background: col.bg, color: col.text }}
      onClick={(e) => { e.stopPropagation(); onClick(activity); }}
      title={activity.location || activity.id}
    >
      {time && <span className="cal-chip-time">{time}</span>}
      <span className="cal-chip-label">{activity.location || `#${activity.id}`}</span>
    </div>
  );
}

// ─── Detail popover ───────────────────────────────────────────────────────────
function ActivityPopover({ activity, onClose }) {
  const col = STATUS_COLORS[activity.status] || { bg: '#6366f1', text: '#fff' };
  return (
    <div className="cal-popover-overlay" onClick={onClose}>
      <div className="cal-popover" onClick={e => e.stopPropagation()}>
        <div className="cal-popover-header" style={{ background: col.bg }}>
          <span>{activity.location || `#${activity.id}`}</span>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="cal-popover-body">
          <div className="cal-popover-row"><strong>ID:</strong> #{activity.id}</div>
          {activity.type     && <div className="cal-popover-row"><strong>Tipo:</strong> {activity.type}</div>}
          {(activity.last_appointment || activity.visitDate) && (
            <div className="cal-popover-row"><strong>Data:</strong> {activity.last_appointment || activity.visitDate}</div>
          )}
          {activity.visitTime&& <div className="cal-popover-row"><strong>Hora:</strong> {activity.visitTime}</div>}
          {activity.collaborator && <div className="cal-popover-row"><strong>Colaborador:</strong> {activity.collaborator}</div>}
          {activity.address  && <div className="cal-popover-row"><strong>Endereço:</strong> {activity.address}</div>}
          <div className="cal-popover-row">
            <strong>Situação: </strong>
            <span style={{ color: col.bg, fontWeight: 600 }}>{activity.status}</span>
          </div>
          {activity.description && <div className="cal-popover-row"><strong>Descrição:</strong> {activity.description}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── MONTH VIEW ───────────────────────────────────────────────────────────────
function MonthView({ year, month, activities, onEventClick }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const MAX_VISIBLE = 3;

  return (
    <div className="cal-month">
      <div className="cal-month-header">
        {WEEKDAYS_SHORT.map(w => <div key={w} className="cal-month-weekday">{w}</div>)}
      </div>
      <div className="cal-month-grid">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="cal-cell cal-cell-empty" />;
          const isToday = sameDay(day, today);
          const dayStr = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
          const dayActivities = activities.filter(a => activityDate(a) === dayStr);
          const visible = dayActivities.slice(0, MAX_VISIBLE);
          const extra = dayActivities.length - MAX_VISIBLE;
          return (
            <div key={dayStr} className={`cal-cell ${isToday ? 'cal-cell-today' : ''}`}>
              <span className={`cal-day-num ${isToday ? 'cal-day-today-num' : ''}`}>{day.getDate()}</span>
              <div className="cal-cell-events">
                {visible.map(a => <EventChip key={a.id} activity={a} onClick={onEventClick} />)}
                {extra > 0 && <div className="cal-chip-more">mais +{extra}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── WEEK VIEW ────────────────────────────────────────────────────────────────
function WeekView({ date, activities, onEventClick }) {
  // Get start of week (Sunday)
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
  const today = new Date();

  return (
    <div className="cal-week">
      <div className="cal-week-header">
        {days.map((d, i) => {
          const isToday = sameDay(d, today);
          return (
            <div key={i} className={`cal-week-col-header ${isToday ? 'cal-week-today' : ''}`}>
              <span className="cal-week-day-name">{WEEKDAYS_LONG[d.getDay()]}</span>
              <span className={`cal-week-day-num ${isToday ? 'cal-day-today-num' : ''}`}>{d.getDate()}</span>
            </div>
          );
        })}
      </div>
      <div className="cal-week-body">
        {days.map((d, i) => {
          const dayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const dayActivities = activities.filter(a => activityDate(a) === dayStr);
          const isToday = sameDay(d, today);
          return (
            <div key={i} className={`cal-week-col ${isToday ? 'cal-week-col-today' : ''}`}>
              {dayActivities.length === 0
                ? <div className="cal-week-empty" />
                : dayActivities.map(a => <EventChip key={a.id} activity={a} onClick={onEventClick} />)
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DAY VIEW ─────────────────────────────────────────────────────────────────
function DayView({ date, activities, onEventClick }) {
  const dayStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const dayActivities = activities.filter(a => activityDate(a) === dayStr);
  const today = new Date();
  const isToday = sameDay(date, today);

  return (
    <div className="cal-day">
      <div className={`cal-day-header ${isToday ? 'cal-week-today' : ''}`}>
        <span className="cal-week-day-name">{WEEKDAYS_LONG[date.getDay()]}</span>
        <span className={`cal-week-day-num ${isToday ? 'cal-day-today-num' : ''}`}>{date.getDate()} de {MONTHS[date.getMonth()]}</span>
      </div>
      <div className="cal-day-body">
        {dayActivities.length === 0 ? (
          <div className="cal-day-empty">Nenhuma atividade para este dia.</div>
        ) : (
          dayActivities.map(a => (
            <div key={a.id} className="cal-day-row" onClick={() => onEventClick(a)}>
              <div className="cal-day-time">{activityTime(a) || '—'}</div>
              <div className="cal-day-card" style={{ borderLeftColor: (STATUS_COLORS[a.status] || {}).bg || '#6366f1' }}>
                <div className="cal-day-card-title">{a.location || `#${a.id}`}</div>
                {a.type && <div className="cal-day-card-sub">{a.type}</div>}
                {a.collaborator && <div className="cal-day-card-sub">👤 {a.collaborator}</div>}
                <span className="cal-day-card-status" style={{ color: (STATUS_COLORS[a.status] || {}).bg || '#6366f1' }}>{a.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ActivityCalendar({ currentUser, currentCompany }) {
  const [view, setView]       = useState('month'); // 'month' | 'week' | 'day'
  const [cursor, setCursor]   = useState(new Date());
  const [selected, setSelected] = useState(null); // activity detail popover
  const getCacheKey = () => `kabania_activities_${currentCompany?.id}`;

  const [activities, setActivities] = useState(() => {
    const cached = localStorage.getItem(getCacheKey());
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(false);

  const fetchActivities = async () => {
    if (!currentCompany?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('company_id', currentCompany.id);

    if (!error && data) {
      setActivities(data);
      localStorage.setItem(getCacheKey(), JSON.stringify(data));
    } else if (error) {
      console.error('Error fetching calendar activities:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
  }, [currentCompany]);

  const refresh = fetchActivities;

  // Show all activities for the company as per team requirements
  const companyActivities = activities;

  const label = useMemo(() => {
    if (view === 'month') return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === 'week') {
      const start = new Date(cursor);
      start.setDate(cursor.getDate() - cursor.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.getDate()} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
    }
    return `${cursor.getDate()} de ${MONTHS[cursor.getMonth()]} de ${cursor.getFullYear()}`;
  }, [cursor, view]);

  const navigate = (dir) => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  };

  const goToday = () => setCursor(new Date());

  return (
    <div className="cal-container animate-fade-in">
      {/* Header */}
      <div className="cal-header">
        <h1 className="cal-title">Calendário de Atividades</h1>
        <div className="cal-header-actions">
          <button className="cal-icon-btn" title="Nova atividade" onClick={() => window.alert('Crie a atividade pela Lista de Atividades')}>
            <Plus size={18} />
          </button>
          <button className="cal-icon-btn" title="Filtrar"><Filter size={18} /></button>
          <button className="cal-icon-btn" title="Atualizar" onClick={refresh}><RefreshCw size={16} /></button>
        </div>
      </div>

      {/* Nav bar */}
      <div className="cal-nav">
        <div className="cal-nav-left">
          <button className="cal-nav-btn" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
          <span className="cal-nav-label">{label}</span>
          <button className="cal-nav-btn" onClick={() => navigate(1)}><ChevronRight size={20} /></button>
          <button className="cal-today-btn" onClick={goToday}>Hoje</button>
        </div>
        <div className="cal-view-tabs">
          {['day','week','month'].map(v => (
            <button
              key={v}
              className={`cal-view-tab ${view === v ? 'active' : ''}`}
              onClick={() => setView(v)}
            >
              {v === 'day' ? 'DIA' : v === 'week' ? 'SEMANA' : 'MÊS'}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      <div className={`cal-body ${loading && activities.length === 0 ? 'cal-loading-skeleton' : ''}`}>
        {view === 'month' && (
          <MonthView
            year={cursor.getFullYear()}
            month={cursor.getMonth()}
            activities={companyActivities}
            onEventClick={setSelected}
          />
        )}
        {view === 'week' && (
          <WeekView date={cursor} activities={companyActivities} onEventClick={setSelected} />
        )}
        {view === 'day' && (
          <DayView date={cursor} activities={companyActivities} onEventClick={setSelected} />
        )}
      </div>

      {/* Detail popover */}
      {selected && <ActivityPopover activity={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
