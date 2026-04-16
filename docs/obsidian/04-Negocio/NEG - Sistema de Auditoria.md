---
tags: [negócio, auditoria, logs, histórico, compliance]
status: ativo
complexidade: baixa
ecossistema: negócio
---

# 📜 Sistema de Auditoria

← Voltar ao [[NEG - Hub de Negócio]]

**Service:** `src/services/historyService.js`
**Componente:** `BusinessManagement.jsx`
**Tabela:** `audit_logs`

---

## Propósito de Negócio

Registra todas as ações importantes do sistema para rastreabilidade, compliance e diagnóstico. Permite saber **quem fez o quê e quando** em cada entidade do sistema.

---

## O que é Auditado

| Ação | Entidade | Quando |
|------|---------|--------|
| `created` | tasks, shifts, inventory | Criação de novo registro |
| `updated` | tasks, shifts, inventory, profiles | Atualização de dados |
| `deleted` | tasks, shifts, inventory | Remoção |
| `published` | shifts | Publicação de escala |
| `login` | profiles | Acesso ao sistema |
| `logout` | profiles | Saída do sistema |
| `bulk_import` | tasks, inventory | Importação em lote |
| `status_changed` | support_tickets | Mudança de status |

---

## Schema do Log

```sql
audit_logs (
  id            UUID PRIMARY KEY,
  company_id    UUID,              -- empresa do evento
  user_email    TEXT,              -- quem executou
  action        TEXT,              -- tipo de ação
  entity_type   TEXT,              -- que entidade foi afetada
  entity_id     UUID,              -- qual registro específico
  details       JSONB,             -- { before: {}, after: {} }
  created_at    TIMESTAMPTZ
)
```

**Exemplo de registro:**
```json
{
  "id": "abc-123",
  "company_id": "empresa-xyz",
  "user_email": "maria@empresa.com",
  "action": "updated",
  "entity_type": "task",
  "entity_id": "task-456",
  "details": {
    "before": { "column_id": "todo", "priority": "medium" },
    "after":  { "column_id": "in_progress", "priority": "high" }
  },
  "created_at": "2026-04-16T14:30:00Z"
}
```

---

## Como Usar o historyService

```javascript
// src/services/historyService.js

// Registrar uma ação
await historyService.logAction(
  companyId,
  userEmail,
  'updated',        // action
  'task',           // entity_type
  taskId,           // entity_id
  {
    before: previousTaskData,
    after: updatedTaskData
  }
);

// Buscar histórico
const logs = await historyService.getHistory(companyId, {
  entity_type: 'task',     // filtro opcional
  user_email: 'x@y.com',  // filtro opcional
  from: '2026-04-01',      // filtro de data
  to: '2026-04-30',
  limit: 100
});
```

---

## Interface (BusinessManagement.jsx)

O componente `BusinessManagement.jsx` exibe o histórico de auditoria para admins:

```
┌──────────────────────────────────────────────┐
│  Histórico de Atividades                     │
├──────────────────────────────────────────────┤
│  Filtros: [Período] [Usuário] [Entidade]     │
├──────────────────────────────────────────────┤
│  16/04 14:30 maria@e.com → Atualizou tarefa  │
│  16/04 14:15 joao@e.com  → Criou turno       │
│  16/04 13:45 maria@e.com → Login             │
│  ...                                         │
├──────────────────────────────────────────────┤
│  [Exportar CSV]  [Exportar PDF]              │
└──────────────────────────────────────────────┘
```

---

## Exportação

```javascript
// Exportação via BusinessManagement.jsx
// CSV: formatado para planilhas
// PDF: relatório formatado com cabeçalho da empresa
```

---

## Retenção de Logs

> [!info] Política de Retenção
> Os logs de auditoria são retidos indefinidamente no banco. Para compliance em setores regulados (saúde, financeiro), garantir que os dados não sejam deletados por scripts de limpeza.

---

## Permissões

| Ação | Admin | Member |
|------|-------|--------|
| Ver logs da empresa | ✅ | ❌ |
| Filtrar e buscar logs | ✅ | ❌ |
| Exportar logs | ✅ | ❌ |
| Deletar logs | ❌ | ❌ |

---

*Conectado a: [[NEG - Hub de Negócio]] | [[ARQ - Banco de Dados e Schemas]] | [[ARQ - Segurança e RLS Multi-Tenant]]*
