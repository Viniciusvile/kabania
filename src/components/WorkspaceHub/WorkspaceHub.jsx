import React, { useEffect } from 'react';
import KanbanBoard from '../KanbanBoard';
import DashboardHeader from '../DashboardHeader';
import Academy from '../Academy';
import './WorkspaceHub.css';
import '../../liquidGlass.css';

function initLiquidGL() {
  if (typeof window.liquidGL === 'function') {
    try {
      window.liquidGL({
        resolution: 1.5,
        refraction: 0.04,
        bevelDepth: 0.08,
        bevelWidth: 0.18,
        frost: 1,
        interactive: false,
        magnify: 1,
      });
    } catch (_) {}
  }
}

export default function WorkspaceHub({
  workspaceTab, searchQuery, onSearchChange, projectName, projects, selectedProjectId,
  currentUser, currentCompany, userRole, crmOcorrencias = [], selectedCondominioId = null
}) {
  useEffect(() => {
    const t = setTimeout(initLiquidGL, 400);
    return () => clearTimeout(t);
  }, [workspaceTab]);

  return (
    <div className="workspace-hub">
      <div className="workspace-panel" key={workspaceTab}>
        {workspaceTab === 'kanban' ? (
          <div className="ws-kanban-wrapper">
            <DashboardHeader
              projectName={projectName}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              onRefresh={() => window.location.reload()}
              viewMode="grid"
              onFilterToggle={() => {}}
            />
            <KanbanBoard
              searchQuery={searchQuery}
              currentUser={currentUser}
              currentCompany={currentCompany}
              projectId={selectedProjectId}
              crmOcorrencias={crmOcorrencias}
              selectedCondominioId={selectedCondominioId}
            />
          </div>
        ) : (
          <div className="ws-academy-wrapper animate-fade-in">
            <Academy currentCompany={currentCompany} currentUser={currentUser} userRole={userRole} />
          </div>
        )}
      </div>
    </div>
  );
}
