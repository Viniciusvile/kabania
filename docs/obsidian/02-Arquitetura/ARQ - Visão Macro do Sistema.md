---
tags: [arquitetura, visão-macro, stack, camadas]
status: ativo
complexidade: alta
ecossistema: arquitetura
---

# 🌐 Visão Macro do Sistema

← Voltar ao [[ARQ - Hub de Arquitetura]]

---

## Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                      USUÁRIO (Browser / PWA)                │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    FRONTEND — React 19 + Vite               │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Routing  │  │  Components  │  │      Services      │   │
│  │ (React   │  │ (50+ .jsx)   │  │  (src/services/)   │   │
│  │  Router) │  │              │  │                    │   │
│  └──────────┘  └──────────────┘  └────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Estado da Aplicação                      │  │
│  │  useState (local) + localStorage (persistência)       │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │ REST API / Realtime WS
┌────────────────────────────▼────────────────────────────────┐
│                    SUPABASE (BaaS)                           │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐    │
│  │ Auth Service │  │  REST API    │  │   Realtime    │    │
│  │ (JWT + OAuth)│  │  (PostgREST) │  │  (WebSocket)  │    │
│  └──────────────┘  └──────┬───────┘  └───────────────┘    │
│                            │                                │
│  ┌─────────────────────────▼──────────────────────────┐    │
│  │              PostgreSQL Database                    │    │
│  │         (Row Level Security habilitado)             │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│               SERVIÇOS EXTERNOS                              │
│                                                             │
│  Google Gemini API    Google OAuth    Google/Outlook Cal.   │
└─────────────────────────────────────────────────────────────┘
```

---

## Stack Técnica Detalhada

### Frontend
| Tecnologia | Versão | Função |
|-----------|--------|--------|
| **React** | 19.2.0 | UI Library |
| **React Router** | 7.14.0 | Client-side routing |
| **Vite** | 7.3.1 | Build tool + HMR |
| **@dnd-kit** | 6.x/10.x | Drag and drop |
| **Lucide React** | 0.577.0 | Ícones |
| **Recharts** | 3.8.0 | Gráficos e analytics |

### Backend (BaaS)
| Tecnologia | Versão | Função |
|-----------|--------|--------|
| **Supabase** | 2.99.1 | Banco + Auth + Realtime |
| **PostgreSQL** | (via Supabase) | Banco relacional |
| **PostgREST** | (via Supabase) | API REST automática |

### IA e Integrações
| Tecnologia | Versão | Função |
|-----------|--------|--------|
| **@google/generative-ai** | 0.24.1 | Gemini API |
| **@react-oauth/google** | 0.13.4 | Google Login |
| **mammoth** | 1.12.0 | Parse DOCX |
| **pdfjs-dist** | 5.5.207 | Leitura de PDF |
| **papaparse** | 5.5.3 | Importação CSV |

---

## Modelo de Deploy

```
Desenvolvimento:  npm run dev   → Vite Dev Server (localhost:5173)
Produção:         npm run build → dist/ (arquivos estáticos)
Preview local:    npm run preview

Hospedagem esperada: Vercel / Netlify / qualquer CDN estático
```

> [!info] PWA
> O Kabania é uma Progressive Web App. O `public/serviceWorker.js` habilita funcionamento offline básico e instalação como app nativo no dispositivo do usuário.

---

## Arquitetura Multi-Tenant

```
Empresa A ─── company_id: "abc-123" ───┐
                                        ├── PostgreSQL (tabelas compartilhadas)
Empresa B ─── company_id: "xyz-789" ───┘   com RLS isolando os dados
```

Cada tabela possui coluna `company_id`. A função `check_company_access()` no banco valida que o usuário autenticado pertence à empresa antes de qualquer operação.

Ver [[ARQ - Segurança e RLS Multi-Tenant]] para detalhes.

---

## Fluxo de Dados (Request Lifecycle)

```
1. Usuário interage com componente React
2. Componente chama função no services/ (ex: shiftService.createShift())
3. Service executa query via supabaseClient.js
4. supabaseSafe.js aplica retry logic se necessário
5. Supabase valida JWT + RLS do usuário
6. PostgreSQL retorna dados filtrados por company_id
7. Service retorna dado ao componente
8. useState atualiza UI
9. (Opcional) localStorage persiste para uso offline
```

---

*Conectado a: [[ARQ - Hub de Arquitetura]] | [[ARQ - Banco de Dados e Schemas]] | [[ARQ - Segurança e RLS Multi-Tenant]]*
