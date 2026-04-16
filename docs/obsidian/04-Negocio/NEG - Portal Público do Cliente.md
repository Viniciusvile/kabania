---
tags: [negócio, portal, cliente, público, suporte, chamados]
status: ativo
complexidade: média
ecossistema: negócio
---

# 🌐 Portal Público do Cliente

← Voltar ao [[NEG - Hub de Negócio]]

**Componente:** [[COMP - Portal do Cliente]]
**Tabelas:** `support_tickets`, `knowledge_base`, `companies` (leitura pública)

---

## Propósito de Negócio

Oferece um ponto de contato direto entre a empresa (cliente do Kabania) e seus próprios clientes externos. Permite acompanhamento de status, abertura de chamados e acesso a conteúdo de autoatendimento — **sem necessidade de login**.

---

## Acesso ao Portal

O portal é acessado por um **código único** gerado durante o setup da empresa:

```
URL: /portal?company=KAB-A3F9
```

O código é gerado em `CompanySetup.jsx` e armazenado em `companies.code`.

---

## Funcionalidades

### Status de Serviços
- Exibe o status operacional dos serviços da empresa
- Atualização em tempo real via Supabase Realtime
- Indicadores visuais: ✅ Operacional | ⚠️ Degradado | ❌ Interrompido

### Abertura de Chamados
```
Cliente preenche:
  - Nome (obrigatório)
  - Email (obrigatório) ← para receber atualizações
  - Título do problema
  - Descrição detalhada
  - Prioridade (baixa / média / alta)

Sistema gera:
  - Número do chamado (ID único)
  - Confirmação por email (se configurado)
```

### Acompanhamento de Chamados
- Cliente pode buscar chamado pelo número ou email
- Vê histórico de atualizações
- Tempo real via Supabase subscription

### Base de Conhecimento Pública
- Artigos marcados como `enabled: true` na `knowledge_base`
- Busca por texto
- Organização por seção/categoria
- Reduz volume de chamados repetitivos

---

## Regras de Negócio

### Visibilidade Pública da KB
```javascript
// Apenas artigos habilitados são visíveis no portal
const { data: articles } = await supabase
  .from('knowledge_base')
  .select('*')
  .eq('company_id', company.id)
  .eq('enabled', true);  // ← filtro de visibilidade
```

### Criação de Ticket sem Login
```javascript
// ticket criado com source: 'portal' para distinção
await supabase.from('support_tickets').insert({
  company_id: company.id,
  source: 'portal',           // diferencia de tickets internos
  requester_name: form.name,
  requester_email: form.email,
  // Sem user_id — cliente externo sem conta
});
```

### Rate Limiting (Proteção contra Spam)
- Máximo de 5 chamados por email por hora
- Validação de email obrigatória

---

## Fluxo de Chamado no Portal

```
[Cliente acessa /portal?company=XYZ]
         │
         ▼
[Portal carrega dados públicos da empresa]
         │
         ▼
[Cliente descreve problema]
         │
         ▼
[Ticket criado com status='aberto']
         │
         ▼
[Equipe interna vê no ServiceCenter.jsx]
         │
         ▼
[Equipe atualiza status → Realtime atualiza portal]
         │
         ▼
[Cliente acompanha em tempo real]
         │
         ▼
[Status = 'resolvido' → Portal mostra resolução]
```

---

## Status dos Chamados

| Status | Visível no Portal | Descrição |
|--------|-----------------|-----------|
| `aberto` | ✅ | Aguardando atendimento |
| `em_andamento` | ✅ | Equipe trabalhando |
| `aguardando_cliente` | ✅ | Precisa de mais informações |
| `resolvido` | ✅ | Problema solucionado |
| `fechado` | ✅ | Arquivado |

---

## Integração com ServiceCenter (Interno)

O `ServiceCenter.jsx` é o lado interno do portal — onde a equipe da empresa vê e gerencia todos os tickets, incluindo os criados pelo portal.

```
Portal (externo) ←→ support_tickets ←→ ServiceCenter (interno)
```

---

*Conectado a: [[NEG - Hub de Negócio]] | [[COMP - Portal do Cliente]] | [[ARQ - Segurança e RLS Multi-Tenant]]*
