import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
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
import ServiceCenter from './components/ServiceCenter';
import ShiftsModule from './components/Shifts/ShiftsModule';
import BusinessManagement from './components/BusinessManagement';
import InventoryModule from './components/Inventory/InventoryModule';
import AIInsights from './components/AIInsights';
import WorkspaceHub from './components/WorkspaceHub/WorkspaceHub';
import SLADashboard from './components/SLADashboard';
import UserProfile from './components/UserProfile';
import UserSettings from './components/UserSettings';
import BillingView from './components/BillingView';
import ClientPortal from './components/Portal/ClientPortal';
import DigitalTwinModule from './components/DigitalTwin/DigitalTwinModule';
import CalendarIntegrationSettings from './components/CalendarIntegrationSettings';
import AuthCallbackHandler from './components/AuthCallbackHandler';
import { logEvent } from './services/historyService';
import { supabase } from './supabaseClient';
import { safeQuery, stagger } from './utils/supabaseSafe';
import { processKnowledgeRow } from './services/geminiService';
import { syncOfflineQueue } from './services/offlineSyncService';
import { Sparkles, X } from 'lucide-react';
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

  // Interceptação de Rota Pública (Client Portal bypassa todo o App Principal)
  const pathname = window.location.pathname;
  if (pathname.startsWith('/portal/')) {
    const token = pathname.split('/portal/')[1];
    return <ClientPortal token={token} />;
  }

  // Interceptação de Rotas de Autenticação OAuth
  if (pathname.startsWith('/auth/')) {
    return <AuthCallbackHandler />;
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
  const [currentView, setCurrentView] = useState(() => {
    const saved = localStorage.getItem('synapseCurrentView');
    if (saved === 'kanban' || saved === 'academy') return 'workspace_hub';
    return saved || 'workspace_hub';
  });
  const [isLoginProcessing, setIsLoginProcessing] = useState(false);

  // FINAL FIX: Combined Auth state logic is now unified in the main useEffect below to prevent race conditions.
  const [workspaceTab, setWorkspaceTab] = useState('kanban');
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

  // Changed: isSessionLoading starts as true to ensure we always verify with Supabase on boot, 
  // preventing "Optimistic" UI errors where we show incorrect screens before data arrives.
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  
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
      
      const { data, error } = await safeQuery(() => 
        supabase
          .from('projects')
          .select('*')
          .eq('company_id', currentCompany.id)
      );

      if (error) {
        // Fallback robusto para quando a coluna 'id' foi renomeada ou está oculta por RLS broken
        if (error.code === '42703' && error.message.includes('id')) {
            console.warn('[App] Coluna id ausente em projects, tentando fallback...');
            const { data: fallbackData } = await safeQuery(() => 
              supabase.from('projects').select('name, company_id').eq('company_id', currentCompany.id)
            );
            if (fallbackData) {
              setProjects(fallbackData.map((p, idx) => ({ ...p, id: p.id || `p_fallback_${idx}` })));
              return;
            }
        }
        console.error('Error fetching projects:', error);
      } else if (data) {
        if (data.length === 0) {
          // Create default project in Supabase if none exist
          const defaultProj = { 
            id: `p_${Date.now()}`, 
            name: 'Projeto 1', 
            company_id: currentCompany.id 
          };
          const { error: insError } = await safeQuery(() => 
            supabase.from('projects').insert([defaultProj])
          );
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
    setTheme(prev => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'green';
      return 'dark';
    });
  };

  const handleLogin = async (email) => {
    if (isAuthenticating.current && lastAuthEmail.current === email) {
      console.log("Already authenticating for:", email);
      return;
    }
    
    try {
      isAuthenticating.current = true;
      lastAuthEmail.current = email;
      setIsLoginProcessing(true); // START LOADING
      setCurrentUser(email);
      
      const fetchWithTimeout = async () => {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Tempo limite de conexão com o banco atingido.')), 10000)
        );

        // Separação da consulta para evitar erro 406 (Not Acceptable) em joins sem FK explícita
        const fetchPromise = supabase
          .from('profiles')
          .select('*')
          .eq('email', email)
          .single();

        return await Promise.race([fetchPromise, timeoutPromise]);
      };

      const { data: profile, error: profError } = await fetchWithTimeout();

      if (profError) {
        if (profError.code === 'PGRST116') {
          setCurrentCompany(null);
          setProfileData({ name: email.split('@')[0], avatar_url: null });
          localStorage.setItem('synapseCurrentUser', email);
          setIsAuthenticated(true); // Now we know they need setup
          localStorage.setItem('synapseAuth', 'true');
          return;
        }
        throw new Error(profError.message);
      }

      if (profile) {
        // PROACTIVE FIX: Sync identity references (id and user_id)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const updates = {};
          if (profile.id !== session.user.id) updates.id = session.user.id;
          if (profile.user_id !== session.user.id) updates.user_id = session.user.id;
          
          if (Object.keys(updates).length > 0) {
             console.log("[IdentitySync] Atualizando referências de perfil:", updates);
             await supabase.from('profiles').update(updates).eq('email', email);
          }
        }

        const constructedName = profile.first_name 
          ? `${profile.first_name} ${profile.last_name || ''}`.trim() 
          : (profile.name || email.split('@')[0]);

        setProfileData({
          name: constructedName,
          avatar_url: profile.avatar_url,
          first_name: profile.first_name,
          last_name: profile.last_name
        });

        let companyData = null;
        
        // Busca direta da empresa se o profile tiver company_id
        if (profile.company_id) {
          const { data: directCo, error: directCoError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', profile.company_id)
            .single();
          
          if (!directCoError && directCo) {
            companyData = directCo;
          } else {
            console.warn("[AUTO-RECOVERY] Falha ao buscar empresa:", directCoError);
          }
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
          
          // SYNC LEGACY KEY: Ensure useShifts.js and others find the ID
          localStorage.setItem('kabania_company_id', companyData.id);
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
      setIsLoginProcessing(false); // END LOADING
    }
  };

  const handleLogoutLocal = () => {
    setIsAuthenticated(false);
    setCurrentCompany(null);
    setUserRole('member');
    setCurrentUser('');
    setIsLoginProcessing(false); // ENSURE LOGIN IS OPERATIVE
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
        // Atraso inicial para evitar conflito com outros componentes
        await stagger(300);
        
        // SAFE DESTRUCTURING: Garantir que não quebre se data for nulo
        const { data, error } = await safeQuery(() => supabase.auth.getSession());
        const session = data?.session;
        
        if (isMounted) {
          if (session?.user?.email) {
            await handleLogin(session.user.email);
          } else {
            console.log("No active session found.");
            // Se o Supabase confirmou que não há sessão, limpamos o estado
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

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log(`[AuthChange] Evento: ${event}`, session?.user?.email);

      if (event === 'SIGNED_IN' && session?.user?.email) {
        // Only run handleLogin if we aren't already logged in to this user
        if (currentUser !== session.user.email || !isAuthenticated) {
          await handleLogin(session.user.email);
        }
        setIsSessionLoading(false);
      } else if (event === 'SIGNED_OUT') {
        handleLogoutLocal();
        setIsSessionLoading(false);
      } else if (event === 'INITIAL_SESSION') {
        if (session?.user?.email) {
          await handleLogin(session.user.email);
        }
        setIsSessionLoading(false);
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setIsSessionLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (data?.subscription) {
        data.subscription.unsubscribe();
      }
    };
  }, []);

  // Sync Offline Queue when returning online
  useEffect(() => {
    const handleOnline = async () => {
      console.log("[PWA] Conexão restaurada. Tentando sincronizar fila offline...");
      const { processed, failed } = await syncOfflineQueue(supabase);
      if (processed > 0) {
        alert(`Sincronização Offline: ${processed} itens enviados com sucesso para a nuvem.`);
      }
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
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
        <Login onLogin={handleLogin} isLoading={isLoginProcessing} />
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
              currentView={currentView}
              onViewChange={setCurrentView}
              workspaceTab={workspaceTab}
              setWorkspaceTab={setWorkspaceTab}
              searchQuery={searchQuery}
              onSearchChange={(e) => setSearchQuery(e.target.value)}
              currentUser={currentUser}
              currentCompany={currentCompany}
              profileData={profileData}
              userRole={userRole}
              onLogout={handleLogout}
              theme={theme}
              onToggleTheme={toggleTheme}
              projects={projects}
              selectedProjectId={selectedProjectId}
              onProjectChange={(id) => {
                setSelectedProjectId(id);
                setCurrentView('workspace_hub');
              }}
              onAddProject={handleAddProject}
              onRemoveProject={handleRemoveProject}
            />
            <div className="content-scroll" key={currentView}>
              {currentView === 'workspace_hub' ? (
                <WorkspaceHub
                  workspaceTab={workspaceTab}
                  searchQuery={searchQuery}
                  onSearchChange={(e) => setSearchQuery(e.target.value)}
                  projectName={projects.find(p => p.id === selectedProjectId)?.name || 'Projeto'}
                  projects={projects}
                  selectedProjectId={selectedProjectId}
                  currentUser={currentUser}
                  currentCompany={currentCompany}
                  userRole={userRole}
                />
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
              ) : currentView === 'shifts' ? (
                <ShiftsModule 
                  companyId={currentCompany?.id} 
                  currentUser={currentUser}
                  userRole={userRole}
                />
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
              ) : currentView === 'sla_dashboard' ? (
                <SLADashboard currentCompany={currentCompany} currentUser={currentUser} />
              ) : currentView === 'service_center' ? (
                <ServiceCenter currentCompany={currentCompany} currentUser={currentUser} />
              ) : currentView === 'inventory' ? (
                <InventoryModule companyId={currentCompany?.id} currentUser={currentUser} userRole={userRole} />
              ) : currentView === 'digital_twin' ? (
                <DigitalTwinModule currentCompany={currentCompany} currentUser={currentUser} />
              ) : currentView === 'profile' ? (
                <UserProfile currentUser={currentUser} currentCompany={currentCompany} userRole={userRole} onProfileUpdate={handleProfileUpdate} />
              ) : currentView === 'settings' ? (
                <UserSettings theme={theme} onSetTheme={setTheme} />
              ) : currentView === 'billing' ? (
                <BillingView currentCompany={currentCompany} />
                ) : currentView === 'calendar_settings' ? (
                  <Suspense fallback={<div className="p-8 text-center">Carregando Configurações...</div>}>
                    <CalendarIntegrationSettings 
                      currentCompany={currentCompany} 
                      currentUser={currentUser} 
                      userRole={userRole} 
                    />
                  </Suspense>
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
