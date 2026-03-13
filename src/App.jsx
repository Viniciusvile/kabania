import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import DashboardHeader from './components/DashboardHeader';
import KanbanBoard from './components/KanbanBoard';
import KnowledgeBase from './components/KnowledgeBase';
import ActivityList from './components/ActivityList';
import ActivityCalendar from './components/ActivityCalendar';
import AIChatFab from './components/AIChatFab';
import Login from './components/Login';
import CompanySetup from './components/CompanySetup';
import CompanyPanel from './components/CompanyPanel';
import ReportsDashboard from './components/ReportsDashboard';
import BusinessManagement from './components/BusinessManagement';
import AIInsights from './components/AIInsights';
import { logEvent } from './services/historyService';
import './App.css';
import './components/AIChatFab.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    localStorage.getItem('synapseAuth') === 'true'
  );
  const [currentUser, setCurrentUser] = useState(() =>
    localStorage.getItem('synapseCurrentUser') || ''
  );
  const [currentCompany, setCurrentCompany] = useState(() => {
    const saved = localStorage.getItem('synapseCurrentCompany');
    return saved ? JSON.parse(saved) : null;
  });
  const [userRole, setUserRole] = useState(() =>
    localStorage.getItem('synapseUserRole') || 'member'
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState('kanban');
  const [theme, setTheme] = useState(() => 
    localStorage.getItem('synapseTheme') || 'dark'
  );
  
  // Multi-project state
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(
    localStorage.getItem('synapseSelectedProjectId') || null
  );

  // Load and sync projects + Migration
  useEffect(() => {
    if (currentCompany?.id) {
      const allProjects = JSON.parse(localStorage.getItem('synapseProjects') || '[]');
      const companyProjects = allProjects.filter(p => p.companyId === currentCompany.id);
      
      let defaultId = selectedProjectId;

      if (companyProjects.length === 0) {
        // Create default project
        const defaultProj = { id: `p_${Date.now()}`, name: 'Projeto 1', companyId: currentCompany.id };
        const updatedAll = [...allProjects, defaultProj];
        localStorage.setItem('synapseProjects', JSON.stringify(updatedAll));
        setProjects([defaultProj]);
        defaultId = defaultProj.id;
        setSelectedProjectId(defaultId);
      } else {
        setProjects(companyProjects);
        if (!companyProjects.find(p => p.id === selectedProjectId)) {
          defaultId = companyProjects[0].id;
          setSelectedProjectId(defaultId);
        }
      }

      // Migration: Tag legacy tasks (no projectId) to the default project for this company
      if (currentUser && defaultId) {
        const userTasksKey = `synapseTasks_${currentUser}`;
        const userTasks = JSON.parse(localStorage.getItem(userTasksKey) || '[]');
        const needsResave = userTasks.some(t => !t.projectId);
        
        if (needsResave) {
          const migratedTasks = userTasks.map(t => t.projectId ? t : { ...t, projectId: defaultId });
          localStorage.setItem(userTasksKey, JSON.stringify(migratedTasks));
          // This will trigger a re-render in KanbanBoard if it's currently showing
        }
      }
    } else {
      setProjects([]);
    }
  }, [currentCompany?.id, currentUser]);

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('synapseSelectedProjectId', selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleAddProject = (name) => {
    if (!currentCompany?.id) return;
    const newProj = { id: `p_${Date.now()}`, name, companyId: currentCompany.id };
    const allProjects = JSON.parse(localStorage.getItem('synapseProjects') || '[]');
    const updated = [...allProjects, newProj];
    localStorage.setItem('synapseProjects', JSON.stringify(updated));
    setProjects(prev => [...prev, newProj]);
    setSelectedProjectId(newProj.id);
  };

  const handleRemoveProject = (projectIdToRemove) => {
    if (!currentCompany?.id || projects.length <= 1) return; // Prevent deleting the last project
    
    if (window.confirm('Tem certeza que deseja excluir este projeto e TODAS as suas tarefas?')) {
      const allProjects = JSON.parse(localStorage.getItem('synapseProjects') || '[]');
      const updatedProjects = allProjects.filter(p => p.id !== projectIdToRemove);
      localStorage.setItem('synapseProjects', JSON.stringify(updatedProjects));
      
      const companyProjects = updatedProjects.filter(p => p.companyId === currentCompany.id);
      setProjects(companyProjects);

      // Cleanup tasks for this project
      if (currentUser) {
        const userTasksKey = `synapseTasks_${currentUser}`;
        const userTasks = JSON.parse(localStorage.getItem(userTasksKey) || '[]');
        const filteredTasks = userTasks.filter(t => t.projectId !== projectIdToRemove);
        localStorage.setItem(userTasksKey, JSON.stringify(filteredTasks));
      }

      // If we deleted the active project, switch to another one
      if (selectedProjectId === projectIdToRemove) {
        setSelectedProjectId(companyProjects[0]?.id || null);
      }
    }
  };

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('synapseTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Helper: get tasks for current user (for Reports Dashboard)
  const getTasks = () => {
    try {
      return JSON.parse(localStorage.getItem(`synapseTasks_${currentUser}`) || '[]');
    } catch {
      return [];
    }
  };

  // Persist auth state
  useEffect(() => {
    localStorage.setItem('synapseAuth', isAuthenticated);
    if (!isAuthenticated) {
      localStorage.removeItem('synapseCurrentUser');
      localStorage.removeItem('synapseCurrentCompany');
      localStorage.removeItem('synapseUserRole');
    } else {
      localStorage.setItem('synapseCurrentUser', currentUser);
      if (currentCompany) localStorage.setItem('synapseCurrentCompany', JSON.stringify(currentCompany));
      localStorage.setItem('synapseUserRole', userRole);
    }
  }, [isAuthenticated, currentUser, currentCompany, userRole]);

  const handleLogin = (email) => {
    const users = JSON.parse(localStorage.getItem('synapseUsers') || '[]');
    const user = users.find(u => u.email === email);
    setCurrentUser(email);
    if (user?.companyId) {
      const companies = JSON.parse(localStorage.getItem('synapseCompanies') || '[]');
      const company = companies.find(c => c.id === user.companyId);
      if (company) {
        const cwr = { ...company, role: user.role || 'member' };
        setCurrentCompany(cwr);
        setUserRole(user.role || 'member');
        localStorage.setItem('synapseCurrentCompany', JSON.stringify(cwr));
        localStorage.setItem('synapseUserRole', user.role || 'member');
      } else {
        setCurrentCompany(null);
      }
    } else {
      setCurrentCompany(null);
    }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentCompany(null);
    setUserRole('member');
    setCurrentUser('');
  };

  const handleCompanySetupComplete = ({ company, role }) => {
    const cwr = { ...company, role };
    setCurrentCompany(cwr);
    setUserRole(role);
    localStorage.setItem('synapseCurrentCompany', JSON.stringify(cwr));
    localStorage.setItem('synapseUserRole', role);
  };

  if (!isAuthenticated) {
    return (
      <GoogleOAuthProvider clientId="505677501484-akagu47q7uvb7mlat2csaavj1gau4ses.apps.googleusercontent.com">
        <Login onLogin={handleLogin} />
      </GoogleOAuthProvider>
    );
  }

  if (!currentCompany) {
    return <CompanySetup currentUser={currentUser} onComplete={handleCompanySetupComplete} />;
  }

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onLogout={handleLogout}
        currentView={currentView}
        onViewChange={setCurrentView}
        userRole={userRole}
      />
      <div className="main-content">
        <TopBar
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          searchQuery={searchQuery}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          currentUser={currentUser}
          currentCompany={currentCompany}
          userRole={userRole}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectChange={(id) => {
            setSelectedProjectId(id);
            setCurrentView('kanban');
          }}
          onAddProject={handleAddProject}
          onRemoveProject={handleRemoveProject}
        />
        <div className="content-scroll">
          {currentView === 'kanban' ? (
            <>
              <DashboardHeader projectName={projects.find(p => p.id === selectedProjectId)?.name || 'Projeto'} />
              <KanbanBoard
                searchQuery={searchQuery}
                currentUser={currentUser}
                currentCompany={currentCompany}
                projectId={selectedProjectId}
              />
            </>
          ) : currentView === 'knowledge' ? (
            <KnowledgeBase currentUser={currentUser} currentCompany={currentCompany} userRole={userRole} />
          ) : currentView === 'activities' ? (
            <ActivityList currentUser={currentUser} currentCompany={currentCompany} />
          ) : currentView === 'calendar' ? (
            <ActivityCalendar currentUser={currentUser} />
          ) : currentView === 'company' ? (
            <CompanyPanel currentUser={currentUser} currentCompany={currentCompany} userRole={userRole} />
          ) : currentView === 'reports' ? (
            <ReportsDashboard tasks={getTasks()} currentUser={currentUser} />
          ) : currentView === 'business_history' || currentView === 'business_export' ? (
            <BusinessManagement
              currentUser={currentUser}
              currentCompany={currentCompany}
              userRole={userRole}
              initialTab={currentView === 'business_history' ? 'history' : 'export'}
            />
          ) : currentView === 'ai_insights' ? (
            <AIInsights currentUser={currentUser} currentCompany={currentCompany} />
          ) : (
            <div className="p-8 text-center text-muted">View em desenvolvimento</div>
          )}
        </div>
      </div>
      <AIChatFab />
    </div>
  );
}

export default App;
