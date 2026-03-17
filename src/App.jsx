import React, { useState, useEffect, useRef } from 'react';
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
import UserProfile from './components/UserProfile';
import SupportPortal from './components/SupportPortal';
import UserSettings from './components/UserSettings';
import BillingView from './components/BillingView';
import { logEvent } from './services/historyService';
import { supabase } from './supabaseClient';
import { processKnowledgeRow } from './services/geminiService';
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

  // Changed: Initial state based on localStorage for "Optimistic" UI
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState(() => 
    localStorage.getItem('synapseCurrentView') || 'kanban'
  );
  const [theme, setTheme] = useState(() => 
    localStorage.getItem('synapseTheme') || 'dark'
  );
  
  // Background Import State
  const [bulkImportStatus, setBulkImportStatus] = useState({ 
    isActive: false, 
    current: 0, 
    total: 0, 
    results: null 
  });
  const [profileData, setProfileData] = useState(() => {
    const saved = localStorage.getItem('synapseProfileData');
    return saved ? JSON.parse(saved) : { name: '', avatar_url: null };
  });

  // Persist currentView whenever it changes
  useEffect(() => {
    localStorage.setItem('synapseCurrentView', currentView);
  }, [currentView]);

  // Changed: isSessionLoading starts as false if we have local info, skipping the flicker
  const [isSessionLoading, setIsSessionLoading] = useState(() => {
    return localStorage.getItem('synapseAuth') !== 'true';
  });
  
  // Multi-project state
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(
    localStorage.getItem('synapseSelectedProjectId') || null
  );

  // Performance: prevent duplicate login calls
  const isAuthenticating = useRef(false);
  const lastAuthEmail = useRef('');

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

  const runBackgroundImport = async (rows, currentKnowledge) => {
    setBulkImportStatus({ isActive: true, current: 0, total: rows.length, results: null });
    let newCount = 0;
    let mergeCount = 0;
    let errorCount = 0;
    let localKnowledge = [...currentKnowledge];

    for (let i = 0; i < rows.length; i++) {
      setBulkImportStatus(prev => ({ ...prev, current: i + 1 }));
      try {
        const analysis = await processKnowledgeRow(rows[i], localKnowledge);
        if (!analysis) {
          errorCount++;
          continue;
        }

        if (analysis.action === 'create') {
          const newItem = {
            id: `kb-bulk-${Date.now()}-${i}`,
            title: analysis.suggested.title,
            description: analysis.suggested.description,
            enabled: true,
            type: 'file',
            tags: analysis.suggested.tags,
            section: analysis.suggested.section || 'general',
            company_id: currentCompany?.id,
            created_at: new Date().toISOString()
          };
          const { error } = await supabase.from('knowledge_base').insert([newItem]);
          if (!error) {
            localKnowledge = [newItem, ...localKnowledge];
            newCount++;
          } else {
            errorCount++;
          }
        } else if (analysis.action === 'merge' && analysis.existingId) {
          const item = localKnowledge.find(it => it.id === analysis.existingId);
          if (item) {
            const payload = {
              description: `${item.description}\n\n[Bulk Update]: ${analysis.suggested.description}`,
              tags: [...new Set([...item.tags, ...analysis.suggested.tags])]
            };
            const { error } = await supabase.from('knowledge_base').update(payload).eq('id', analysis.existingId);
            if (!error) {
              localKnowledge = localKnowledge.map(it => it.id === analysis.existingId ? { ...it, ...payload } : it);
              mergeCount++;
            } else {
              errorCount++;
            }
          } else {
            errorCount++;
          }
        }
      } catch (err) {
        console.error("Background Import Error:", err);
        errorCount++;
      }
    }

    setBulkImportStatus(prev => ({ 
      ...prev, 
      isActive: false, 
      results: { total: rows.length, newCount, mergeCount, errorCount } 
    }));
    
    logEvent(currentCompany.id, currentUser, 'BULK_UPLOAD_KB', `Background import: ${newCount} created, ${mergeCount} merged, ${errorCount} errors.`);
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
    if (isAuthenticating.current && lastAuthEmail.current === email) {
      console.log("Already authenticating for:", email);
      return;
    }
    
    try {
      isAuthenticating.current = true;
      lastAuthEmail.current = email;
      setCurrentUser(email);
      
      const fetchWithTimeout = async () => {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Tempo limite de conexão com o banco atingido.')), 10000)
        );

        const fetchPromise = supabase
          .from('profiles')
          .select('*, companies(*)')
          .eq('email', email)
          .single();

        return await Promise.race([fetchPromise, timeoutPromise]);
      };

      const { data: profile, error: profError } = await fetchWithTimeout();

      if (profError) {
        if (profError.code === 'PGRST116') {
          setCurrentCompany(null);
          setProfileData({ name: email.split('@')[0], avatar_url: null });
          setIsAuthenticated(true);
          localStorage.setItem('synapseAuth', 'true');
          localStorage.setItem('synapseCurrentUser', email);
          return;
        }
        throw new Error(profError.message);
      }

      if (profile) {
        // PROACTIVE FIX: Link user_id if missing (for legacy accounts)
        if (!profile.user_id) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            await supabase.from('profiles').update({ user_id: session.user.id }).eq('email', email);
          }
        }

        setProfileData({
          name: profile.name || email.split('@')[0],
          avatar_url: profile.avatar_url
        });
        let companyData = null;
        if (Array.isArray(profile.companies)) {
          companyData = profile.companies[0];
        } else if (profile.companies) {
          companyData = profile.companies;
        }

        // FALLBACK: If join failed but we have a company_id, try a direct fetch
        if (!companyData && profile.company_id) {
          console.warn("[AUTO-RECOVERY] Join failed for profile:", profile.id, "Attempting direct company fetch for ID:", profile.company_id);
          
          const fetchCompany = async (retryCount = 0) => {
            const { data: directCo, error: directCoError } = await supabase
              .from('companies')
              .select('*')
              .eq('id', profile.company_id)
              .single();
            
            if (!directCoError && directCo) {
              console.log("[AUTO-RECOVERY] Company fetch SUCCESS on attempt:", retryCount + 1);
              return directCo;
            }
            
            if (retryCount < 1) { // One extra retry after delay
              console.warn("[AUTO-RECOVERY] Fetch failed, retrying in 1s...");
              await new Promise(r => setTimeout(r, 1000));
              return fetchCompany(retryCount + 1);
            }
            
            console.error("[AUTO-RECOVERY] All company fetch attempts FAILED:", directCoError);
            return null;
          };

          companyData = await fetchCompany();
        }

        if (companyData) {
          const cwr = { 
            ...companyData, 
            createdAt: companyData.created_at || companyData.createdAt,
            role: profile.role || 'member' 
          };
          setCurrentCompany(cwr);
          setUserRole(profile.role || 'member');
          localStorage.setItem('synapseCurrentCompany', JSON.stringify(cwr));
          localStorage.setItem('synapseUserRole', profile.role || 'member');
        } else if (profile.company_id) {
          // CRITICAL FIX: If we have a company_id but failed to fetch, 
          // do NOT let the app settle into 'null' company (which triggers Setup)
          console.error("User MUST have a company but we couldn't load it. Blocking setup screen.");
          setCurrentCompany({ id: profile.company_id, name: 'Carregando...', isPlaceholder: true });
        } else {
          console.log("User has NO company_id in profile. Setting to null.");
          setCurrentCompany(prev => {
            if (prev) return prev;
            localStorage.removeItem('synapseCurrentCompany');
            return null;
          });
        }
      }
      
      setIsAuthenticated(true);
      localStorage.setItem('synapseAuth', 'true');
      localStorage.setItem('synapseCurrentUser', email);
    } catch (err) {
      console.error("Critical handleLogin error:", err);
      throw err;
    } finally {
      isAuthenticating.current = false;
    }
  };

  const handleLogoutLocal = () => {
    setIsAuthenticated(false);
    setCurrentCompany(null);
    setUserRole('member');
    setCurrentUser('');
    localStorage.removeItem('synapseAuth');
    localStorage.removeItem('synapseCurrentUser');
    localStorage.removeItem('synapseCurrentCompany');
    localStorage.removeItem('synapseUserRole');
  };

  const handleLogout = () => {
    // Clear local state immediately for instant feedback
    handleLogoutLocal();
    
    // Trigger Supabase signOut in background
    supabase.auth.signOut().catch(err => {
      console.error("SignOut background error:", err);
    });
  };

  // Load session on mount
  useEffect(() => {
    let isMounted = true;
    
    // Safety fallback: if session takes more than 5s, stop loading
    const timer = setTimeout(() => {
      if (isMounted) {
        console.warn("Session loading timeout reached.");
        setIsSessionLoading(false);
      }
    }, 5000);

    const initSession = async () => {
      try {
        // Removed: setIsSessionLoading(true) to prevent flicker on refresh
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (isMounted) {
          if (session) {
            await handleLogin(session.user.email);
          } else {
            console.log("No active session found.");
            // If Supabase says no session, we trust it over localStorage
            setIsAuthenticated(false);
          }
        }
      } catch (err) {
        console.error("Error during session init:", err);
      } finally {
        if (isMounted) {
          setIsSessionLoading(false);
          clearTimeout(timer);
        }
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isMounted) {
        if (event === 'SIGNED_IN' && session) {
          await handleLogin(session.user.email);
          setIsSessionLoading(false);
        } else if (event === 'SIGNED_OUT') {
          handleLogoutLocal();
          setIsSessionLoading(false);
        } else if (event === 'INITIAL_SESSION') {
          if (!session) setIsSessionLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          setIsSessionLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
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
      localStorage.setItem('synapseProfileData', JSON.stringify(profileData));
    }
  }, [isAuthenticated, currentUser, currentCompany, userRole, profileData]);

  const handleProfileUpdate = (newData) => {
    setProfileData(prev => ({ ...prev, ...newData }));
  };

  if (isSessionLoading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#0f172a',
        gap: '20px'
      }}>
        <div style={{ color: '#60a5fa', fontSize: '1.2rem', fontWeight: 'bold' }}>
          Restaurando sessão...
        </div>
        <div className="spinner-new"></div>
        
        {/* Emergency Bypass if stuck */}
        <button 
          onClick={() => setIsSessionLoading(false)}
          style={{
            marginTop: '20px',
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Demorando muito? Entrar manualmente
        </button>
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

  return (
    <>
      {!isAuthenticated ? (
        <Login onLogin={handleLogin} />
      ) : !currentCompany && !isSessionLoading ? (
        <CompanySetup currentUser={currentUser} onComplete={handleCompanySetupComplete} onLogout={handleLogout} />
      ) : !currentCompany && isSessionLoading ? (
        <div className="restoring-session-backdrop">
          <div className="restoring-session-content">
            <div className="loading-spinner" />
            <p>Carregando informações da empresa...</p>
          </div>
        </div>
      ) : (
        <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
            onLogout={handleLogout}
            currentView={currentView}
            onViewChange={(view) => {
              setCurrentView(view);
              setIsMobileMenuOpen(false); // Close on navigation
            }}
            userRole={userRole}
          />
          <div className="main-content">
            <TopBar
              onToggleSidebar={() => {
                if (window.innerWidth <= 768) {
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                } else {
                  setIsSidebarCollapsed(!isSidebarCollapsed);
                }
              }}
              onViewChange={setCurrentView}
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
                <KnowledgeBase 
                  currentUser={currentUser} 
                  currentCompany={currentCompany} 
                  userRole={userRole} 
                  onRunBulkImport={runBackgroundImport}
                />
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
              ) : currentView === 'support' ? (
                <SupportPortal currentUser={currentUser} currentCompany={currentCompany} />
              ) : currentView === 'profile' ? (
                <UserProfile currentUser={currentUser} currentCompany={currentCompany} userRole={userRole} />
              ) : currentView === 'settings' ? (
                <UserSettings theme={theme} onToggleTheme={toggleTheme} />
              ) : currentView === 'billing' ? (
                <BillingView currentCompany={currentCompany} />
              ) : (
                <div className="p-8 text-center text-muted">View em desenvolvimento</div>
              )}
            </div>
          </div>
          <AIChatFab currentCompany={currentCompany} />

          {/* Global Background Import Progress */}
          {(bulkImportStatus.isActive || bulkImportStatus.results) && (
            <div className={`global-bg-import ${bulkImportStatus.results ? 'completed' : 'active'}`}>
              <div className="bg-import-icon">
                <Sparkles size={16} className={bulkImportStatus.isActive ? 'animate-pulse' : ''} />
              </div>
              <div className="bg-import-content">
                {bulkImportStatus.isActive ? (
                  <>
                    <div className="bg-import-text">Importando Dados ({bulkImportStatus.current}/{bulkImportStatus.total})</div>
                    <div className="bg-import-bar-shell">
                      <div className="bg-import-bar" style={{ width: `${(bulkImportStatus.current / bulkImportStatus.total) * 100}%` }} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-import-text">Importação Concluída!</div>
                    <div className="bg-import-summary">
                      {bulkImportStatus.results.newCount} novos, {bulkImportStatus.results.mergeCount} mesclados
                    </div>
                    <button className="bg-import-close" onClick={() => setBulkImportStatus({ ...bulkImportStatus, results: null })}>
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default App;
