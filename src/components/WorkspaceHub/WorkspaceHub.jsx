import React from 'react';
import KanbanBoard from '../KanbanBoard';
import DashboardHeader from '../DashboardHeader';
import Academy from '../Academy';
import './WorkspaceHub.css';

export default function WorkspaceHub({
  workspaceTab, searchQuery, onSearchChange, projectName, projects, selectedProjectId,
  currentUser, currentCompany, userRole
}) {
  return (
    <div className="workspace-hub-container animate-fade-in">
      <div className="workspace-hub-content animate-fade-in" key={workspaceTab}>
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
            />
          </div>
        ) : (
          <div className="ws-academy-wrapper">
             <Academy currentCompany={currentCompany} currentUser={currentUser} userRole={userRole} />
          </div>
        )}
      </div>
    </div>
  );
}
