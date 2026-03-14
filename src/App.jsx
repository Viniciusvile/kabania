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
import { supabase } from './supabaseClient';
import './App.css';
import './components/AIChatFab.css';

function App() {
  if (!supabase) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#0f172a', 
        color: 'white',
        fontFamily: 'sans-serif',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ color: '#ef4444' }}>⚠️ Configuração Pendente</h1>
        <p style={{ maxWidth: '500px', fontSize: '18px', lineHeight: '1.6' }}>
          O site foi carregado, mas as <b>Variáveis de Ambiente (VITE_SUPABASE_URL)</b> não foram configuradas no Vercel.
        </p>
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', marginTop: '20px', textAlign: 'left' }}>
          <p>Para resolver:</p>
          <ol>
            <li>Vá ao painel do Vercel</li>
            <li>Settings &gt; Environment Variables</li>
            <li>Adicione as chaves do seu arquivo <code>.env</code></li>
            <li>Faça um novo Deployment</li>
          </ol>
        </div>
      </div>
    );
  }

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
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  
  // Multi-project state
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(
    localStorage.getItem('synapseSelectedProjectId') || null
  );

  // Load and sync projects from Supabase
  useEffect(() => {
    const fetchProjects = async () => {
      if (!currentCompany?.id) {
        setProjects([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', currentCompany.id);

      if (!error && data) {
        if (data.length === 0) {
          // Create default project in Supabase if none exist
          const defaultProj = { 
            id: `p_${Date.now()}`, 
            name: 'Projeto 1', 
            company_id: currentCompany.id 
          };
          const { error: insError } = await supabase.from('projects').insert([defaultProj]);
          if (!insError) {
            setProjects([defaultProj]);
            setSelectedProjectId(defaultProj.id);
          }
        } else {
          setProjects(data);
          if (!data.find(p => p.id === selectedProjectId)) {
            setSelectedProjectId(data[0].id);
          }
        }
      } else if (error) {
        console.error('Error fetching projects:', error);
      }
    };

    fetchProjects();
  }, [currentCompany?.id]);

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('synapseSelectedProjectId', selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleAddProject = async (name) => {
    if (!currentCompany?.id) return;
    const newProj = { id: `p_${Date.now()}`, name, company_id: currentCompany.id };
    
    const { error } = await supabase.from('projects').insert([newProj]);

    if (!error) {
      setProjects(prev => [...prev, newProj]);
      setSelectedProjectId(newProj.id);
    } else {
      console.error('Error creating project:', error);
    }
  };

  const handleRemoveProject = async (projectIdToRemove) => {
    if (!currentCompany?.id || projects.length <= 1) return;
    
    if (window.confirm('Tem certeza que deseja excluir este projeto e TODAS as suas tarefas?')) {
      const { error } = await supabase.from('projects').delete().eq('id', projectIdToRemove);

      if (!error) {
        const updatedProjects = projects.filter(p => p.id !== projectIdToRemove);
        setProjects(updatedProjects);

        if (selectedProjectId === projectIdToRemove) {
          setSelectedProjectId(updatedProjects[0]?.id || null);
        }
      } else {
        console.error('Error removing project:', error);
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

  const handleLogin = async (email) => {
    setCurrentUser(email);
    
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (!profError && profile) {
      if (profile.company_id) {
        const { data: company, error: coError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();

        if (!coError && company) {
          const cwr = { ...company, role: profile.role || 'member' };
          setCurrentCompany(cwr);
          setUserRole(profile.role || 'member');
        } else {
          setCurrentCompany(null);
        }
      } else {
        setCurrentCompany(null);
      }
    } else {
      // User has no profile yet or error (shouldn't happen on login)
      setCurrentCompany(null);
    }
    
    setIsAuthenticated(true);
  };

  const handleLogoutLocal = () => {
    setIsAuthenticated(false);
    setCurrentCompany(null);
    setUserRole('member');
    setCurrentUser('');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    handleLogoutLocal();
  };

  // Load session on mount
  useEffect(() => {
    const initSession = async () => {
      setIsSessionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await handleLogin(session.user.email);
      }
      setIsSessionLoading(false);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await handleLogin(session.user.email);
        setIsSessionLoading(false);
      } else if (event === 'SIGNED_OUT') {
        handleLogoutLocal();
        setIsSessionLoading(false);
      } else if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        // Just ensure we're not stuck in loading if these fire
        setIsSessionLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Persist local auth only for "session" persistence
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

  if (isSessionLoading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#0f172a' 
      }}>
        <div style={{ color: '#0052cc', fontSize: '1.2rem', fontWeight: 'bold' }}>
          Restaurando sessão...
        </div>
      </div>
    );
  }

  const handleCompanySetupComplete = ({ company, role }) => {
    const cwr = { ...company, role };
    setCurrentCompany(cwr);
    setUserRole(role);
    localStorage.setItem('synapseCurrentCompany', JSON.stringify(cwr));
    localStorage.setItem('synapseUserRole', role);
  };

  if (!isAuthenticated) {
    return (
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "505677501484-h3n43t426kbo436gi3fq2s57b3npcqg6.apps.googleusercontent.com"}>
        <Login onLogin={handleLogin} />
      </GoogleOAuthProvider>
    );
  }

  if (!currentCompany) {
    return <CompanySetup currentUser={currentUser} onComplete={handleCompanySetupComplete} />;
  }

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "505677501484-h3n43t426kbo436gi3fq2s57b3npcqg6.apps.googleusercontent.com"}>
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
              <ActivityCalendar currentUser={currentUser} currentCompany={currentCompany} />
            ) : currentView === 'company' ? (
              <CompanyPanel currentUser={currentUser} currentCompany={currentCompany} userRole={userRole} />
            ) : currentView === 'reports' ? (
              <ReportsDashboard currentCompany={currentCompany} currentUser={currentUser} />
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
        <AIChatFab currentCompany={currentCompany} />
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
