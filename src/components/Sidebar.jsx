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
          <span>Projetos</span>
        </div>

        <div
          className={`nav-item ${currentView === 'shifts' ? 'active' : ''}`}
          onClick={() => onViewChange('shifts')}
        >
          <Calendar size={20} className="text-accent" />
          <span>Escalas de Trabalho</span>
          <span className="ml-auto px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-[8px] font-bold uppercase tracking-tighter">Smart</span>
        </div>

        <div className={`nav-group ${expandedGroups.activities ? 'expanded' : ''}`}>
          <div className="nav-item" onClick={() => toggleGroup('activities')}>
            <ClipboardList size={20} />
            <span>Atividades</span>
            {!isCollapsed && (
              <ChevronDown size={14} className={`ml-auto transition-transform ${expandedGroups.activities ? 'rotate-180' : ''}`} />
            )}
          </div>
          <div className="nav-submenu">
            <div
              className={`submenu-item ${currentView === 'activities' ? 'active' : ''}`}
              onClick={() => onViewChange('activities')}
            >Lista de atividades</div>
            <div
              className={`submenu-item ${currentView === 'calendar' ? 'active' : ''}`}
              onClick={() => onViewChange('calendar')}
            >Atividades do dia</div>
            <div
              className={`submenu-item ${currentView === 'service_center' ? 'active' : ''}`}
              onClick={() => onViewChange('service_center')}
            >Central de Atendimento</div>
          </div>
        </div>

        {/* Reports Group */}
        <div className={`nav-group ${expandedGroups.reports ? 'expanded' : ''}`}>
          <div className="nav-item" onClick={() => toggleGroup('reports')}>
            <BarChart2 size={20} />
            <span>Relatórios</span>
            {!isCollapsed && (
              <ChevronDown size={14} className={`ml-auto transition-transform ${expandedGroups.reports ? 'rotate-180' : ''}`} />
            )}
          </div>
          <div className="nav-submenu">
            <div
              className={`submenu-item ${currentView === 'reports' ? 'active' : ''}`}
              onClick={() => onViewChange('reports')}
            >Dashboard Geral</div>
            
            <div
              className={`submenu-item ${currentView === 'business_history' ? 'active' : ''}`}
              onClick={() => onViewChange('business_history')}
            >Histórico de Atividades</div>
            <div
              className={`submenu-item ${currentView === 'business_export' ? 'active' : ''}`}
              onClick={() => onViewChange('business_export')}
            >Exportar Relatórios</div>
          </div>
        </div>

        <div
          className={`nav-item ${currentView === 'ai_insights' ? 'active' : ''}`}
          onClick={() => onViewChange('ai_insights')}
        >
          <Lightbulb size={20} />
          <span>Insights de IA</span>
        </div>

        <div
          className={`nav-item ${currentView === 'knowledge' ? 'active' : ''}`}
          onClick={() => onViewChange('knowledge')}
        >
          <BookOpen size={20} />
          <span>Base de Conhecimento</span>
        </div>

        <div
          className={`nav-item ${currentView === 'support' ? 'active' : ''}`}
          onClick={() => onViewChange('support')}
        >
          <LifeBuoy size={20} className="text-accent" />
          <span>Central de Suporte</span>
        </div>

        {/* Admin Settings */}
        {userRole === 'admin' && (
          <div
            className={`nav-item ${currentView === 'company' ? 'active' : ''}`}
            onClick={() => onViewChange('company')}
          >
            <Building2 size={20} />
            <span>Dados da Empresa</span>
            {!isCollapsed && <Crown size={14} className="ml-auto text-yellow-500 opacity-80" />}
          </div>
        )}
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
