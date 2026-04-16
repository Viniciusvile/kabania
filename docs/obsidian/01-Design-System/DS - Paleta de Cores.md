---
tags: [design-system, cores, css-variables, tema]
status: ativo
complexidade: baixa
ecossistema: design
---

# 🎨 Paleta de Cores — Design System

← Voltar ao [[Design System - Hub]]

> [!info] Fonte da Verdade
> Todas as cores são definidas em `src/index.css`. O tema dark é aplicado em `:root` e o tema light sobrescreve em `[data-theme='light']`.

---

## Tema Dark (Padrão)

```css
/* src/index.css — :root */

/* === BACKGROUNDS === */
--bg-app:          #181A20;   /* Fundo raiz — tom mais escuro */
--bg-sidebar:      #13151A;   /* Sidebar — mais escuro que o app */
--bg-card:         #252831;   /* Cards, modais, painéis */
--bg-input:        #1E2028;   /* Inputs e selects */
--bg-hover:        #2E3140;   /* Hover states */
--bg-modal:        #1C1F27;   /* Fundo de modais */
--bg-tooltip:      #2C2F3E;   /* Tooltips */

/* === TEXTO === */
--text-main:       #FFFFFF;   /* Texto primário */
--text-muted:      #8F95B2;   /* Texto secundário */
--text-accent:     #00E5FF;   /* Links e destaque */
--text-disabled:   #4A5068;   /* Texto desabilitado */

/* === CORES DE ACENTO === */
--accent-cyan:     #00E5FF;   /* Cor primária de marca */
--accent-cyan-dim: #00B8CC;   /* Variante escura do cyan */

/* === STATUS COLORS === */
--color-green:     #22C55E;   /* Sucesso, online, ativo */
--color-red:       #EF4444;   /* Erro, alerta, deletar */
--color-yellow:    #EAB308;   /* Atenção, pendente */
--color-orange:    #F97316;   /* Alta prioridade */
--color-purple:    #A855F7;   /* IA, especial, destaque */
--color-blue:      #3B82F6;   /* Info, links */

/* === BORDAS E DIVISORES === */
--border-color:    #2E3140;   /* Bordas padrão */
--border-focus:    #00E5FF;   /* Foco em inputs */

/* === SOMBRAS === */
--shadow-card:     0 2px 8px rgba(0,0,0,0.4);
--shadow-modal:    0 8px 32px rgba(0,0,0,0.6);
--shadow-elevated: 0 4px 16px rgba(0,0,0,0.5);
```

---

## Tema Light (Variante)

```css
/* src/index.css — [data-theme='light'] */

/* === BACKGROUNDS === */
--bg-app:          #F8FAFC;
--bg-sidebar:      #FFFFFF;
--bg-card:         #FFFFFF;
--bg-input:        #F1F5F9;
--bg-hover:        #E8EEF4;
--bg-modal:        #FFFFFF;

/* === TEXTO === */
--text-main:       #0F172A;
--text-muted:      #64748B;
--text-accent:     #0052CC;
--text-disabled:   #94A3B8;

/* === CORES DE ACENTO === */
--accent-cyan:     #0052CC;   /* Azul no light mode */

/* === BORDAS === */
--border-color:    #E2E8F0;
--border-focus:    #0052CC;

/* === SOMBRAS === */
--shadow-card:     0 1px 4px rgba(0,0,0,0.08);
--shadow-modal:    0 8px 32px rgba(0,0,0,0.16);
```

---

## Mapeamento Semântico de Cores

| Cor | Hex (Dark) | Uso Semântico |
|-----|-----------|---------------|
| Cyan / Azul | `#00E5FF` | Marca, CTAs, links, seleção ativa |
| Verde | `#22C55E` | Sucesso, status "ativo", "concluído" |
| Vermelho | `#EF4444` | Erro, exclusão, alerta crítico |
| Amarelo | `#EAB308` | Aviso, "pendente", atenção |
| Laranja | `#F97316` | Alta prioridade, "urgente" |
| Roxo | `#A855F7` | IA, features especiais, "Auto Pilot" |
| Azul | `#3B82F6` | Informação, links secundários |

---

## Uso nos Módulos

| Módulo | Cor Dominante | Razão |
|--------|--------------|-------|
| [[COMP - KanbanBoard]] | Cyan (`--accent-cyan`) | Seleção de colunas e CTAs |
| [[NEG - Módulo de Escalas (Shifts)]] | Verde / Azul | Status de turno |
| [[NEG - Integrações com IA (Gemini)]] | Roxo (`--color-purple`) | Identidade visual da IA |
| [[NEG - Módulo de Inventário]] | Azul (`--color-blue`) | Neutro / informacional |
| Alertas / SLA | Vermelho + Amarelo | Status crítico |

---

> [!warning] Anti-Pattern
> Não use `color: #00E5FF` diretamente. Use `color: var(--accent-cyan)` para que o tema light funcione automaticamente.

---

*Conectado a: [[Design System - Hub]] | [[DS - Sistema de Temas (Dark e Light)]]*
