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
import './App.css';
import './components/AIChatFab.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('synapseAuth') === 'true';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('synapseCurrentUser') || '';
  });
  
  // Save auth state to DB
  useEffect(() => {
    localStorage.setItem('synapseAuth', isAuthenticated);
    if (!isAuthenticated) {
      localStorage.removeItem('synapseCurrentUser');
    } else {
      localStorage.setItem('synapseCurrentUser', currentUser);
    }
  }, [isAuthenticated, currentUser]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState('kanban');

  const handleLogin = (email) => {
    setCurrentUser(email);
    setIsAuthenticated(true);
  };
  const handleLogout = () => setIsAuthenticated(false);

  if (!isAuthenticated) {
    return (
      <GoogleOAuthProvider clientId="505677501484-akagu47q7uvb7mlat2csaavj1gau4ses.apps.googleusercontent.com">
        <Login onLogin={handleLogin} />
      </GoogleOAuthProvider>
    );
  }

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onLogout={handleLogout} 
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      <div className="main-content">
        <TopBar 
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
          searchQuery={searchQuery}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        <div className="content-scroll">
          {currentView === 'kanban' ? (
            <>
              <DashboardHeader />
              <KanbanBoard searchQuery={searchQuery} currentUser={currentUser} />
            </>
          ) : currentView === 'knowledge' ? (
            <KnowledgeBase currentUser={currentUser} />
          ) : currentView === 'activities' ? (
            <ActivityList currentUser={currentUser} />
          ) : currentView === 'calendar' ? (
            <ActivityCalendar currentUser={currentUser} />
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
