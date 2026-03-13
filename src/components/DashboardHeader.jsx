import React from 'react';
import './Dashboard.css';

export default function DashboardHeader({ projectName }) {
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
      
      

    </div>
  );
}
