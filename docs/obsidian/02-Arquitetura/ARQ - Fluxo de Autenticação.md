---
tags: [arquitetura, autenticação, oauth, supabase, segurança]
status: ativo
complexidade: alta
ecossistema: arquitetura
---

# 🔐 Fluxo de Autenticação

← Voltar ao [[ARQ - Hub de Arquitetura]]

---

## Visão Geral

O Kabania suporta **dois métodos de autenticação**, ambos gerenciados pelo Supabase Auth:

1. **Email + Senha** (Supabase nativo)
2. **Google OAuth 2.0** (via `@react-oauth/google`)

---

## Diagrama do Fluxo Completo

```
┌─────────────────────────────────────────────┐
│              Login.jsx                      │
│                                             │
│  ┌──────────────────┐  ┌─────────────────┐  │
│  │   Email + Senha  │  │  Google OAuth   │  │
│  └────────┬─────────┘  └────────┬────────┘  │
└───────────┼──────────────────────┼───────────┘
            │                      │
            ▼                      ▼
  supabase.auth.signIn()    GoogleOAuthProvider
  signInWithPassword()      → AuthCallbackHandler.jsx
            │                      │
            └──────────┬───────────┘
                       ▼
              [JWT Token recebido]
                       │
                       ▼
          supabase.auth.getSession()
          onAuthStateChange() listener
                       │
                       ▼
          ┌────────────────────────┐
          │  Verificar profiles    │
          │  WHERE user_id = auth  │
          └────────────┬───────────┘
                       │
            ┌──────────┴───────────┐
            │                      │
            ▼                      ▼
    company_id existe?        company_id ausente?
            │                      │
            ▼                      ▼
    Carregar empresa          CompanySetup.jsx
    → App principal           (onboarding)
```

---

## Configuração do Supabase Client

```javascript
// src/supabaseClient.js
createClient(url, anonKey, {
  auth: {
    autoRefreshToken: true,      // Renova JWT automaticamente
    persistSession: true,         // Salva sessão no localStorage
    detectSessionInUrl: true,     // Detecta callback OAuth na URL
    storageKey: 'kabania_supabase_auth_token_v3',  // Chave no localStorage
    flowType: 'pkce'              // PKCE para segurança OAuth
  }
})
```

> [!info] PKCE Flow
> O Kabania usa o fluxo **PKCE (Proof Key for Code Exchange)** para OAuth, que é mais seguro que o fluxo implícito para SPAs. Não há `client_secret` exposto no frontend.

---

## Chaves do localStorage (Autenticação)

| Chave | Conteúdo |
|-------|---------|
| `kabania_supabase_auth_token_v3` | JWT session do Supabase |
| `synapseAuth` | Flag de autenticação (`true/false`) |
| `synapseCurrentUser` | Dados do usuário atual |
| `kabania_theme` | Preferência de tema |
| `kabania_current_project_id` | Projeto selecionado |

---

## Verificação de Sessão no Boot

```javascript
// App.jsx — ao montar o componente
useEffect(() => {
  const checkSession = async () => {
    setIsSessionLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      setIsAuthenticated(true);
      // Busca perfil + empresa do usuário
      await loadUserProfile(session.user);
    }
    setIsSessionLoading(false);
  };

  checkSession();

  // Listener para mudanças de auth
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // Limpa estado e localStorage
        handleLogout();
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

---

## Fluxo de Logout

```
1. Usuário clica em "Sair"
2. supabase.auth.signOut()
3. Limpa localStorage (synapseAuth, synapseCurrentUser, etc.)
4. setIsAuthenticated(false)
5. Redireciona para Login.jsx
```

---

## Onboarding Pós-Login

```javascript
// Se o usuário não tem company_id no perfil:
if (!profileData?.company_id) {
  return <CompanySetup onSetupComplete={handleSetupComplete} />;
}
```

O [[COMP - CompanySetup]] guia o usuário para:
1. Criar nova empresa OU entrar em uma existente (via código)
2. Escolher setor (hospitalar, restaurante, varejo...)
3. Dados são salvos em `companies` + `profiles` tables

---

## Segurança

> [!warning] Row Level Security
> Mesmo com JWT válido, o Supabase verifica as policies RLS antes de qualquer operação. Um usuário autenticado só acessa dados da sua empresa. Ver [[ARQ - Segurança e RLS Multi-Tenant]].

| Camada | Proteção |
|--------|----------|
| PKCE OAuth | Impede interceptação do código de autorização |
| JWT Expiry | Tokens expiram e são renovados automaticamente |
| RLS Policies | Isolamento de dados por company_id no banco |
| HTTPS | Supabase só aceita conexões seguras |

---

*Conectado a: [[ARQ - Hub de Arquitetura]] | [[ARQ - Segurança e RLS Multi-Tenant]] | [[COMP - Login]] | [[COMP - CompanySetup]]*
