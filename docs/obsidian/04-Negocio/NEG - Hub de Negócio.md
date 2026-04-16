---
tags: [negócio, regras, módulos, backend, hub]
status: ativo
complexidade: alta
ecossistema: negócio
---

# 💼 Negócio — Hub

← Voltar ao [[00 - Hub Principal do Sistema]]

> [!info] Sobre este Ecossistema
> Documenta as regras de negócio, fluxos funcionais e integrações de cada módulo do Kabania. É a ponte entre o técnico (código) e o funcional (produto).

---

## Módulos de Negócio

| Módulo | Arquivo | Complexidade |
|--------|---------|-------------|
| Kanban / Tarefas | [[NEG - Módulo Kanban e Tarefas]] | Alta |
| Escalas (Shifts) | [[NEG - Módulo de Escalas (Shifts)]] | Alta |
| Inventário | [[NEG - Módulo de Inventário]] | Média |
| Integrações com IA | [[NEG - Integrações com IA (Gemini)]] | Alta |
| Portal Público | [[NEG - Portal Público do Cliente]] | Média |
| Sistema de Auditoria | [[NEG - Sistema de Auditoria]] | Baixa |

---

## Ciclo de Vida da Plataforma

```
[Empresa cria conta]
       │
       ▼
[Configura equipe + ambientes]
       │
       ▼
[Planeja escalas (manual ou Auto Pilot)]
       │
       ▼
[Publica escalas → funcionários recebem notificação]
       │
       ▼
[Dia do trabalho → check-in via QR Code]
       │
       ▼
[Tarefas e atividades gerenciadas no Kanban]
       │
       ▼
[Relatórios e Analytics → insights]
       │
       ▼
[Clientes acessam Portal → abrem chamados]
       │
       ▼
[Knowledge Base → responde dúvidas automaticamente]
       │
       ▼
[IA analisa padrões → sugere otimizações]
```

---

## Integrações Externas

| Integração | Módulo | Propósito |
|-----------|--------|-----------|
| Google Gemini | Todos | IA de análise e geração |
| Google Calendar | Escalas | Sync de turnos publicados |
| Outlook Calendar | Escalas | Alternativa ao Google Cal |
| Google OAuth | Auth | Login social |

---

## Dados por Módulo

| Módulo | Tabelas Principais |
|--------|-------------------|
| Kanban | `tasks`, `projects` |
| Escalas | `shifts`, `employee_profiles`, `work_environments` |
| Inventário | `inventory`, `inventory_transactions` |
| Suporte | `support_tickets`, `knowledge_base` |
| Analytics | Lê de todas as tabelas |
| Auditoria | `audit_logs` |

---

*Conectado a: [[00 - Hub Principal do Sistema]] | [[ARQ - Hub de Arquitetura]] | [[COMP - Hub de Componentes]]*
