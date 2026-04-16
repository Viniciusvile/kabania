---
tags: [componente, navegação, sidebar, layout]
status: ativo
complexidade: média
ecossistema: componentes
---

# 📐 Sidebar — Navegação Principal

← Voltar ao [[COMP - Hub de Componentes]]

**Arquivo:** `src/components/Sidebar.jsx`
**CSS:** `src/components/Dashboard.css`

---

## Responsabilidade

A Sidebar é o sistema de navegação principal do Kabania. Exibe os módulos disponíveis, identidade da empresa e controles de usuário.

---

## Props Recebidas

```jsx
// Props de App.jsx
currentView        // string — view ativa para highlight
onNavigate         // fn(view) — muda a view atual
isCollapsed        // boolean — sidebar colapsada (modo compact)
onToggleCollapse   // fn() — alterna estado collapsed
isMobileOpen       // boolean — visível em mobile
onCloseMobile      // fn() — fecha no mobile
currentCompany     // objeto da empresa (nome, setor)
currentUser        // dados do usuário
userRole           // 'admin' | 'member' | 'viewer'
onLogout           // fn() — logout
```

---

## Estados Internos

```jsx
// Não possui estados internos complexos
// Estado é controlado pelo pai (App.jsx)
```

---

## Estrutura Visual

```
┌─────────────────────────┐
│  [Logo Kabania]         │
│  [Nome da Empresa]      │
├─────────────────────────┤
│  Navegação Principal:   │
│  ○ Workspace (Kanban)   │
│  ○ Escalas             │
│  ○ Inventário          │
│  ○ Analytics           │
│  ○ Relatórios          │
│  ○ SLA                 │
├─────────────────────────┤
│  Conhecimento:          │
│  ○ Academy             │
│  ○ Base de Conhecimento │
│  ○ Central de Suporte  │
├─────────────────────────┤
│  Gestão:               │
│  ○ Empresa             │
│  ○ Digital Twin        │
│  ○ IA Insights         │
├─────────────────────────┤
│  Conta:                │
│  ○ Perfil              │
│  ○ Configurações       │
│  ○ Faturamento         │
│  ○ Sair                │
└─────────────────────────┘
```

---

## Comportamento Collapsed

```css
/* Modo expandido */
.sidebar { width: 240px; }
.nav-label { display: block; }

/* Modo colapsado */
.sidebar.collapsed { width: 60px; }
.nav-label { display: none; }
/* Apenas ícones ficam visíveis */
```

---

## Comportamento Mobile

```jsx
// Em telas < 768px:
// - Sidebar fica oculta por padrão (position: fixed, left: -240px)
// - isMobileOpen = true → sidebar desliza (translateX(0))
// - Overlay escuro fecha ao clicar fora
```

---

## Grupos de Navegação

| Grupo | Items | Roles com Acesso |
|-------|-------|-----------------|
| Principal | Workspace, Escalas, Inventário | Todos |
| Analytics | Analytics, Relatórios, SLA | admin, member |
| Conhecimento | Academy, Knowledge, Service Center | Todos |
| Gestão | Empresa, Digital Twin, IA | admin |
| Conta | Perfil, Settings, Billing, Logout | Todos |

---

## Ícones (Lucide React)

```jsx
import {
  LayoutDashboard,  // Workspace
  Calendar,         // Escalas
  Package,          // Inventário
  BarChart2,        // Analytics
  FileText,         // Relatórios
  Target,           // SLA
  BookOpen,         // Academy
  Database,         // Knowledge Base
  Headphones,       // Service Center
  Building2,        // Empresa
  Box,              // Digital Twin
  Brain,            // IA Insights
  User,             // Perfil
  Settings,         // Configurações
  CreditCard,       // Faturamento
  LogOut            // Sair
} from 'lucide-react';
```

---

## Dependências

```
Pai: [[COMP - App.jsx]]
CSS: Dashboard.css (variáveis de [[DS - Paleta de Cores]])
```

---

*Conectado a: [[COMP - Hub de Componentes]] | [[COMP - App.jsx]] | [[DS - Paleta de Cores]]*
