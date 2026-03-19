import React from 'react';
import { Search, RotateCcw, LayoutGrid, SlidersHorizontal, X } from 'lucide-react';
import './Dashboard.css';

export default function DashboardHeader({ 
  projectName, 
  searchQuery = '', 
  onSearchChange, 
  onRefresh,
  viewMode = 'grid',
  onViewModeChange,
  filterActive = false,
  onFilterToggle
}) {
  return (
    <div className="dashboard-header">
      <div className="header-title-area">
        <h1>{projectName || 'Painel do Projeto'}</h1>
        <div className="breadcrumbs text-muted text-sm mt-1">
          <span>Gestão de Projetos</span>
          <span className="mx-2">/</span>
          <span className="text-accent">{projectName}</span>
        </div>
        <div className="header-tags mt-3">
          <span className="tag-filled">+ Documento</span>
          <span className="tag-filled dark">Carga</span>
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
