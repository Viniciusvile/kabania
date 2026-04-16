---
tags: [design-system, tipografia, espaçamento, fontes]
status: ativo
complexidade: baixa
ecossistema: design
---

# 🔤 Tipografia e Espaçamento

← Voltar ao [[Design System - Hub]]

---

## Fontes

> [!info] Sistema de Fontes
> O Kabania usa a **system font stack** do sistema operacional para textos gerais. Não há importação de Google Fonts ou fontes customizadas na base principal.

```css
/* Fonte padrão do sistema */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             'Helvetica Neue', Arial, sans-serif;
```

**Por quê system fonts?**
- Zero latência de carregamento (sem FOUT/FOIT)
- Consistência com o OS do usuário
- Menor bundle size

---

## Escala Tipográfica

| Classe/Uso | Tamanho | Weight | Onde Aparece |
|-----------|---------|--------|-------------|
| Títulos de módulo (h1) | `24px` / `1.5rem` | `700` | ShiftsModule, Dashboard headers |
| Subtítulos (h2) | `18px` / `1.125rem` | `600` | Seções de cards, modais |
| Label de seção (h3) | `14px` / `0.875rem` | `600` | Sidebar items, form labels |
| Texto corrido (p) | `14px` / `0.875rem` | `400` | Descrições, conteúdo |
| Texto pequeno / Meta | `12px` / `0.75rem` | `400` | Timestamps, badges, tooltips |
| Texto micro | `11px` / `0.6875rem` | `400` | Legendas, anotações |

---

## Line-Height

```css
/* Texto longo (parágrafos) */
line-height: 1.6;

/* Texto de UI (labels, botões) */
line-height: 1.4;

/* Titulares */
line-height: 1.2;
```

---

## Escala de Espaçamento

O sistema usa múltiplos de `4px` como base:

| Token (convencional) | Valor | Uso |
|---------------------|-------|-----|
| `xs` | `4px` | Gaps mínimos, padding interno de badges |
| `sm` | `8px` | Padding de botões compactos, gaps de ícones |
| `md` | `12px` | Padding padrão de inputs, gaps de lista |
| `lg` | `16px` | Padding de cards, espaço entre seções |
| `xl` | `24px` | Padding de modais, margens de seção |
| `2xl` | `32px` | Espaçamento entre blocos grandes |
| `3xl` | `48px` | Padding de páginas |

---

## Border Radius

```css
/* Padrão para a maioria dos elementos */
border-radius: 8px;

/* Cards e modais */
border-radius: 12px;

/* Botões */
border-radius: 6px;

/* Badges / pills */
border-radius: 999px;  /* fully rounded */

/* Inputs */
border-radius: 6px;
```

---

## Breakpoints / Responsividade

> [!info] Mobile-First
> O Kabania foi construído primariamente para desktop, mas possui adaptações mobile via media queries.

```css
/* Mobile */
@media (max-width: 768px) { ... }

/* Tablet */
@media (max-width: 1024px) { ... }

/* Desktop (padrão) */
/* sem media query */
```

**Comportamentos mobile identificados:**
- Sidebar colapsa para menu hambúrguer (`isMobileMenuOpen` no [[COMP - App.jsx]])
- Modais ocupam 100% da tela
- KanbanBoard scroll horizontal

---

*Conectado a: [[Design System - Hub]] | [[DS - Paleta de Cores]]*
