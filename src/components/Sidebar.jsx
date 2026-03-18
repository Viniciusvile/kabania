import React from 'react';
import { BrainCircuit, Grid, Calendar, BarChart2, Lightbulb, BookOpen, LogOut, ClipboardList, Building2, Crown, ChevronDown, LifeBuoy, Sparkles, Users, MessageSquare, FileText, Settings, Shield } from 'lucide-react';
import './Dashboard.css';

export default function Sidebar({ isCollapsed, isMobileOpen, onCloseMobile, onLogout, currentView, onViewChange, userRole }) {
  const [expandedGroups, setExpandedGroups] = React.useState({
    activities: true, // Default open
    reports: false
  });

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };
  return (
    <>
      {isMobileOpen && <div className="sidebar-overlay" onClick={onCloseMobile}></div>}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="flex items-center gap-3 flex-1">
            <BrainCircuit className="brand-icon min-w-[32px]" size={32} />
            <span className="brand-name">Synapse Smart</span>
          </div>
          {isMobileOpen && (
            <button className="p-1 hover:bg-white/10 rounded-md lg:hidden" onClick={onCloseMobile}>
              <LogOut className="rotate-180" size={20} />
            </button>
          )}
        </div>

      <nav className="sidebar-nav">
        <div
          className={`nav-item ${currentView === 'kanban' ? 'active' : ''}`}
          onClick={() => onViewChange('kanban')}
        >
          <Grid size={20} />
          <span>Dashboard</span>
        </div>

        <div
          className={`nav-item ${currentView === 'team' ? 'active' : ''}`}
          onClick={() => onViewChange('team')}
        >
          <Users size={20} />
          <span>Equipe</span>
        </div>

        <div
          className={`nav-item ${currentView === 'shifts' ? 'active' : ''}`}
          onClick={() => onViewChange('shifts')}
        >
          <Calendar size={20} className="text-accent" />
          <span>Escalas</span>
        </div>

        <div className="nav-item opacity-50 cursor-not-allowed">
          <Sparkles size={20} />
          <span>Rondas</span>
        </div>

        <div
          className={`nav-item ${currentView === 'service_center' ? 'active' : ''}`}
          onClick={() => onViewChange('service_center')}
        >
          <MessageSquare size={20} />
          <span>Chamados</span>
        </div>

        <div className="nav-item opacity-50 cursor-not-allowed">
          <FileText size={20} />
          <span>Contratos</span>
        </div>

        <div
          className={`nav-item ${currentView === 'reports' ? 'active' : ''}`}
          onClick={() => onViewChange('reports')}
        >
          <BarChart2 size={20} />
          <span>Equipamentos (EPI)</span>
        </div>

        <div className="nav-item opacity-50 cursor-not-allowed">
          <Building2 size={20} />
          <span>Estoque</span>
        </div>

        <div
          className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => onViewChange('settings')}
        >
          <Settings size={20} />
          <span>Preferências</span>
        </div>

        <div className="nav-item opacity-50 cursor-not-allowed">
          <LifeBuoy size={20} />
          <span>Manutenção</span>
        </div>

        <div
          className={`nav-item ${currentView === 'company' ? 'active' : ''}`}
          onClick={() => onViewChange('company')}
        >
          <Shield size={20} />
          <span>Configurações</span>
        </div>

        <div className="nav-item opacity-50 cursor-not-allowed">
          <Crown size={20} />
          <span>Administração</span>
        </div>

        <div className="nav-divider"></div>

        <div className="nav-item text-accent font-bold">
          <BrainCircuit size={20} />
          <span>Iniciar Aplicativo</span>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="nav-item hover:text-red-400 group" onClick={onLogout}>
          <LogOut size={20} className="group-hover:text-red-400 transition-colors" />
          <span>Sair</span>
        </div>
      </div>
    </aside>
    </>
  );
}
