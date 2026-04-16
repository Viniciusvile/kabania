---
tags: [hub, sistema, kabania, visão-geral]
status: ativo
complexidade: alta
ecossistema: hub
---

# 🧠 Hub Principal — Kabania

> [!info] O que é este arquivo?
> Este é o **mapa de entrada** do Second Brain do sistema Kabania. Use-o como ponto de partida para navegar por qualquer área do projeto. Cada ecossistema está interligado via wikilinks.

---

## 🏗️ Identidade do Sistema

| Campo | Valor |
|---|---|
| **Nome** | Kabania |
| **Tipo** | SaaS B2B Multi-Tenant |
| **Stack Principal** | React 19 + Supabase + Vite |
| **Idioma Primário** | Português (pt-BR) |
| **Modelo de Deploy** | PWA (Progressive Web App) |
| **Autenticação** | Google OAuth 2.0 + Supabase Auth |
| **IA Integrada** | Google Gemini API |

---

## 🗺️ Os 4 Ecossistemas

```
                    ┌──────────────────────┐
                    │  00 - Hub Principal  │
                    └──────────┬───────────┘
           ┌──────────┬────────┴──────────┬──────────┐
           ▼          ▼                   ▼          ▼
    ┌──────────┐ ┌──────────┐     ┌──────────┐ ┌──────────┐
    │  Design  │ │  Arq. &  │     │  Compo-  │ │ Negócio  │
    │  System  │ │ Estrutura│     │  nentes  │ │ Backend  │
    └──────────┘ └──────────┘     └──────────┘ └──────────┘
```

### [[Design System - Hub]] — Ecossistema Visual
> Tokens de cor, tipografia, espaçamento e decisões visuais do design system

- [[DS - Paleta de Cores]]
- [[DS - Tipografia e Espaçamento]]
- [[DS - Sistema de Temas (Dark e Light)]]

---

### [[ARQ - Hub de Arquitetura]] — Ecossistema de Arquitetura
> Visão macro, padrões de projeto, fluxos e dependências do sistema

- [[ARQ - Visão Macro do Sistema]]
- [[ARQ - Fluxo de Autenticação]]
- [[ARQ - Banco de Dados e Schemas]]
- [[ARQ - Segurança e RLS Multi-Tenant]]
- [[ARQ - Camada de Serviços]]

---

### [[COMP - Hub de Componentes]] — Ecossistema Frontend
> Documentação de cada componente React principal

- [[COMP - App.jsx]]
- [[COMP - Sidebar]]
- [[COMP - KanbanBoard]]
- [[COMP - ShiftsModule]]
- [[COMP - Login]]
- [[COMP - CompanySetup]]
- [[COMP - Portal do Cliente]]

---

### [[NEG - Hub de Negócio]] — Ecossistema de Regras de Negócio
> Módulos funcionais, integrações e regras de negócio

- [[NEG - Módulo Kanban e Tarefas]]
- [[NEG - Módulo de Escalas (Shifts)]]
- [[NEG - Módulo de Inventário]]
- [[NEG - Integrações com IA (Gemini)]]
- [[NEG - Portal Público do Cliente]]
- [[NEG - Sistema de Auditoria]]

---

## 🔄 Fluxo Principal do Usuário

```
[Acesso à URL]
     │
     ▼
[Login.jsx] ──→ Google OAuth / Email+Password
     │
     ▼
[Verificação de company_id]
     │
     ├── NÃO tem company → [CompanySetup.jsx]
     │
     └── TEM company → [App.jsx - Estado Principal]
              │
              ├── [Sidebar.jsx] - Navegação
              ├── [TopBar.jsx] - Header
              └── [View Atual]
                   ├── KanbanBoard (workspace)
                   ├── ShiftsModule (escalas)
                   ├── InventoryModule (estoque)
                   ├── AnalyticsDashboard (relatórios)
                   ├── Academy (treinamento)
                   ├── KnowledgeBase (conhecimento)
                   └── ...mais módulos
```

---

## 📦 Módulos Funcionais do Sistema

| Módulo | Componente Principal | Status |
|--------|---------------------|--------|
| Workspace / Kanban | `KanbanBoard.jsx` | ativo |
| Gestão de Escalas | `ShiftsModule.jsx` | ativo |
| Inventário / Estoque | `InventoryModule.jsx` | ativo |
| Analytics & Relatórios | `AnalyticsDashboard.jsx` | ativo |
| Portal do Cliente | `ClientPortal.jsx` | ativo |
| Academy / Treinamento | `Academy.jsx` | ativo |
| Base de Conhecimento | `KnowledgeBase.jsx` | ativo |
| Central de Atendimento | `ServiceCenter.jsx` | ativo |
| Gestão de Empresa | `CompanyPanel.jsx` | ativo |
| Digital Twin | `DigitalTwin/` | ativo |
| Insights IA | `AIInsights.jsx` | ativo |
| Faturamento | `BillingView.jsx` | ativo |

---

## 🤝 Dependências Externas

| Serviço | Uso |
|---------|-----|
| **Supabase** | Banco de dados + Auth + Realtime |
| **Google Gemini** | IA para análise, scheduling e insights |
| **Google OAuth** | Autenticação social |
| **Google Calendar** | Sincronização de escalas |
| **Outlook Calendar** | Sincronização alternativa |

---

> [!warning] Multi-Tenancy
> Todos os dados são isolados por `company_id`. A função `check_company_access()` no banco de dados é o guardião de toda a segregação. **Nunca faça queries sem o filtro de company.** Ver [[ARQ - Segurança e RLS Multi-Tenant]].

---

*Última atualização automática baseada no código-fonte. Ver [[ARQ - Visão Macro do Sistema]] para detalhes técnicos.*
