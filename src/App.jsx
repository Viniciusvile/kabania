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
        />
        <div className="content-scroll">
          {currentView === 'kanban' ? (
            <>
              <DashboardHeader />
              <KanbanBoard
                searchQuery={searchQuery}
                currentUser={currentUser}
                currentCompany={currentCompany}
              />
            </>
          ) : currentView === 'knowledge' ? (
            <KnowledgeBase currentUser={currentUser} currentCompany={currentCompany} userRole={userRole} />
          ) : currentView === 'activities' ? (
            <ActivityList currentUser={currentUser} />
          ) : currentView === 'calendar' ? (
            <ActivityCalendar currentUser={currentUser} />
          ) : currentView === 'company' ? (
            <CompanyPanel currentUser={currentUser} currentCompany={currentCompany} userRole={userRole} />
          ) : currentView === 'reports' ? (
            <ReportsDashboard tasks={getTasks()} currentUser={currentUser} />
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
