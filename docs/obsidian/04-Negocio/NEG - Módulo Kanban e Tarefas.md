---
tags: [negócio, kanban, tarefas, workflow, projetos]
status: ativo
complexidade: alta
ecossistema: negócio
---

# 📋 Módulo Kanban e Tarefas

← Voltar ao [[NEG - Hub de Negócio]]

**Componente:** [[COMP - KanbanBoard]]
**Tabelas:** `tasks`, `projects`

---

## Propósito de Negócio

O Kanban é o **hub operacional** do dia a dia. Permite que equipes gerenciem trabalho, rastreiem progresso e integrem análise de IA para priorização inteligente.

---

## Regras de Negócio

### Projetos
- Uma empresa pode ter múltiplos projetos
- Tarefas sempre pertencem a um projeto
- O projeto padrão é criado automaticamente no onboarding
- Administradores podem criar/editar/arquivar projetos

### Ciclo de Vida da Tarefa

```
[Criação] → backlog → todo → in_progress → ai_review → done
                                                └→ [Retorno para in_progress se reprovada]
```

| Coluna | Significado |
|--------|------------|
| `backlog` | Ideias e pendências sem prioridade definida |
| `todo` | Priorizado, pronto para trabalhar |
| `in_progress` | Em execução ativa |
| `ai_review` | Aguardando análise/revisão com IA |
| `done` | Concluído e validado |

### Prioridades

| Nível | Cor | Critério |
|-------|-----|---------|
| `low` | Cinza | Backlog, sem urgência |
| `medium` | Azul | Prazo normal |
| `high` | Laranja | Prazo próximo ou impacto alto |
| `critical` | Vermelho | Blocante, precisa de ação imediata |

---

## Fluxo da Coluna "Revisão IA"

> [!info] Diferencial do Produto
> A coluna `ai_review` é um diferencial único do Kabania. Ao arrastar uma tarefa para ela, o Gemini analisa automaticamente.

```
Tarefa movida para ai_review
         │
         ▼
geminiService.analyzeTask(task)
         │
         ▼
Retorna análise:
  - complexidade estimada (baixa/média/alta)
  - score de clareza da descrição (0-100)
  - sub-tarefas sugeridas
  - estimativa de horas
  - riscos identificados
         │
         ▼
CardDetailModal exibe análise
Admin decide: ✅ Aprovar → done | ❌ Reprovar → in_progress
```

---

## Regras de Permissão

| Ação | Admin | Member | Viewer |
|------|-------|--------|--------|
| Criar tarefa | ✅ | ✅ | ❌ |
| Editar tarefa própria | ✅ | ✅ | ❌ |
| Editar tarefa de outros | ✅ | ❌ | ❌ |
| Mover entre colunas | ✅ | ✅ | ❌ |
| Deletar tarefa | ✅ | ❌ | ❌ |
| Criar projeto | ✅ | ❌ | ❌ |

---

## Comentários em Tarefas

```typescript
// Estrutura do campo comments (JSONB no PostgreSQL)
interface Comment {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
  edited: boolean;
}
```

---

## Importação em Lote

O sistema suporta importação de tarefas via:
- **CSV** (papaparse) — campos: título, descrição, prioridade, prazo, responsável
- **DOCX** (mammoth) — extração de texto com Gemini para estruturar
- **PDF** (pdfjs-dist) — extração de texto com Gemini

O progresso é exibido via `bulkImportStatus` no App.jsx (overlay de progresso).

---

## Notificações de Prazo

```javascript
// notificationService.js verifica prazos diariamente
// Alerta criado para tarefas com:
// - deadline = hoje → "Tarefa vence hoje"
// - deadline = amanhã → "Tarefa vence amanhã"
// - deadline < hoje → "Tarefa atrasada"
```

---

## Métricas (Analytics)

| Métrica | Cálculo |
|---------|---------|
| Taxa de conclusão | `count(done) / count(*) * 100` |
| Tempo médio por coluna | `AVG(tempo_na_coluna)` via audit_logs |
| Tarefas atrasadas | `COUNT WHERE deadline < NOW() AND column_id != 'done'` |
| Produtividade por membro | `COUNT(done) WHERE assigned_to = user_id` |

---

*Conectado a: [[NEG - Hub de Negócio]] | [[COMP - KanbanBoard]] | [[NEG - Integrações com IA (Gemini)]] | [[NEG - Sistema de Auditoria]]*
