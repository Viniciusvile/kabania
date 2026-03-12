import React from 'react';
import { BrainCircuit, Grid, BarChart2, Lightbulb, BookOpen, LogOut, ClipboardList } from 'lucide-react';
import './Dashboard.css';

export default function Sidebar({ isCollapsed, onLogout, currentView, onViewChange }) {
  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <BrainCircuit className="brand-icon min-w-[32px]" size={32} />
        <span className="brand-name">Synapse</span>
      </div>
      
      <nav className="sidebar-nav">
        <div 
          className={`nav-item ${currentView === 'kanban' ? 'active' : ''}`}
          onClick={() => onViewChange('kanban')}
        >
          <Grid size={20} />
          <span>Projetos</span>
        </div>
        <div className="nav-group">
          <div className="nav-item">
            <ClipboardList size={20} />
            <span>Atividades</span>
          </div>
          <div className="nav-submenu">
            <div 
              className={`submenu-item ${currentView === 'activities' ? 'active' : ''}`}
              onClick={() => onViewChange('activities')}
            >
              Lista de atividades
            </div>
            <div 
              className={`submenu-item ${currentView === 'calendar' ? 'active' : ''}`}
              onClick={() => onViewChange('calendar')}
            >
              Atividades do dia
            </div>
            <div className="submenu-item">Tipos de atividades</div>
          </div>
        </div>
        <div className="nav-item">
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
      </nav>
      
      <div className="sidebar-footer">
        <div className="nav-item hover:text-red-400 group" onClick={onLogout}>
          <LogOut size={20} className="group-hover:text-red-400 transition-colors" />
          <span>Sair</span>
        </div>
      </div>
    </aside>
  );
}
