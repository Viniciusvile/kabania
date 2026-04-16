---
tags: [arquitetura, hub, visão-macro, estrutura]
status: ativo
complexidade: alta
ecossistema: arquitetura
---

# 🏗️ Arquitetura — Hub

← Voltar ao [[00 - Hub Principal do Sistema]]

> [!info] Sobre este Ecossistema
> Documenta as decisões arquiteturais macro, padrões de projeto adotados, fluxo de dados e segurança do Kabania.

---

## Arquivos deste Ecossistema

| Arquivo | Descrição |
|---------|-----------|
| [[ARQ - Visão Macro do Sistema]] | Stack, BaaS, diagrama de camadas |
| [[ARQ - Fluxo de Autenticação]] | OAuth, Supabase Auth, sessões |
| [[ARQ - Banco de Dados e Schemas]] | Tabelas, relações, multi-tenancy |
| [[ARQ - Segurança e RLS Multi-Tenant]] | Row Level Security, isolamento de dados |
| [[ARQ - Camada de Serviços]] | Services layer, integrações externas |

---

## Decisões Arquiteturais Chave

| Decisão | Escolha | Alternativa Rejeitada |
|---------|---------|----------------------|
| Backend | Supabase (BaaS) | Express/Node.js próprio |
| State Management | useState + localStorage | Redux / Zustand / Context |
| Build Tool | Vite 7 | Create React App / Webpack |
| Estilização | CSS Variables custom | Tailwind / Styled Components |
| Auth | Supabase Auth + Google OAuth | JWT próprio |
| IA | Google Gemini API | OpenAI / Claude |
| Drag & Drop | @dnd-kit | react-beautiful-dnd |

---

## Padrões de Projeto Identificados

| Padrão | Onde é Usado |
|--------|-------------|
| **BFF (Backend for Frontend)** | Supabase atua como BFF — queries diretamente do frontend |
| **Repository Pattern** | `src/services/` — abstrai lógica de acesso ao Supabase |
| **Custom Hook** | `useShifts.js` — encapsula estado e lógica de escalas |
| **Optimistic UI** | ShiftsModule, KanbanBoard — atualiza UI antes da confirmação |
| **Observer** | `supabase.auth.onAuthStateChange()` — evento de sessão |
| **Facade** | `supabaseSafe.js` — wrapper com retry logic sobre o Supabase |
| **Multi-Tenant** | company_id em todas as tabelas + RLS |
| **PWA** | Service Worker para cache offline + `manifest.json` |

---

*Conectado a: [[00 - Hub Principal do Sistema]] | [[NEG - Hub de Negócio]]*
