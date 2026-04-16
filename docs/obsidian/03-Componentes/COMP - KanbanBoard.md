---
tags: [componente, kanban, tarefas, drag-drop, workspace]
status: ativo
complexidade: alta
ecossistema: componentes
---

# 📋 KanbanBoard — Gestão de Tarefas

← Voltar ao [[COMP - Hub de Componentes]]

**Arquivo:** `src/components/KanbanBoard.jsx`
**CSS:** `src/components/Kanban.css`

---

## Responsabilidade

O KanbanBoard é o módulo central de gestão de tarefas. Implementa um quadro Kanban com 5 colunas, drag-and-drop entre colunas e integração com IA para revisão de tarefas.

---

## Props Recebidas

```jsx
currentCompany        // objeto da empresa
currentUser           // usuário logado
userRole              // 'admin' | 'member' | 'viewer'
selectedProjectId     // UUID do projeto ativo
projects              // array de projetos disponíveis
onProjectChange       // fn(projectId) — troca de projeto
theme                 // 'dark' | 'light'
```

---

## Estados Internos

```jsx
const [tasks, setTasks] = useState([]);           // todas as tarefas
const [columns, setColumns] = useState({...});    // estrutura das colunas
const [isLoading, setIsLoading] = useState(true); // loading inicial
const [searchQuery, setSearchQuery] = useState('');
const [filterPriority, setFilterPriority] = useState(null);
const [filterAssignee, setFilterAssignee] = useState(null);
const [selectedTask, setSelectedTask] = useState(null); // modal detalhe
const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
const [activeId, setActiveId] = useState(null);   // drag-and-drop
```

---

## As 5 Colunas do Kanban

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Backlog  │ │  A Fazer │ │  Em      │ │ Revisão  │ │  Feito   │
│          │ │  (Todo)  │ │ Andamento│ │  com IA  │ │  (Done)  │
│ backlog  │ │  todo    │ │in_progress│ │ai_review │ │  done    │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

| column_id | Label | Cor |
|-----------|-------|-----|
| `backlog` | Backlog | Cinza |
| `todo` | A Fazer | Azul |
| `in_progress` | Em Andamento | Amarelo |
| `ai_review` | Revisão IA | Roxo |
| `done` | Concluído | Verde |

---

## Drag-and-Drop (@dnd-kit)

```jsx
// Implementação com DndContext + SortableContext
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useDroppable,
  useDraggable
} from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';

// Ao soltar uma tarefa em outra coluna:
const handleDragEnd = async (event) => {
  const { active, over } = event;
  // Atualiza column_id da tarefa no Supabase
  await supabase.from('tasks').update({
    column_id: over.id
  }).eq('id', active.id);
};
```

---

## Integração com IA (Coluna "Revisão IA")

> [!info] Coluna AI Review
> Tarefas na coluna `ai_review` acionam uma análise automática pelo **Gemini**. A IA avalia: clareza da descrição, viabilidade, estimativa de complexidade e sugere sub-tarefas.

```javascript
// Acionado quando task.column_id = 'ai_review'
const analysis = await geminiService.analyzeTask(task.description);
// Retorna: { complexity, suggestions, subTasks, estimatedHours }
```

---

## Fluxo de Criação de Tarefa

```
1. Usuário clica em "+ Nova Tarefa" ou "+" na coluna
2. NewActivityModal abre
3. Usuário preenche: título, descrição, prazo, prioridade, responsável
4. Submit → supabase.from('tasks').insert({...})
5. task aparece na coluna correta
6. historyService.logAction() registra a criação
```

---

## Filtros e Busca

```jsx
// Filtros disponíveis (DashboardHeader):
searchQuery       // busca por título/descrição
filterPriority    // low | medium | high | critical
filterAssignee    // UUID do responsável
filterDeadline    // hoje | esta semana | atrasado
```

---

## Modais Filhos

| Modal | Quando Abre |
|-------|------------|
| `NewActivityModal` | Criar nova tarefa |
| `CardDetailModal` | Ver/editar tarefa existente |

---

## Schema da Tarefa

```typescript
interface Task {
  id: string;
  company_id: string;
  project_id: string;
  title: string;
  description: string;
  column_id: 'backlog' | 'todo' | 'in_progress' | 'ai_review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline: string | null;
  assigned_to: string | null;
  tags: string[];
  comments: Comment[];
  created_at: string;
  updated_at: string;
}
```

---

## Dependências

```
Pai: [[COMP - App.jsx]]
Filhos: CardDetailModal, NewActivityModal, DashboardHeader
Services: supabaseClient.js, geminiService.js, historyService.js
CSS: Kanban.css
Libs: @dnd-kit/core, @dnd-kit/sortable
Regras: [[NEG - Módulo Kanban e Tarefas]]
```

---

*Conectado a: [[COMP - Hub de Componentes]] | [[NEG - Módulo Kanban e Tarefas]] | [[NEG - Integrações com IA (Gemini)]]*
