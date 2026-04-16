---
tags: [componentes, frontend, react, hub]
status: ativo
complexidade: alta
ecossistema: componentes
---

# ⚛️ Componentes — Hub

← Voltar ao [[00 - Hub Principal do Sistema]]

> [!info] Sobre este Ecossistema
> Documenta cada componente React principal do Kabania — sua responsabilidade, props, estado interno e dependências.

---

## Estrutura de Componentes

```
src/components/
├── CORE (Estruturais)
│   ├── App.jsx              ← [[COMP - App.jsx]]
│   ├── Sidebar.jsx          ← [[COMP - Sidebar]]
│   └── TopBar.jsx           ← [[COMP - TopBar]]
│
├── AUTH
│   ├── Login.jsx            ← [[COMP - Login]]
│   ├── CompanySetup.jsx     ← [[COMP - CompanySetup]]
│   └── AuthCallbackHandler.jsx
│
├── WORKSPACE
│   ├── KanbanBoard.jsx      ← [[COMP - KanbanBoard]]
│   ├── CardDetailModal.jsx
│   └── NewActivityModal.jsx
│
├── SHIFTS (13 componentes)  ← [[COMP - ShiftsModule]]
│   ├── ShiftsModule.jsx
│   ├── ShiftGrid.jsx
│   ├── ShiftPlanner.jsx
│   ├── AutoPilotReview.jsx
│   ├── EmployeesManager.jsx
│   └── [8 outros]
│
├── INVENTORY (3 componentes)
│   ├── InventoryModule.jsx
│   ├── InventoryList.jsx
│   └── InventoryTransactions.jsx
│
├── ANALYTICS
│   ├── AnalyticsDashboard.jsx
│   ├── ReportsDashboard.jsx
│   └── SLADashboard.jsx
│
├── PORTAL
│   └── ClientPortal.jsx     ← [[COMP - Portal do Cliente]]
│
└── MISC
    ├── Academy.jsx
    ├── KnowledgeBase.jsx
    ├── ServiceCenter.jsx
    ├── BillingView.jsx
    ├── AIInsights.jsx
    └── AIChatFab.jsx
```

---

## Índice de Componentes Documentados

| Componente | Módulo | Complexidade |
|-----------|--------|-------------|
| [[COMP - App.jsx]] | Core | Alta |
| [[COMP - Sidebar]] | Core | Média |
| [[COMP - TopBar]] | Core | Baixa |
| [[COMP - Login]] | Auth | Média |
| [[COMP - CompanySetup]] | Auth | Alta |
| [[COMP - KanbanBoard]] | Workspace | Alta |
| [[COMP - ShiftsModule]] | Escalas | Alta |
| [[COMP - Portal do Cliente]] | Portal | Média |

---

## Padrão de Props

A maioria dos componentes recebe props do `App.jsx` (estado centralizado):

```jsx
// Props comuns entre módulos
currentCompany    // objeto da empresa atual
currentUser       // usuário logado
userRole          // 'admin' | 'member' | 'viewer'
theme             // 'dark' | 'light'
onLogout          // função de logout
```

---

> [!info] Prop Drilling
> O Kabania não usa React Context. Estado global é mantido em `App.jsx` e passado via props. Para módulos complexos como ShiftsModule, o hook `useShifts()` encapsula o estado local do módulo.

---

*Conectado a: [[00 - Hub Principal do Sistema]] | [[ARQ - Visão Macro do Sistema]]*
