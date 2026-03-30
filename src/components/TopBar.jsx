import React, { useState, useEffect, useRef } from 'react';
import {
  Menu, Search, Bell, ChevronDown, Check, User, Settings,
  LogOut, FileText, Crown, Shield, BellRing, CheckCheck,
  AlertTriangle, ArrowRight, MessageSquare, Calendar, Sun, Moon, Plus, Trash2, X,
  LayoutGrid, GraduationCap
} from 'lucide-react';
import './WorkspaceHub/WorkspaceHub.css';
import {
  fetchNotifications, markAsRead, subscribeToNotifications
} from '../services/notificationService';
import { generateOperationFeedSummary } from '../services/geminiService';
import { supabase } from '../supabaseClient';
import './Dashboard.css';

const NOTIF_ICONS = {
  assignment: <User size={14} style={{ color: '#00e5ff' }} />,
  moved:      <ArrowRight size={14} style={{ color: '#a78bfa' }} />,
  deadline:   <Calendar size={14} style={{ color: '#fbbf24' }} />,
  comment:    <MessageSquare size={14} style={{ color: '#34d399' }} />
};

export default function TopBar({ 
  onToggleSidebar, searchQuery, onSearchChange, 
  currentUser, currentCompany, userRole, onLogout, 
  theme, onToggleTheme,
  projects = [], selectedProjectId, onProjectChange, onAddProject, onRemoveProject,
  onViewChange, currentView, workspaceTab, setWorkspaceTab,
  profileData: initialProfileData
}) {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [profileData, setProfileData] = useState(initialProfileData || { name: '', avatar_url: null });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Sync with prop when it changes (caching update from App)
  useEffect(() => {
    if (initialProfileData) {
      setProfileData(initialProfileData);
    }
  }, [initialProfileData]);

  const [aiSummary, setAiSummary] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    // Still set up real-time subscription for profile changes to keep synced across tabs/devices
    const channel = supabase
      .channel(`profile-top-${currentUser}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles',
        filter: `email=eq.${currentUser}`
      }, (payload) => {
        setProfileData({
          name: payload.new.name || (typeof currentUser === 'string' ? currentUser.split('@')[0] : 'Usuário'),
          avatar_url: payload.new.avatar_url
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  const userInitials = profileData.name ? profileData.name.substring(0, 2).toUpperCase() : 'UP';
  const topbarRef = useRef(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  const handleCreateProject = (e) => {
    e.stopPropagation();
    setIsCreatingProject(true);
    setNewProjectName('');
  };

  const submitNewProject = (e) => {
    e?.stopPropagation();
    if (newProjectName.trim()) {
      onAddProject(newProjectName.trim());
      setIsCreatingProject(false);
      setNewProjectName('');
      setActiveDropdown(null);
    }
  };

  const cancelCreateProject = (e) => {
    e.stopPropagation();
    setIsCreatingProject(false);
    setNewProjectName('');
  };

  const loadNotifications = async () => {
    if (currentCompany) {
      const notifs = await fetchNotifications(currentCompany.id);
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }
  };

  useEffect(() => {
    loadNotifications();
    
    if (currentCompany) {
      const unsubscribe = subscribeToNotifications(currentCompany.id, (newNotif) => {
        // Immediate UI update for new notification
        setNotifications(prev => [newNotif, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);
        
        // Optional: Play sound or browser notification here if requested
      });
      return unsubscribe;
    }
  }, [currentCompany]);

  const handleGenerateSummary = async (e) => {
    e.stopPropagation();
    setIsGeneratingSummary(true);
    const summary = await generateOperationFeedSummary(notifications.slice(0, 20), currentCompany?.name);
    setAiSummary(summary);
    setIsGeneratingSummary(false);
  };

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

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    // Optimistic UI update
    const unreadNotifs = notifications.filter(n => !n.read);
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    
    // Background sync
    for (const notif of unreadNotifs) {
      /* markAsRead internally updates Supabase. We send them asynchronously to not block the UI */
      markAsRead(notif.id).catch(console.error);
    }
  };

  const formatNotifTime = (timestamp) => {
    if (!timestamp) return 'Agora';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };


  return (
    <header className="topbar" ref={topbarRef}>
      <div className="topbar-left">
        <Menu size={20} className="text-muted cursor-pointer hover:text-white transition-colors" onClick={onToggleSidebar} />
        <span className="topbar-title hidden md:block">Synapse Kanban AI</span>
      </div>

      <div className="topbar-right">
        {currentView === 'workspace_hub' ? (
          <div className="workspace-tabs-premium topbar-integrated-tabs" style={{ padding: '4px', transform: 'scale(0.85)', transformOrigin: 'right center', marginRight: 'auto' }}>
            <button 
              className={`ws-tab-btn ${workspaceTab === 'kanban' ? 'active' : ''}`}
              onClick={() => setWorkspaceTab?.('kanban')}
              style={{ padding: '6px 16px' }}
            >
              <LayoutGrid size={16} /> <span className="hidden md:inline">Kanban</span>
            </button>
            <button 
              className={`ws-tab-btn ${workspaceTab === 'academy' ? 'active' : ''}`}
              onClick={() => setWorkspaceTab?.('academy')}
              style={{ padding: '6px 16px' }}
            >
              <GraduationCap size={16} /> <span className="hidden md:inline">Academy</span>
            </button>
          </div>
        ) : (
          <div className="search-bar hidden sm:flex">
            <Search size={16} className="text-muted" />
            <input type="text" placeholder="Buscar tarefas..." value={searchQuery || ''} onChange={onSearchChange} />
          </div>
        )}

        <div className="project-selector" onClick={() => toggleDropdown('project')}>
          <span>{selectedProject?.name || 'Selecionar Projeto'}</span>
          <ChevronDown size={14} className={`dropdown-arrow ${activeDropdown === 'project' ? 'open' : ''}`} />
          {activeDropdown === 'project' && (
            <div className="dropdown-menu project-menu">
              {projects.map(proj => (
                <div 
                  key={proj.id} 
                  className={`dropdown-item group ${selectedProjectId === proj.id ? 'active' : ''}`}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onProjectChange(proj.id); 
                    setActiveDropdown(null); 
                  }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {selectedProjectId === proj.id ? <Check size={16} className="text-accent" /> : <span className="w-4"></span>}
                    <span>{proj.name}</span>
                  </div>
                  {projects.length > 1 && (
                    <Trash2 
                      size={14} 
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 transition-all p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveProject(proj.id);
                      }}
                    />
                  )}
                </div>
              ))}
              <div className="dropdown-divider"></div>
              
              {isCreatingProject ? (
                <div className="project-create-inline" onClick={e => e.stopPropagation()}>
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Nome do projeto..."
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitNewProject();
                      if (e.key === 'Escape') cancelCreateProject(e);
                    }}
                  />
                  <div className="project-create-actions">
                    <button className="btn-save" onClick={submitNewProject} title="Confirmar">
                      <Check size={14} />
                    </button>
                    <button className="btn-cancel" onClick={cancelCreateProject} title="Cancelar">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="dropdown-item text-muted" onClick={handleCreateProject}>
                  <Plus size={16} />
                  <span>Gerenciar Projetos (Novo)</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <div className="topbar-icon theme-toggle" onClick={onToggleTheme} title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </div>

        {/* Notifications Bell */}
        <div className="topbar-icon" onClick={() => toggleDropdown('notifications')}>
          <Bell size={20} className={activeDropdown === 'notifications' ? 'text-white' : ''} />
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
          {unreadCount === 0 && <span className="notification-dot"></span>}

          {activeDropdown === 'notifications' && (
            <div className="dropdown-menu notifications-menu" style={{ width: '380px', maxHeight: '500px', overflowY: 'auto' }}>
              <div className="dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BellRing size={16} className="text-accent" /> Centro de Comando
                </strong>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <CheckCheck size={12} /> Marcar lidas
                  </button>
                )}
              </div>

              {/* AI Summary Section */}
              <div style={{ padding: '0 1rem 1rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                {!aiSummary && !isGeneratingSummary && (
                  <button 
                    onClick={handleGenerateSummary}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', border: '1px solid rgba(167, 139, 250, 0.2)', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(167, 139, 250, 0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(167, 139, 250, 0.1)'}
                  >
                    Resumir Dia com IA ✨
                  </button>
                )}
                {isGeneratingSummary && (
                  <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(167, 139, 250, 0.05)', color: '#a78bfa', fontSize: '0.8rem', textAlign: 'center', fontStyle: 'italic' }}>
                    <span className="skeleton-pulse" style={{ display: 'inline-block', width: '80%', height: '12px', background: '#a78bfa', opacity: 0.3, borderRadius: '4px' }}></span>
                  </div>
                )}
                {aiSummary && (
                  <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(167, 139, 250, 0.05)', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
                    <div style={{ fontSize: '0.65rem', color: '#a78bfa', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Resumo da Operação via IA</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>{aiSummary}</p>
                  </div>
                )}
              </div>

              {notifications.length === 0 && (
                <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  A operação está tranquila. Nenhuma notificação ainda.
                </div>
              )}

              {notifications.map(notif => (
                <div
                  key={notif.id}
                  className="dropdown-item"
                  style={{
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    background: notif.read ? 'transparent' : 'rgba(0, 229, 255, 0.04)',
                    borderLeft: notif.read ? '2px solid transparent' : '2px solid var(--accent-cyan)'
                  }}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!notif.read) {
                      setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                      setUnreadCount(prev => Math.max(0, prev - 1));
                      await markAsRead(notif.id);
                    }
                  }}
                >
                  <div style={{ flexShrink: 0, marginTop: '0.1rem' }}>
                    {notif.type === 'system' ? <AlertTriangle size={16} /> :
                     notif.type === 'kanban_done' ? <CheckCheck size={16} style={{ color: '#34d399' }} /> :
                     notif.type === 'urgent' ? <AlertTriangle size={16} style={{ color: '#ef4444' }} /> :
                     NOTIF_ICONS[notif.type] || <Bell size={16} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.82rem', color: notif.read ? '#64748b' : '#e2e8f0', margin: 0, lineHeight: 1.4 }}>
                      {notif.content}
                    </p>
                    <span style={{ fontSize: '0.68rem', color: '#475569', display: 'block', marginTop: '0.2rem' }}>
                      {formatNotifTime(notif.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="user-profile" onClick={() => toggleDropdown('profile')}>
          <div className="avatar-circle">
            {profileData.avatar_url ? (
              <img src={profileData.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
            ) : (
              userInitials
            )}
          </div>
          <div className="user-profile-info">
            <span className="user-display-name">{profileData.name || 'Usuário'}</span>
            {currentCompany && <span className="user-company-name">{currentCompany.name}</span>}
          </div>
          <ChevronDown size={14} className={`text-muted dropdown-arrow ${activeDropdown === 'profile' ? 'open' : ''}`} />

          {activeDropdown === 'profile' && (
            <div className="dropdown-menu profile-menu">
              <div className="dropdown-header">
                <strong>{typeof currentUser === 'string' ? currentUser : 'user@synapse.ai'}</strong>
                {currentCompany && <span className="text-xs text-muted">{currentCompany.name}</span>}
                <span className={`topbar-role-pill ${userRole}`}>
                  {userRole === 'admin' ? <><Crown size={11} /> Admin</> : <><Shield size={11} /> Membro</>}
                </span>
              </div>
              <div className="dropdown-item" onClick={() => { onViewChange('profile'); setActiveDropdown(null); }}><User size={16} /><span>Meu Perfil</span></div>
              <div className="dropdown-item" onClick={() => { onViewChange('settings'); setActiveDropdown(null); }}><Settings size={16} /><span>Configurações</span></div>
              <div className="dropdown-item" onClick={() => { onViewChange('billing'); setActiveDropdown(null); }}><FileText size={16} /><span>Faturamento</span></div>
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
