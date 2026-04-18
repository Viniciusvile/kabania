import React, { useState, useEffect, useRef } from 'react';
import {
  Menu, Search, Bell, ChevronDown, Check, User, Settings,
  LogOut, FileText, Crown, Shield,
  Calendar, Sun, Moon, Plus, Trash2, X,
  Sparkles, FolderKanban, Zap
} from 'lucide-react';
import './WorkspaceHub/WorkspaceHub.css';
import { fetchNotifications, subscribeToNotifications } from '../services/notificationService';
import { supabase } from '../supabaseClient';
import './Dashboard.css';
import NotificationHub from './NotificationHub';
import QuickAccessToolbar from './QuickAccessToolbar';

export default function TopBar({ 
  onToggleSidebar, searchQuery, onSearchChange, 
  currentUser, currentCompany, userRole, onLogout, 
  theme, onToggleTheme,
  projects = [], selectedProjectId, onProjectChange, onAddProject, onRemoveProject,
  onViewChange, currentView, workspaceTab, setWorkspaceTab,
  profileData: initialProfileData
}) {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [profileData, setProfileData] = useState(initialProfileData || { name: '', first_name: '', last_name: '', avatar_url: null });
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifHub, setShowNotifHub] = useState(false);
  const [showQuickAccess, setShowQuickAccess] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    if (initialProfileData) setProfileData(initialProfileData);
  }, [initialProfileData]);

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
        const constructedName = payload.new.first_name 
          ? `${payload.new.first_name} ${payload.new.last_name || ''}`.trim() 
          : (payload.new.name || (typeof currentUser === 'string' ? currentUser.split('@')[0] : 'Usuário'));
        
        setProfileData({
          name: constructedName,
          first_name: payload.new.first_name,
          last_name: payload.new.last_name,
          avatar_url: payload.new.avatar_url
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  const userInitials = profileData.first_name 
    ? (profileData.first_name[0] + (profileData.last_name?.[0] || '')).toUpperCase()
    : (profileData.name ? profileData.name.substring(0, 2).toUpperCase() : 'UP');
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

  // Badge: conta não lidas em background para manter o sino atualizado
  useEffect(() => {
    if (!currentCompany) return;
    fetchNotifications(currentCompany.id).then(notifs => {
      setUnreadCount(notifs.filter(n => !n.read).length);
    });
    const unsub = subscribeToNotifications(currentCompany.id, () => {
      setUnreadCount(prev => prev + 1);
    });
    return unsub;
  }, [currentCompany]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (topbarRef.current && !topbarRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (name) => setActiveDropdown(activeDropdown === name ? null : name);


  return (
    <>
    <header className="topbar" ref={topbarRef}>
      <div className="topbar-left">
        <Menu size={20} className="text-muted cursor-pointer hover:text-white transition-colors" onClick={onToggleSidebar} />
        <span className="topbar-title hidden md:block">Synapse Kanban AI</span>
      </div>

      <div className="topbar-right">
        {currentView === 'kanban' && (
          <div className="search-bar">
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

          {/* Quick Access Toolbar */}
          <div className="topbar-icon" onClick={() => setShowQuickAccess(v => !v)} title="Acesso Rápido">
            <Zap size={20} className={showQuickAccess ? 'text-accent-cyan' : ''} />
          </div>

          {/* Projects Shortcut */}
          <div className="topbar-icon" onClick={() => onViewChange('projects')} title="Projetos">
            <FolderKanban size={20} className={currentView === 'projects' ? 'text-emerald-400' : ''} />
          </div>

          {/* Calendar Settings Shortcut */}
          <div className="topbar-icon" onClick={() => onViewChange('calendar_settings')} title="Configurações de Calendário">
            <Calendar size={20} className={activeDropdown === 'calendar_settings' ? 'text-white' : ''} />
          </div>
          
          {/* Theme Toggle */}
          <div 
            className="topbar-icon theme-toggle" 
            onClick={onToggleTheme} 
            title={
              theme === 'dark' ? 'Mudar para Tema Claro' : 
              theme === 'light' ? 'Mudar para Emerald Green' : 
              'Mudar para Tema Escuro'
            }
          >
            {theme === 'dark' && <Moon size={20} />}
            {theme === 'light' && <Sun size={20} />}
            {theme === 'green' && <Sparkles size={20} style={{ color: '#04D94F' }} />}
          </div>

        {/* Notifications Bell → abre o Hub */}
        <div className="topbar-icon" onClick={() => setShowNotifHub(true)} title="Notificações">
          <Bell size={20} className={showNotifHub ? 'text-white' : ''} />
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
          {unreadCount === 0 && <span className="notification-dot"></span>}
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

    {showNotifHub && (
      <NotificationHub
        companyId={currentCompany?.id}
        companyName={currentCompany?.name}
        onClose={() => { setShowNotifHub(false); setUnreadCount(0); }}
      />
    )}

    {showQuickAccess && (
      <QuickAccessToolbar
        onViewChange={onViewChange}
        onClose={() => setShowQuickAccess(false)}
      />
    )}
  </>
  );
}
