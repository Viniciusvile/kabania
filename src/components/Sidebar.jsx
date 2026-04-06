import React, { useState, useEffect } from 'react';
import { BrainCircuit, Grid, Calendar, BarChart2, Lightbulb, BookOpen, LogOut, ClipboardList, Building2, Crown, ChevronDown, LifeBuoy, Sparkles, Users, MessageSquare, FileText, Settings, Shield, PackageSearch, ShieldCheck, GraduationCap, Map } from 'lucide-react';
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
          <div className="flex items-center gap-3">
            <BrainCircuit className="brand-icon" size={32} />
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
          className={`nav-item ${currentView === 'workspace_hub' ? 'active' : ''}`}
          onClick={() => onViewChange('workspace_hub')}
        >
          <Grid size={20} className="text-indigo-400" />
          <span>Workspace</span>
        </div>

        <div
          className={`nav-item ${currentView === 'shifts' ? 'active' : ''}`}
          onClick={() => onViewChange('shifts')}
        >
          <Calendar size={20} className="text-accent" />
          <span>Gerenciar Escalas</span>
        </div>

        <div
          className={`nav-item ${currentView === 'inventory' ? 'active' : ''}`}
          onClick={() => onViewChange('inventory')}
        >
          <PackageSearch size={20} className="text-blue-400" />
          <span>Estoque Inteligente</span>
        </div>

        <div
          className={`nav-item ${currentView === 'digital_twin' ? 'active' : ''}`}
          onClick={() => onViewChange('digital_twin')}
        >
          <Map size={20} className="text-cyan-400" />
          <span>Gêmeo Digital</span>
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

        {/* Dados e Relatórios Group (merged Reports + AI Insights) */}
        <div className={`nav-group ${expandedGroups.reports ? 'expanded' : ''}`}>
          <div className="nav-item" onClick={() => toggleGroup('reports')}>
            <BarChart2 size={20} />
            <span>Dados e Relatórios</span>
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
              className={`submenu-item ${currentView === 'ai_insights' ? 'active' : ''}`}
              onClick={() => onViewChange('ai_insights')}
            >Insights de IA</div>
            <div
              className={`submenu-item ${currentView === 'business_history' ? 'active' : ''}`}
              onClick={() => onViewChange('business_history')}
            >Histórico de Atividades</div>
            <div
              className={`submenu-item ${currentView === 'business_export' ? 'active' : ''}`}
              onClick={() => onViewChange('business_export')}
            >Exportar Relatórios</div>
            <div
              className={`submenu-item ${currentView === 'sla_dashboard' ? 'active' : ''}`}
              onClick={() => onViewChange('sla_dashboard')}
            >
              <ShieldCheck size={13} style={{ marginRight: '4px', display: 'inline' }} />
              Painel de SLA
            </div>
          </div>
        </div>

        <div
          className={`nav-item ${currentView === 'knowledge' ? 'active' : ''}`}
          onClick={() => onViewChange('knowledge')}
        >
          <BookOpen size={20} />
          <span>Base de Conhecimento</span>
        </div>




        {/* Admin Settings */}
        {userRole === 'admin' && (
          <>
            <div
              className={`nav-item ${currentView === 'company' ? 'active' : ''}`}
              onClick={() => onViewChange('company')}
            >
              <Building2 size={20} />
              <span>Dados da Empresa</span>
              {!isCollapsed && <Crown size={14} className="ml-auto text-yellow-500 opacity-80" />}
            </div>
            

          </>
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
