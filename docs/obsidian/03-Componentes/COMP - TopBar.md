---
tags: [componente, topbar, header, tema, usuário]
status: ativo
complexidade: baixa
ecossistema: componentes
---

# 🔝 TopBar — Header da Aplicação

← Voltar ao [[COMP - Hub de Componentes]]

**Arquivo:** `src/components/TopBar.jsx`
**CSS:** `src/components/Dashboard.css`

---

## Responsabilidade

Barra superior fixa da aplicação. Exibe o título do módulo atual, busca global, toggle de tema e menu do usuário.

---

## Props Recebidas

```jsx
currentView        // string — módulo ativo (para exibir título)
currentUser        // objeto do usuário logado
currentCompany     // objeto da empresa
theme              // 'dark' | 'light'
onToggleTheme      // fn() — alterna tema
onNavigate         // fn(view) — navega para outra view
onLogout           // fn() — logout
onToggleMobile     // fn() — abre sidebar no mobile
```

---

## Estrutura Visual

```
┌──────────────────────────────────────────────────────┐
│ [≡ Mobile]  [Título do Módulo]   [🔔] [🌙] [Avatar▼] │
└──────────────────────────────────────────────────────┘
```

| Elemento | Descrição |
|---------|-----------|
| Menu hambúrguer | Visível apenas em mobile, abre Sidebar |
| Título do módulo | Mapeado do `currentView` para nome legível |
| Notificações | Badge com contagem de não lidas |
| Toggle de tema | Ícone sol (light) / lua (dark) |
| Avatar do usuário | Dropdown: perfil, configurações, logout |

---

## Mapeamento de Títulos

```javascript
const viewTitles = {
  'workspace': 'Workspace',
  'shifts': 'Gestão de Escalas',
  'inventory': 'Inventário',
  'analytics': 'Analytics',
  'reports': 'Relatórios',
  'academy': 'Academy',
  'knowledge': 'Base de Conhecimento',
  'service-center': 'Central de Suporte',
  // ...
};
```

---

## Notificações

```jsx
// Busca notificações não lidas do usuário
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
  notificationService.getUnreadNotifications(currentUser.id)
    .then(notifs => setUnreadCount(notifs.length));
}, [currentUser]);
```

---

## Dependências

```
Pai: [[COMP - App.jsx]]
Services: notificationService.js
Theme: [[DS - Sistema de Temas (Dark e Light)]]
```

---

*Conectado a: [[COMP - Hub de Componentes]] | [[COMP - App.jsx]] | [[DS - Sistema de Temas (Dark e Light)]]*
