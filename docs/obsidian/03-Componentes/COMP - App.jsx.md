---
tags: [componente, core, roteamento, estado-global, app]
status: ativo
complexidade: alta
ecossistema: componentes
---

# ⚛️ App.jsx — Componente Raiz

← Voltar ao [[COMP - Hub de Componentes]]

**Arquivo:** `src/App.jsx`

> [!info] Coração do Sistema
> `App.jsx` é o componente raiz da aplicação. Ele centraliza estado de autenticação, tema, navegação e projeto selecionado. Atua como orquestrador de toda a árvore de componentes.

---

## Responsabilidades

1. **Verificação de sessão** ao montar (via Supabase Auth)
2. **Roteamento** entre views (currentView state)
3. **Gerenciamento de tema** dark/light + persistência
4. **Carregamento de projetos** da empresa atual
5. **Controle do layout** (sidebar, mobile menu)
6. **Renderização condicional** baseada em auth state

---

## Estado Interno (`useState`)

```jsx
// === AUTENTICAÇÃO ===
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [currentUser, setCurrentUser] = useState(null);
const [currentCompany, setCurrentCompany] = useState(null);
const [userRole, setUserRole] = useState('member');
const [profileData, setProfileData] = useState(null);

// === LOADING ===
const [isSessionLoading, setIsSessionLoading] = useState(true);
const [isLoginProcessing, setIsLoginProcessing] = useState(false);

// === NAVEGAÇÃO ===
const [currentView, setCurrentView] = useState('workspace');
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

// === TEMA ===
const [theme, setTheme] = useState(() =>
  localStorage.getItem('kabania_theme') || 'dark'
);

// === DADOS ===
const [projects, setProjects] = useState([]);
const [selectedProjectId, setSelectedProjectId] = useState(null);

// === IMPORTAÇÃO EM LOTE ===
const [bulkImportStatus, setBulkImportStatus] = useState(null);
```

---

## Árvore de Renderização

```jsx
// Fluxo de renderização condicional:

if (isSessionLoading) return <LoadingSpinner />;

// Portal público (sem auth)
if (isPublicPortalRoute) return <ClientPortal />;

// Não autenticado
if (!isAuthenticated) return <Login />;

// Autenticado mas sem empresa
if (!currentCompany) return <CompanySetup />;

// App principal
return (
  <div className="app-container" data-theme={theme}>
    <Sidebar currentView={currentView} onNavigate={setCurrentView} ... />
    <div className="main-content">
      <TopBar theme={theme} onToggleTheme={toggleTheme} ... />
      <div className="view-container">
        {renderCurrentView()}  {/* switch/case por currentView */}
      </div>
    </div>
  </div>
);
```

---

## Mapa de Views (currentView)

| Valor | Componente Renderizado |
|-------|----------------------|
| `'workspace'` | `KanbanBoard` |
| `'shifts'` | `ShiftsModule` |
| `'inventory'` | `InventoryModule` |
| `'analytics'` | `AnalyticsDashboard` |
| `'reports'` | `ReportsDashboard` |
| `'sla'` | `SLADashboard` |
| `'academy'` | `Academy` |
| `'knowledge'` | `KnowledgeBase` |
| `'service-center'` | `ServiceCenter` |
| `'company'` | `CompanyPanel` |
| `'billing'` | `BillingView` |
| `'digital-twin'` | `DigitalTwin` |
| `'ai-insights'` | `AIInsights` |
| `'profile'` | `UserProfile` |
| `'settings'` | `UserSettings` |
| `'business'` | `BusinessManagement` |

---

## Props Passadas para Filhos

```jsx
// Props comuns que App.jsx injeta em todos os módulos:
{
  currentCompany,      // objeto da empresa
  currentUser,         // dados do usuário
  userRole,            // 'admin' | 'member' | 'viewer'
  theme,               // 'dark' | 'light'
  onLogout: handleLogout,
  // Props específicas por módulo (ex: projects, selectedProjectId)
}
```

---

## Funções Principais

```jsx
handleLogin(user, company)   // Pós-autenticação bem-sucedida
handleLogout()               // Limpa estado + localStorage + supabase.auth.signOut()
toggleTheme()                // Alterna dark/light
handleSetupComplete(company) // Pós-onboarding de empresa
loadProjects(companyId)      // Carrega projetos do Supabase
```

---

## Efeitos (`useEffect`)

| Efeito | Trigger | Ação |
|--------|---------|------|
| Verificação de sessão | `[]` (mount) | Chama `supabase.auth.getSession()` |
| Listener de auth | `[]` (mount) | `onAuthStateChange()` |
| Aplicação de tema | `[theme]` | `document.documentElement.setAttribute()` |
| Carregamento de projetos | `[currentCompany]` | Busca projetos no Supabase |

---

## Dependências

```
Componentes filhos: [[COMP - Sidebar]], [[COMP - TopBar]], [[COMP - Login]],
                    [[COMP - CompanySetup]], [[COMP - KanbanBoard]],
                    [[COMP - ShiftsModule]], [[COMP - Portal do Cliente]]
                    (+ todos os módulos)

Serviços: supabaseClient.js
Utils: supabaseSafe.js, logger.js
```

---

*Conectado a: [[COMP - Hub de Componentes]] | [[ARQ - Fluxo de Autenticação]] | [[DS - Sistema de Temas (Dark e Light)]]*
