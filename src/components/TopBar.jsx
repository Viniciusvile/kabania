import React, { useState, useEffect, useRef } from 'react';
import { Menu, Search, Bell, ChevronDown, Check, User, Settings, LogOut, FileText } from 'lucide-react';
import './Dashboard.css';

export default function TopBar({ onToggleSidebar, searchQuery, onSearchChange, currentUser, onLogout }) {
  const [activeDropdown, setActiveDropdown] = useState(null); // 'project', 'notifications', 'profile', or null
  const topbarRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (topbarRef.current && !topbarRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = (dropdownName) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  return (
    <header className="topbar" ref={topbarRef}>
      <div className="topbar-left">
        <Menu size={20} className="text-muted cursor-pointer hover:text-white transition-colors" onClick={onToggleSidebar} />
        <span className="topbar-title">Synapse Kanban AI</span>
      </div>
      
      <div className="topbar-right">
        <div className="search-bar">
          <Search size={16} className="text-muted" />
          <input 
            type="text" 
            placeholder="Buscar tarefas..." 
            value={searchQuery}
            onChange={onSearchChange}
          />
        </div>
        
        <div className="project-selector" onClick={() => toggleDropdown('project')}>
          <span>Projeto 1</span>
          <ChevronDown size={14} className={`dropdown-arrow ${activeDropdown === 'project' ? 'open' : ''}`}/>
          
          {activeDropdown === 'project' && (
            <div className="dropdown-menu project-menu">
              <div className="dropdown-item active">
                <Check size={16} className="text-accent" />
                <span>Projeto 1</span>
              </div>
              <div className="dropdown-item">
                <span className="w-4"></span>
                <span>Campanha de Marketing</span>
              </div>
              <div className="dropdown-item">
                <span className="w-4"></span>
                <span>Entregáveis T3</span>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item text-muted">
                <Menu size={16} />
                <span>Gerenciar Projetos</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="topbar-icon" onClick={() => toggleDropdown('notifications')}>
          <Bell size={20} className={activeDropdown === 'notifications' ? 'text-white' : ''} />
          <span className="notification-dot"></span>
          
          {activeDropdown === 'notifications' && (
            <div className="dropdown-menu notifications-menu">
              <div className="dropdown-header">
                <strong>Notificações</strong>
              </div>
              <div className="dropdown-item flex-col items-start gap-1 p-3">
                <span className="text-sm font-semibold">Novo Comentário</span>
                <span className="text-xs text-muted">Sarah comentou em "Atualização de UI"</span>
                <span className="text-xs text-[#00E5FF] mt-1">2m atrás</span>
              </div>
              <div className="dropdown-item flex-col items-start gap-1 p-3">
                <span className="text-sm font-semibold">Tarefa Movida</span>
                <span className="text-xs text-muted">"Integração de API" movido para CONCLUÍDO</span>
                <span className="text-xs text-[#00E5FF] mt-1">1h atrás</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="user-profile" onClick={() => toggleDropdown('profile')}>
          <div className="avatar-circle">{currentUser ? currentUser.substring(0, 2).toUpperCase() : 'UP'}</div>
          <span>Perfil de usuário</span>
          <ChevronDown size={14} className={`text-muted dropdown-arrow ${activeDropdown === 'profile' ? 'open' : ''}`} />
          
          {activeDropdown === 'profile' && (
            <div className="dropdown-menu profile-menu">
              <div className="dropdown-header">
                <strong>Perfil de usuário</strong>
                <span className="text-xs text-muted">{currentUser || 'user@synapse.ai'}</span>
              </div>
              <div className="dropdown-item">
                <User size={16} />
                <span>Meu Perfil</span>
              </div>
              <div className="dropdown-item">
                <Settings size={16} />
                <span>Configurações</span>
              </div>
              <div className="dropdown-item">
                <FileText size={16} />
                <span>Faturamento</span>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item text-red-400 hover:text-red-300" onClick={(e) => { e.stopPropagation(); onLogout(); }}>
                <LogOut size={16} />
                <span>Sair</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
