import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Bell, CheckCheck, BellOff, AlertTriangle, ArrowRight,
  MessageSquare, Calendar, User, Briefcase, CheckCircle,
  Sparkles, LayoutGrid, Loader2, Trash2
} from 'lucide-react';
import { fetchNotifications, markAsRead, subscribeToNotifications } from '../services/notificationService';
import { generateOperationFeedSummary } from '../services/geminiService';
import './NotificationHub.css';

// ─── Module grouping ───────────────────────────────────────────────
const MODULE_MAP = {
  kanban_move: 'kanban',
  kanban_done: 'kanban',
  assignment:  'escalas',
  comment:     'kanban',
  deadline:    'kanban',
  moved:       'kanban',
  urgent:      'sistema',
  system:      'sistema',
};

const MODULE_LABELS = {
  kanban:  { label: 'Kanban',    color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  escalas: { label: 'Escalas',   color: '#00e5ff', bg: 'rgba(0,229,255,0.10)' },
  sistema: { label: 'Sistema',   color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  outros:  { label: 'Outros',    color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
};

const TYPE_ICONS = {
  kanban_move: <ArrowRight    size={14} />,
  kanban_done: <CheckCircle   size={14} />,
  assignment:  <User          size={14} />,
  comment:     <MessageSquare size={14} />,
  deadline:    <Calendar      size={14} />,
  moved:       <ArrowRight    size={14} />,
  urgent:      <AlertTriangle size={14} />,
  system:      <AlertTriangle size={14} />,
};

const TABS = [
  { id: 'all',     label: 'Todas'      },
  { id: 'unread',  label: 'Não lidas'  },
  { id: 'kanban',  label: 'Kanban'     },
  { id: 'escalas', label: 'Escalas'    },
  { id: 'sistema', label: 'Sistema'    },
];

function getModule(type) {
  return MODULE_MAP[type] || 'outros';
}

function fmtTime(ts) {
  if (!ts) return 'Agora';
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60)   return `${Math.floor(diff)}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

function AISummaryBlock({ notifications, companyName }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const generated = useRef(false);

  useEffect(() => {
    if (generated.current || notifications.length === 0) return;
    generated.current = true;
    setLoading(true);
    generateOperationFeedSummary(notifications.slice(0, 20), companyName)
      .then(s => { setSummary(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="nh-ai-block">
      <div className="nh-ai-label">
        <Sparkles size={12} /> Resumo da IA
      </div>
      {loading && (
        <div className="nh-ai-skeleton">
          <span /><span /><span style={{ width: '70%' }} />
        </div>
      )}
      {summary && !loading && (
        <p className="nh-ai-text">{summary}</p>
      )}
    </div>
  );
}

function NotifItem({ notif, onRead }) {
  const mod = getModule(notif.type);
  const modMeta = MODULE_LABELS[mod];

  return (
    <div
      className={`nh-item ${notif.read ? 'nh-item-read' : 'nh-item-unread'}`}
      onClick={() => !notif.read && onRead(notif.id)}
    >
      <div className="nh-item-icon" style={{ background: modMeta.bg, color: modMeta.color }}>
        {TYPE_ICONS[notif.type] || <Bell size={14} />}
      </div>
      <div className="nh-item-body">
        <p className="nh-item-content">{notif.content}</p>
        <div className="nh-item-meta">
          <span className="nh-mod-pill" style={{ background: modMeta.bg, color: modMeta.color }}>
            {modMeta.label}
          </span>
          <span className="nh-item-time">{fmtTime(notif.created_at)}</span>
        </div>
      </div>
      {!notif.read && <div className="nh-unread-dot" />}
    </div>
  );
}

export default function NotificationHub({ companyId, companyName, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [tab, setTab]                     = useState('all');

  useEffect(() => {
    let cancelled = false;
    fetchNotifications(companyId).then(data => {
      if (!cancelled) { setNotifications(data); setLoading(false); }
    });
    const unsub = subscribeToNotifications(companyId, (n) => {
      setNotifications(prev => [n, ...prev].slice(0, 80));
    });
    return () => { cancelled = true; unsub(); };
  }, [companyId]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      if (tab === 'all')    return true;
      if (tab === 'unread') return !n.read;
      return getModule(n.type) === tab;
    });
  }, [notifications, tab]);

  const grouped = useMemo(() => {
    const today    = [];
    const earlier  = [];
    const cutoff   = Date.now() - 86400 * 1000;
    filtered.forEach(n => {
      (new Date(n.created_at) > cutoff ? today : earlier).push(n);
    });
    return { today, earlier };
  }, [filtered]);

  // Tab counts
  const counts = useMemo(() => {
    const c = { all: 0, unread: 0, kanban: 0, escalas: 0, sistema: 0 };
    notifications.forEach(n => {
      c.all++;
      if (!n.read) c.unread++;
      const m = getModule(n.type);
      if (c[m] !== undefined) c[m]++;
    });
    return c;
  }, [notifications]);

  const handleRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await markAsRead(id);
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    for (const n of unread) await markAsRead(n.id);
  };

  return (
    <>
      <div className="nh-overlay" onClick={onClose} />
      <div className="nh-panel animate-slide-in-right">
        {/* Header */}
        <div className="nh-header">
          <div className="nh-header-left">
            <Bell size={18} className="nh-bell-icon" />
            <span className="nh-title">Notificações</span>
            {unreadCount > 0 && (
              <span className="nh-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
          <div className="nh-header-actions">
            {unreadCount > 0 && (
              <button className="nh-action-btn" onClick={handleMarkAllRead} title="Marcar todas como lidas">
                <CheckCheck size={16} />
              </button>
            )}
            <button className="nh-action-btn" onClick={onClose} title="Fechar">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* AI Summary */}
        <AISummaryBlock notifications={notifications} companyName={companyName} />

        {/* Tabs */}
        <div className="nh-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`nh-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {counts[t.id] > 0 && (
                <span className="nh-tab-count">{counts[t.id]}</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="nh-list custom-scrollbar">
          {loading ? (
            <div className="nh-empty">
              <div className="nh-empty-icon-wrap">
                <Loader2 size={28} className="nh-spin" />
              </div>
              <p>Carregando notificações...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="nh-empty">
              <div className="nh-empty-icon-wrap">
                <BellOff size={30} style={{ opacity: 0.3 }} />
              </div>
              <p>Nenhuma notificação aqui.<br />A operação está tranquila.</p>
            </div>
          ) : (
            <>
              {grouped.today.length > 0 && (
                <>
                  <div className="nh-group-label">Hoje</div>
                  {grouped.today.map(n => (
                    <NotifItem key={n.id} notif={n} onRead={handleRead} />
                  ))}
                </>
              )}
              {grouped.earlier.length > 0 && (
                <>
                  <div className="nh-group-label">Anteriores</div>
                  {grouped.earlier.map(n => (
                    <NotifItem key={n.id} notif={n} onRead={handleRead} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
