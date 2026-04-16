---
tags: [arquitetura, banco-de-dados, supabase, postgresql, schema]
status: ativo
complexidade: alta
ecossistema: arquitetura
---

# 🗄️ Banco de Dados e Schemas

← Voltar ao [[ARQ - Hub de Arquitetura]]

> [!info] Fonte da Verdade
> Os schemas ficam em `database/` (50+ arquivos SQL). O banco é PostgreSQL gerenciado pelo Supabase.

---

## Diagrama de Entidades Macro

```
companies (1)
   │
   ├──── profiles (N)           ← usuários da empresa
   ├──── projects (N)           ← projetos
   │        └── tasks (N)       ← tarefas do kanban
   ├──── activities (N)         ← atividades de campo
   ├──── customers (N)          ← clientes
   ├──── shifts (N)             ← turnos
   │        ├── employee_profiles (N)
   │        ├── work_environments (N)
   │        │       └── work_activities (N)
   │        └── shift_assignments (N)
   ├──── inventory (N)          ← estoque
   │        └── inventory_transactions (N)
   ├──── support_tickets (N)    ← chamados
   ├──── knowledge_base (N)     ← artigos
   ├──── audit_logs (N)         ← auditoria
   ├──── collaborators (N)      ← colaboradores
   ├──── notifications (N)      ← notificações
   └──── calendar_integrations (1) ← config de calendário
```

---

## Tabelas Detalhadas

### `companies` — Raiz Multi-Tenant
```sql
id          UUID PRIMARY KEY
name        TEXT NOT NULL
sector      TEXT              -- hospitalar, restaurante, varejo...
code        TEXT UNIQUE       -- código de convite
created_at  TIMESTAMPTZ
```

### `profiles` — Usuários
```sql
user_id      UUID REFERENCES auth.users
company_id   UUID REFERENCES companies
email        TEXT
role         TEXT              -- admin, member, viewer
first_name   TEXT
last_name    TEXT
avatar_url   TEXT
created_at   TIMESTAMPTZ
```

### `projects` — Projetos
```sql
id           UUID PRIMARY KEY
company_id   UUID REFERENCES companies
name         TEXT
description  TEXT
created_at   TIMESTAMPTZ
```

### `tasks` — Tarefas Kanban
```sql
id           UUID PRIMARY KEY
company_id   UUID REFERENCES companies
project_id   UUID REFERENCES projects
title        TEXT
description  TEXT
column_id    TEXT              -- backlog, todo, in_progress, ai_review, done
status       TEXT
priority     TEXT              -- low, medium, high, critical
deadline     DATE
assigned_to  UUID REFERENCES profiles
tags         TEXT[]
comments     JSONB
created_at   TIMESTAMPTZ
updated_at   TIMESTAMPTZ
```

### `activities` — Atividades de Campo
```sql
id            UUID PRIMARY KEY
company_id    UUID REFERENCES companies
title         TEXT
type          TEXT              -- visita, manutenção, entrega...
status        TEXT              -- pendente, em_andamento, concluída
location      TEXT
assigned_to   UUID REFERENCES profiles
deadline      TIMESTAMPTZ
description   TEXT
created_at    TIMESTAMPTZ
```

### `shifts` — Turnos/Escalas
```sql
id             UUID PRIMARY KEY
company_id     UUID REFERENCES companies
employee_id    UUID REFERENCES employee_profiles
start_time     TIMESTAMPTZ
end_time       TIMESTAMPTZ
status         TEXT              -- draft, published, confirmed, cancelled
notes          TEXT
environment_id UUID REFERENCES work_environments
created_at     TIMESTAMPTZ
```

### `employee_profiles` — Funcionários
```sql
id               UUID PRIMARY KEY
company_id       UUID REFERENCES companies
profile_id       UUID REFERENCES profiles
role             TEXT              -- cargo/função
max_daily_hours  INT
max_weekly_hours INT
skills           TEXT[]
availability     JSONB             -- disponibilidade por dia
created_at       TIMESTAMPTZ
```

### `work_environments` — Ambientes de Trabalho
```sql
id           UUID PRIMARY KEY
company_id   UUID REFERENCES companies
name         TEXT
min_coverage INT               -- mínimo de pessoas necessárias
floor_plan   TEXT              -- referência ao Digital Twin
created_at   TIMESTAMPTZ
```

### `inventory` — Estoque
```sql
id           UUID PRIMARY KEY
company_id   UUID REFERENCES companies
name         TEXT
sku          TEXT UNIQUE
quantity     DECIMAL
unit         TEXT
min_quantity DECIMAL           -- alerta de estoque baixo
location     TEXT
created_at   TIMESTAMPTZ
```

### `audit_logs` — Auditoria
```sql
id           UUID PRIMARY KEY
company_id   UUID REFERENCES companies
user_email   TEXT
action       TEXT              -- created, updated, deleted...
entity_type  TEXT              -- task, shift, inventory...
entity_id    UUID
details      JSONB             -- dados antes/depois
created_at   TIMESTAMPTZ
```

### `knowledge_base` — Base de Conhecimento
```sql
id           UUID PRIMARY KEY
company_id   UUID REFERENCES companies
title        TEXT
description  TEXT
content      TEXT
tags         TEXT[]
section      TEXT
enabled      BOOLEAN
created_at   TIMESTAMPTZ
```

### `support_tickets` — Chamados
```sql
id           UUID PRIMARY KEY
company_id   UUID REFERENCES companies
title        TEXT
description  TEXT
status       TEXT              -- aberto, em_andamento, resolvido
priority     TEXT
created_by   UUID REFERENCES profiles
assigned_to  UUID REFERENCES profiles
created_at   TIMESTAMPTZ
```

---

## Arquivos de Migração

```
database/
├── 00_master_optimization_and_security.sql   ← índices e security
├── shifts_setup.sql                           ← módulo de escalas
├── academy_setup.sql                          ← módulo academy
├── inventory_setup.sql                        ← módulo estoque
├── contracts_setup.sql                        ← contratos
├── customers_setup.sql                        ← clientes
├── support_setup.sql                          ← chamados
└── [40+ outros arquivos de migração]
```

> [!warning] Ordem de Execução
> Os scripts dependem da tabela `companies` e `profiles` existirem. O arquivo `00_master_optimization_and_security.sql` deve sempre ser executado primeiro.

---

*Conectado a: [[ARQ - Hub de Arquitetura]] | [[ARQ - Segurança e RLS Multi-Tenant]] | [[ARQ - Camada de Serviços]]*
