---
tags: [componente, auth, login, oauth, supabase]
status: ativo
complexidade: média
ecossistema: componentes
---

# 🔑 Login — Autenticação

← Voltar ao [[COMP - Hub de Componentes]]

**Arquivo:** `src/components/Login.jsx`

---

## Responsabilidade

Componente de entrada do sistema. Oferece dois métodos de autenticação e trata estados de loading, erro e novo cadastro.

---

## Props Recebidas

```jsx
onLoginSuccess    // fn(user, company) — callback para App.jsx
isProcessing      // boolean — bloqueia formulário durante login
```

---

## Estados Internos

```jsx
const [mode, setMode] = useState('login');  // 'login' | 'signup'
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [error, setError] = useState(null);
const [isLoading, setIsLoading] = useState(false);
const [showPassword, setShowPassword] = useState(false);
```

---

## Métodos de Autenticação

### 1. Email + Senha

```jsx
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
});

// Cadastro
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { first_name, last_name }
  }
});
```

### 2. Google OAuth

```jsx
import { GoogleLogin } from '@react-oauth/google';

<GoogleLogin
  onSuccess={handleGoogleSuccess}
  onError={() => setError('Falha no login com Google')}
  size="large"
  shape="rectangular"
/>
```

---

## Fluxo de Login

```
1. Usuário preenche email + senha
2. submit → setIsLoading(true)
3. supabase.auth.signInWithPassword()
4. Sucesso:
   a. busca profile em profiles WHERE user_id = auth.uid()
   b. busca company em companies WHERE id = profile.company_id
   c. chama onLoginSuccess(user, company)
5. Erro: setError(mensagem)
6. setIsLoading(false)
```

---

## Validações Frontend

| Campo | Validação |
|-------|-----------|
| Email | formato válido (regex) |
| Senha | mínimo 6 caracteres |
| Confirmar senha | (cadastro) deve ser igual à senha |

---

## Visual

```
┌─────────────────────────────┐
│   [Logo Kabania]            │
│   Entrar na sua conta       │
├─────────────────────────────┤
│   [Email          ]         │
│   [Senha        👁]         │
│   [Entrar]                  │
│                             │
│   ── ou ──                  │
│   [G  Continuar com Google] │
├─────────────────────────────┤
│   Não tem conta? Cadastre-se│
└─────────────────────────────┘
```

---

## Dependências

```
Pai: [[COMP - App.jsx]]
Services: supabaseClient.js
Libs: @react-oauth/google
Fluxo completo: [[ARQ - Fluxo de Autenticação]]
```

---

*Conectado a: [[COMP - Hub de Componentes]] | [[ARQ - Fluxo de Autenticação]] | [[COMP - CompanySetup]]*
