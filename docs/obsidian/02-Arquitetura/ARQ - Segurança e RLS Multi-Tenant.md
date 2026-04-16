---
tags: [arquitetura, segurança, rls, multi-tenant, supabase]
status: ativo
complexidade: alta
ecossistema: arquitetura
---

# 🔒 Segurança e RLS Multi-Tenant

← Voltar ao [[ARQ - Hub de Arquitetura]]

> [!warning] Crítico
> Este é o mecanismo mais importante de segurança do Kabania. **Toda query ao banco deve respeitar o isolamento por `company_id`.** A função `check_company_access()` é o guardião central.

---

## O Problema: Multi-Tenancy

O Kabania hospeda múltiplas empresas no mesmo banco de dados. Sem proteção adequada, um usuário da Empresa A poderia acessar dados da Empresa B.

**Solução:** Row Level Security (RLS) do PostgreSQL + função de segurança.

---

## A Função Central: `check_company_access()`

```sql
-- database/00_master_optimization_and_security.sql

CREATE OR REPLACE FUNCTION check_company_access(target_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- executa com permissões do dono, não do chamador
AS $$
BEGIN
  -- Verifica se o usuário autenticado pertence à empresa alvo
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND company_id = target_company_id
  );
END;
$$;
```

> [!info] SECURITY DEFINER
> A cláusula `SECURITY DEFINER` evita recursão infinita. Sem ela, verificar `profiles` acionaria a própria policy de `profiles`, criando loop infinito.

---

## Aplicação das Policies RLS

Exemplo de como a RLS é aplicada em cada tabela:

```sql
-- Habilitando RLS na tabela tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy de SELECT
CREATE POLICY "users_select_own_company_tasks"
ON tasks FOR SELECT
USING (check_company_access(company_id));

-- Policy de INSERT
CREATE POLICY "users_insert_own_company_tasks"
ON tasks FOR INSERT
WITH CHECK (check_company_access(company_id));

-- Policy de UPDATE
CREATE POLICY "users_update_own_company_tasks"
ON tasks FOR UPDATE
USING (check_company_access(company_id));

-- Policy de DELETE
CREATE POLICY "users_delete_own_company_tasks"
ON tasks FOR DELETE
USING (check_company_access(company_id));
```

---

## Tabelas com RLS Habilitado

| Tabela | RLS | Política Principal |
|--------|-----|-------------------|
| `tasks` | ✅ | `check_company_access(company_id)` |
| `activities` | ✅ | `check_company_access(company_id)` |
| `shifts` | ✅ | `check_company_access(company_id)` |
| `inventory` | ✅ | `check_company_access(company_id)` |
| `knowledge_base` | ✅ | `check_company_access(company_id)` |
| `audit_logs` | ✅ | `check_company_access(company_id)` |
| `profiles` | ✅ | `user_id = auth.uid()` (regra própria) |
| `companies` | ✅ | `check_company_access(id)` |

---

## Camadas de Segurança

```
Camada 1: HTTPS
  └── Toda comunicação é criptografada

Camada 2: JWT Authentication
  └── Supabase valida o token em toda requisição

Camada 3: Row Level Security
  └── PostgreSQL filtra linhas baseado na empresa do usuário

Camada 4: PKCE OAuth Flow
  └── Autenticação Google sem client_secret exposto

Camada 5: Frontend Guards
  └── App.jsx verifica isAuthenticated antes de renderizar
```

---

## Roles de Usuário

| Role | Acesso |
|------|--------|
| `admin` | CRUD completo na empresa |
| `member` | Leitura + operações do próprio módulo |
| `viewer` | Somente leitura |

> [!info] Granularidade de Roles
> A lógica de roles é implementada no frontend (via prop `userRole`). O RLS no banco garante isolamento entre empresas, mas não entre roles dentro da mesma empresa. Permissões finas são responsabilidade dos componentes.

---

## `supabaseSafe.js` — Retry Logic

```javascript
// src/utils/supabaseSafe.js
// Wrapper que lida com erros de lock do Supabase

async function supabaseSafe(queryFn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await queryFn();
    
    if (!result.error) return result;
    
    // Se for erro de lock, aguarda e tenta novamente
    if (result.error.code === '55P03') {
      await sleep(100 * (attempt + 1));
      continue;
    }
    
    throw result.error;
  }
}
```

---

## Variáveis de Ambiente Sensíveis

```
.env (NÃO commitar)
├── VITE_SUPABASE_URL        ← URL do projeto Supabase
├── VITE_SUPABASE_ANON_KEY   ← Chave pública (segura para expor)
├── VITE_GEMINI_API_KEY      ← Chave da Gemini API (⚠️ proteger)
└── VITE_GOOGLE_CLIENT_ID    ← Client ID do OAuth (seguro)
```

> [!warning] ANON_KEY
> A `VITE_SUPABASE_ANON_KEY` é pública por design — é a chave de "cliente anônimo" do Supabase. A segurança real vem do RLS, não do segredo desta chave.

---

*Conectado a: [[ARQ - Hub de Arquitetura]] | [[ARQ - Banco de Dados e Schemas]] | [[ARQ - Fluxo de Autenticação]]*
