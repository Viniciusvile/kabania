import React, { useState, useEffect, useRef } from 'react';
import {
  Menu, Search, Bell, ChevronDown, Check, User, Settings,
  LogOut, FileText, Crown, Shield, BellRing, CheckCheck,
  AlertTriangle, ArrowRight, MessageSquare, Calendar
} from 'lucide-react';
import {
  getNotifications, markAllRead, getUnreadCount, formatNotifTime
} from '../services/notificationService';
import './Dashboard.css';

const NOTIF_ICONS = {
  assignment: <User size={14} style={{ color: '#00e5ff' }} />,
  moved:      <ArrowRight size={14} style={{ color: '#a78bfa' }} />,
  deadline:   <Calendar size={14} style={{ color: '#fbbf24' }} />,
  comment:    <MessageSquare size={14} style={{ color: '#34d399' }} />
};

export default function TopBar({ onToggleSidebar, searchQuery, onSearchChange, currentUser, currentCompany, userRole, onLogout }) {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const topbarRef = useRef(null);

  const loadNotifications = () => {
    if (currentUser) {
      const notifs = getNotifications(currentUser);
      setNotifications(notifs.slice(0, 12));
      setUnreadCount(getUnreadCount(currentUser));
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (topbarRef.current && !topbarRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (name) => {
    if (name === 'notifications' && activeDropdown !== 'notifications') {
      loadNotifications();
    }
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    markAllRead(currentUser);
    loadNotifications();
  };

  const userInitials = currentUser ? currentUser.substring(0, 2).toUpperCase() : 'UP';

  return (
    <header className="topbar" ref={topbarRef}>
      <div className="topbar-left">
        <Menu size={20} className="text-muted cursor-pointer hover:text-white transition-colors" onClick={onToggleSidebar} />
        <span className="topbar-title">Synapse Kanban AI</span>
      </div>

      <div className="topbar-right">
        <div className="search-bar">
          <Search size={16} className="text-muted" />
          <input type="text" placeholder="Buscar tarefas..." value={searchQuery} onChange={onSearchChange} />
        </div>

        <div className="project-selector" onClick={() => toggleDropdown('project')}>
          <span>Projeto 1</span>
          <ChevronDown size={14} className={`dropdown-arrow ${activeDropdown === 'project' ? 'open' : ''}`} />
          {activeDropdown === 'project' && (
            <div className="dropdown-menu project-menu">
              <div className="dropdown-item active"><Check size={16} className="text-accent" /><span>Projeto 1</span></div>
              <div className="dropdown-item"><span className="w-4"></span><span>Campanha de Marketing</span></div>
              <div className="dropdown-item"><span className="w-4"></span><span>Entregáveis T3</span></div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item text-muted"><Menu size={16} /><span>Gerenciar Projetos</span></div>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="topbar-icon" onClick={() => toggleDropdown('notifications')}>
          <Bell size={20} className={activeDropdown === 'notifications' ? 'text-white' : ''} />
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
          {unreadCount === 0 && <span className="notification-dot"></span>}

          {activeDropdown === 'notifications' && (
            <div className="dropdown-menu notifications-menu" style={{ width: '320px', maxHeight: '400px', overflowY: 'auto' }}>
              <div className="dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Notificações</strong>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <CheckCheck size={12} /> Marcar todas como lidas
                  </button>
                )}
              </div>

              {notifications.length === 0 && (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Nenhuma notificação ainda.
                </div>
              )}

              {notifications.map(notif => (
                <div
                  key={notif.id}
                  className="dropdown-item"
                  style={{
                    alignItems: 'flex-start',
                    gap: '0.6rem',
                    padding: '0.75rem 1rem',
                    background: notif.read ? 'transparent' : 'rgba(0, 229, 255, 0.04)',
                    borderLeft: notif.read ? '2px solid transparent' : '2px solid var(--accent-cyan)'
                  }}
                >
                  <div style={{ flexShrink: 0, marginTop: '0.1rem' }}>
                    {NOTIF_ICONS[notif.type] || <Bell size={14} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.78rem', color: notif.read ? '#64748b' : '#e2e8f0', margin: 0, lineHeight: 1.4 }}>
                      {notif.message}
                    </p>
                    <span style={{ fontSize: '0.68rem', color: '#475569' }}>{formatNotifTime(notif.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="user-profile" onClick={() => toggleDropdown('profile')}>
          <div className="avatar-circle">{userInitials}</div>
          <div className="user-profile-info">
            <span className="user-display-name">{currentUser ? currentUser.split('@')[0] : 'Usuário'}</span>
            {currentCompany && <span className="user-company-name">{currentCompany.name}</span>}
          </div>
          <ChevronDown size={14} className={`text-muted dropdown-arrow ${activeDropdown === 'profile' ? 'open' : ''}`} />

          {activeDropdown === 'profile' && (
            <div className="dropdown-menu profile-menu">
              <div className="dropdown-header">
                <strong>{currentUser || 'user@synapse.ai'}</strong>
                {currentCompany && <span className="text-xs text-muted">{currentCompany.name}</span>}
                <span className={`topbar-role-pill ${userRole}`}>
                  {userRole === 'admin' ? <><Crown size={11} /> Admin</> : <><Shield size={11} /> Membro</>}
                </span>
              </div>
              <div className="dropdown-item"><User size={16} /><span>Meu Perfil</span></div>
              <div className="dropdown-item"><Settings size={16} /><span>Configurações</span></div>
              <div className="dropdown-item"><FileText size={16} /><span>Faturamento</span></div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item text-red-400 hover:text-red-300" onClick={(e) => { e.stopPropagation(); onLogout(); }}>
                <LogOut size={16} /><span>Sair</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
