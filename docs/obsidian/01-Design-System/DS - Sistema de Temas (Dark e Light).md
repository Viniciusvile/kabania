---
tags: [design-system, tema, dark-mode, light-mode, css-variables]
status: ativo
complexidade: baixa
ecossistema: design
---

# 🌗 Sistema de Temas (Dark e Light)

← Voltar ao [[Design System - Hub]]

---

## Mecanismo de Troca

O sistema de temas funciona em 3 camadas:

```
1. [UserSettings / TopBar] → usuário clica no toggle
2. [App.jsx → toggleTheme()] → atualiza estado + localStorage
3. [useEffect] → aplica data-theme='light' ou remove do <html>
```

---

## Implementação em App.jsx

```jsx
// Inicialização (carrega do localStorage)
const [theme, setTheme] = useState(() => {
  return localStorage.getItem('kabania_theme') || 'dark';
});

// Efeito que aplica o tema no DOM
useEffect(() => {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('kabania_theme', theme);
}, [theme]);

// Função de toggle
const toggleTheme = () => {
  setTheme(prev => prev === 'dark' ? 'light' : 'dark');
};
```

---

## Chave de Persistência

```
localStorage key: 'kabania_theme'
Valores: 'dark' | 'light'
Default: 'dark'
```

---

## Como as Variáveis Respondem

```css
/* src/index.css */

/* Tema dark — padrão do sistema */
:root {
  --bg-app: #181A20;
  --text-main: #FFFFFF;
  --accent-cyan: #00E5FF;
  /* ... */
}

/* Tema light — ativado via data-theme='light' */
[data-theme='light'] {
  --bg-app: #F8FAFC;
  --text-main: #0F172A;
  --accent-cyan: #0052CC;
  /* ... sobrescreve apenas as variáveis que mudam */
}
```

> [!info] Economia de CSS
> Apenas as variáveis que **mudam** entre temas precisam estar no bloco `[data-theme='light']`. As que permanecem iguais (ex: `--color-green`) ficam apenas em `:root`.

---

## Variáveis que Mudam Entre Temas

| Variável | Dark | Light |
|----------|------|-------|
| `--bg-app` | `#181A20` | `#F8FAFC` |
| `--bg-sidebar` | `#13151A` | `#FFFFFF` |
| `--bg-card` | `#252831` | `#FFFFFF` |
| `--text-main` | `#FFFFFF` | `#0F172A` |
| `--text-muted` | `#8F95B2` | `#64748B` |
| `--accent-cyan` | `#00E5FF` | `#0052CC` |
| `--border-color` | `#2E3140` | `#E2E8F0` |
| `--shadow-card` | `rgba(0,0,0,0.4)` | `rgba(0,0,0,0.08)` |

---

## Componentes que Usam o Toggle

| Componente | Como Expõe |
|-----------|-----------|
| [[COMP - App.jsx]] | Mantém estado `theme`, passa `toggleTheme` como prop |
| `TopBar.jsx` | Exibe ícone de sol/lua, chama `toggleTheme` |
| `UserSettings.jsx` | Toggle visual nas configurações |

---

> [!warning] SSR / Flicker
> Em ambientes com SSR o tema carregado do localStorage pode causar FOUC (Flash of Unstyled Content). O Kabania contorna isso lendo o localStorage antes do React montar via `useState(() => localStorage.getItem(...))`.

---

*Conectado a: [[Design System - Hub]] | [[DS - Paleta de Cores]] | [[COMP - App.jsx]]*
