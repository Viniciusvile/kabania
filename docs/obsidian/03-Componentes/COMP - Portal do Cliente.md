---
tags: [componente, portal, cliente, público, sem-auth]
status: ativo
complexidade: média
ecossistema: componentes
---

# 🌐 ClientPortal — Portal Público do Cliente

← Voltar ao [[COMP - Hub de Componentes]]

**Arquivo:** `src/components/Portal/ClientPortal.jsx`

---

## Responsabilidade

O ClientPortal é uma interface **pública** (sem autenticação) que permite que clientes de uma empresa acompanhem status de serviços, abram chamados e visualizem informações relevantes.

---

## Acesso

```jsx
// App.jsx — rota especial sem autenticação
const isPublicPortalRoute = window.location.pathname.startsWith('/portal');

if (isPublicPortalRoute) {
  return <ClientPortal />;
}
```

**URL:** `/portal/:companyCode` ou `/portal?company=CODIGO`

---

## Props / Dados

O componente não recebe props do App.jsx — carrega seus dados diretamente:

```javascript
// Busca empresa pelo código na URL
const companyCode = new URLSearchParams(window.location.search).get('company');

const { data: company } = await supabase
  .from('companies')
  .select('*')
  .eq('code', companyCode)
  .single();
```

> [!warning] Segurança RLS
> A query do portal usa a Supabase Anon Key. As policies RLS devem permitir leitura pública apenas das informações autorizadas (ex: status de chamados, não dados internos). Ver [[ARQ - Segurança e RLS Multi-Tenant]].

---

## Funcionalidades do Portal

| Feature | Descrição |
|---------|-----------|
| Visualizar status | Acompanhar status de serviços/atividades |
| Abrir chamado | Criar novo support ticket |
| Acompanhar chamado | Ver atualizações em tempo real |
| Base de Conhecimento | Artigos públicos da empresa |
| Informações da empresa | Contato, horários |

---

## Estados Internos

```jsx
const [company, setCompany] = useState(null);
const [isLoading, setIsLoading] = useState(true);
const [activeSection, setActiveSection] = useState('status');
const [newTicketForm, setNewTicketForm] = useState({
  title: '',
  description: '',
  requesterName: '',
  requesterEmail: '',
  priority: 'medium'
});
const [tickets, setTickets] = useState([]);
const [error, setError] = useState(null); // ex: empresa não encontrada
```

---

## Visual (sem autenticação)

```
┌─────────────────────────────────────────┐
│  [Logo da Empresa] Portal do Cliente   │
├─────────────────────────────────────────┤
│  Status  │  Chamados  │  Conhecimento  │
├─────────────────────────────────────────┤
│                                         │
│  [Conteúdo da seção ativa]             │
│                                         │
└─────────────────────────────────────────┘
```

---

## Abertura de Chamado (sem login)

```javascript
// Cria ticket sem user_id (cliente externo)
await supabase.from('support_tickets').insert({
  company_id: company.id,
  title: form.title,
  description: form.description,
  requester_name: form.requesterName,
  requester_email: form.requesterEmail,
  priority: form.priority,
  source: 'portal'   // identifica origem como portal público
});
```

---

## Tempo Real (Supabase Realtime)

```javascript
// Assina atualizações de tickets em tempo real
supabase
  .channel('portal-tickets')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'support_tickets',
    filter: `company_id=eq.${company.id}`
  }, (payload) => {
    // Atualiza status do ticket na UI
    setTickets(prev => prev.map(t =>
      t.id === payload.new.id ? payload.new : t
    ));
  })
  .subscribe();
```

---

## Dependências

```
Pai: [[COMP - App.jsx]] (rota especial)
Services: supabaseClient.js (anon)
Regras: [[NEG - Portal Público do Cliente]]
DB: companies, support_tickets, knowledge_base (leitura pública)
```

---

*Conectado a: [[COMP - Hub de Componentes]] | [[NEG - Portal Público do Cliente]] | [[ARQ - Segurança e RLS Multi-Tenant]]*
