---
tags: [componente, onboarding, empresa, setup, multi-tenant]
status: ativo
complexidade: alta
ecossistema: componentes
---

# 🏢 CompanySetup — Onboarding de Empresa

← Voltar ao [[COMP - Hub de Componentes]]

**Arquivo:** `src/components/CompanySetup.jsx`

---

## Responsabilidade

Guia o usuário recém-registrado no processo de criar ou entrar em uma empresa. É o passo final antes de acessar o sistema principal.

---

## Quando é Exibido

```jsx
// App.jsx
if (isAuthenticated && !currentCompany) {
  return <CompanySetup onSetupComplete={handleSetupComplete} />;
}
```

Condição: usuário autenticado mas sem `company_id` no perfil.

---

## Props Recebidas

```jsx
onSetupComplete    // fn(company) — callback ao finalizar setup
currentUser        // usuário autenticado
```

---

## Fluxo Multi-Step

```
Step 1: Escolha
  ├── "Criar nova empresa"  →  Steps 2A + 3
  └── "Entrar em empresa existente"  →  Step 2B

Step 2A: Dados da empresa
  ├── Nome da empresa
  ├── Setor de atuação (template selector)
  └── Número de funcionários (faixa)

Step 2B: Entrar via código
  └── [Código da empresa]  ← código único gerado na criação

Step 3: Configuração inicial (apenas criação)
  ├── Confirmação dos dados
  └── Gera código de convite único
```

---

## Setores / Templates

O CompanySetup oferece templates pré-configurados por setor:

| Setor | Configurações Pré-aplicadas |
|-------|---------------------------|
| Hospitalar | Módulos: Escalas, Service Center, Knowledge |
| Restaurante | Módulos: Escalas, Inventário, Analytics |
| Varejo | Módulos: Inventário, Kanban, Analytics |
| Construção | Módulos: Kanban, Escalas, Digital Twin |
| Tecnologia | Módulos: Kanban, Knowledge, SLA |
| Outro | Todos os módulos habilitados |

---

## Criação de Empresa (Banco)

```javascript
// Inserção no Supabase:

// 1. Cria empresa
const { data: company } = await supabase
  .from('companies')
  .insert({
    name: companyName,
    sector: selectedSector,
    code: generateInviteCode()   // ex: "KAB-A3F9"
  })
  .select()
  .single();

// 2. Associa usuário à empresa
await supabase
  .from('profiles')
  .update({ company_id: company.id, role: 'admin' })
  .eq('user_id', currentUser.id);
```

---

## Entrar via Código

```javascript
// Busca empresa pelo código de convite
const { data: company } = await supabase
  .from('companies')
  .select('*')
  .eq('code', inviteCode.toUpperCase())
  .single();

if (!company) throw new Error('Código inválido');

// Associa usuário como membro
await supabase
  .from('profiles')
  .update({ company_id: company.id, role: 'member' })
  .eq('user_id', currentUser.id);
```

---

## Estados Internos

```jsx
const [step, setStep] = useState(1);          // step atual
const [mode, setMode] = useState(null);        // 'create' | 'join'
const [companyName, setCompanyName] = useState('');
const [sector, setSector] = useState('');
const [inviteCode, setInviteCode] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
```

---

## Dependências

```
Pai: [[COMP - App.jsx]]
Banco: companies, profiles
Fluxo: [[ARQ - Fluxo de Autenticação]]
Segurança: [[ARQ - Segurança e RLS Multi-Tenant]]
```

---

*Conectado a: [[COMP - Hub de Componentes]] | [[ARQ - Fluxo de Autenticação]] | [[COMP - Login]]*
