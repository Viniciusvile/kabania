import React from 'react';
import { Search, RotateCcw, LayoutGrid, SlidersHorizontal, X, LayoutDashboard, FileText, BarChart3 } from 'lucide-react';
import './Dashboard.css';

const HEADER_TABS = [
  { id: 'quadro',     label: 'Quadro',            icon: LayoutDashboard },
  { id: 'documentos', label: 'Documentos',        icon: FileText },
  { id: 'carga',      label: 'Carga de trabalho', icon: BarChart3 }
];

export default function DashboardHeader({
  projectName,
  searchQuery = '',
  onSearchChange,
  onRefresh,
  viewMode = 'grid',
  onViewModeChange,
  filterActive = false,
  onFilterToggle,
  activeTab = 'quadro',
  onTabChange
}) {
  return (
    <div className="dashboard-header">
      <div className="header-title-area">
        <div className="breadcrumbs text-muted text-sm">
          <span>Gestão de Projetos</span>
          <span className="mx-2">/</span>
        </div>
        <h1>{projectName || 'Painel do Projeto'}</h1>
        <div className="header-tabs mt-3" role="tablist">
          {HEADER_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`header-tab ${activeTab === tab.id ? 'header-tab--active' : ''}`}
                onClick={() => onTabChange?.(tab.id)}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 🔍 Barra de Pesquisa e Controles */}
      <div className="project-controls-bar">
        {/* Search Input */}
        <div className="project-search-wrapper">
          <Search size={15} className="project-search-icon" />
          <input
            type="text"
            className="project-search-input"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={onSearchChange}
          />
          {searchQuery && (
            <button
              className="project-search-clear"
              onClick={() => onSearchChange({ target: { value: '' } })}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Refresh Button */}
        <button
          className="project-ctrl-btn"
          title="Atualizar"
          onClick={onRefresh}
        >
          <RotateCcw size={16} />
        </button>

        {/* View Mode Toggle — Grid Active */}
        <button
          className={`project-ctrl-btn ${viewMode === 'grid' ? 'project-ctrl-btn--active' : ''}`}
          title="Visualização em Grade"
          onClick={() => onViewModeChange?.('grid')}
        >
          <LayoutGrid size={16} />
        </button>

        {/* Filter Button */}
        <button
          className={`project-ctrl-btn ${filterActive ? 'project-ctrl-btn--filter-active' : ''}`}
          title="Filtros"
          onClick={onFilterToggle}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
