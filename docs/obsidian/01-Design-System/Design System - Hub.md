---
tags: [design-system, ui, css, tema, visual]
status: ativo
complexidade: média
ecossistema: design
---

# 🎨 Design System — Hub

> [!info] Centralização Visual
> Este hub conecta todas as decisões de design do Kabania. O sistema é implementado via **CSS Custom Properties** (variáveis CSS nativas), sem Tailwind ou bibliotecas de componentes externas.

← Voltar ao [[00 - Hub Principal do Sistema]]

---

## Filosofia do Design

O Kabania adota uma abordagem **dark-first** — o tema escuro é o padrão de fábrica. O tema claro existe como variante via atributo `data-theme='light'` no `<html>`.

```
Arquivo central: src/index.css
Aplicação: src/App.jsx (toggleTheme → localStorage → data-theme)
```

---

## Sub-arquivos deste Ecossistema

| Arquivo | Conteúdo |
|---------|----------|
| [[DS - Paleta de Cores]] | Todas as variáveis de cor, dark e light |
| [[DS - Tipografia e Espaçamento]] | Fontes, tamanhos, line-height, espaçamentos |
| [[DS - Sistema de Temas (Dark e Light)]] | Lógica de troca de tema, persistência |

---

## Resumo dos Tokens Visuais

### Backgrounds
```css
--bg-app        /* Fundo raiz da aplicação */
--bg-sidebar    /* Fundo do painel lateral */
--bg-card       /* Fundo de cards e containers */
--bg-input      /* Fundo de campos de formulário */
--bg-hover      /* Estado hover de elementos interativos */
```

### Texto
```css
--text-main     /* Cor primária de texto */
--text-muted    /* Texto secundário / placeholder */
--text-accent   /* Texto de destaque / links */
```

### Cores de Acento / Marca
```css
--accent-cyan   /* Cor primária de marca (#00E5FF dark / #0052CC light) */
--color-green   /* Sucesso / confirmação (#22C55E) */
--color-purple  /* IA / destaque especial (#A855F7) */
--color-red     /* Erro / alerta (#EF4444) */
--color-yellow  /* Atenção / aviso */
--color-orange  /* Prioridade alta */
```

### Bordas e Superfícies
```css
--border-color  /* Cor padrão de bordas */
--shadow-card   /* Sombra de cards */
```

---

## Ícones

> [!info] Biblioteca de Ícones
> O Kabania utiliza **Lucide React** (`lucide-react@0.577.0`) como única biblioteca de ícones. Não há FontAwesome, Material Icons ou SVGs customizados (exceto `default-floorplan.svg`).

**Padrão de uso:**
```jsx
import { Calendar, Users, BarChart2 } from 'lucide-react';
<Calendar size={18} color="var(--accent-cyan)" />
```

---

## Componentes Visuais Recorrentes

Os padrões abaixo aparecem em múltiplos componentes:

| Padrão | Onde Aparece |
|--------|-------------|
| `.card` / `.panel` | KanbanBoard, Inventory, Analytics |
| `.btn-primary` / `.btn-secondary` | Todos os modais |
| `.badge` / `.tag` | Status de tarefas, escalas |
| `.modal-overlay` + `.modal-content` | Todos os modais |
| `.spinner` / loading state | App.jsx (tela inicial) |
| `.scrollbar-hide` | Sidebar, listas longas |

---

> [!warning] Consistência
> Evite hardcodar valores de cor (ex: `#00E5FF`). Sempre use as variáveis CSS correspondentes para garantir que o tema claro funcione corretamente.

---

*Conectado a: [[00 - Hub Principal do Sistema]] | [[COMP - Hub de Componentes]]*
