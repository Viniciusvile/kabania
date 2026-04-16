---
tags: [negócio, escalas, shifts, agendamento, funcionários, auto-pilot]
status: ativo
complexidade: alta
ecossistema: negócio
---

# 📅 Módulo de Escalas (Shifts)

← Voltar ao [[NEG - Hub de Negócio]]

**Componente:** [[COMP - ShiftsModule]]
**Service:** `shiftService.js`, `aiSchedulingService.js`
**Tabelas:** `shifts`, `employee_profiles`, `work_environments`, `work_activities`, `shift_assignments`

---

## Propósito de Negócio

Gerencia o agendamento de turnos de trabalho de equipes. Suporta planejamento manual e geração automática via IA (Auto Pilot), com check-in/out por QR Code e integração com calendários externos.

---

## Entidades do Domínio

### Funcionário (`employee_profiles`)
```
- Role/Cargo (ex: Médico, Garçom, Vendedor)
- Carga máxima diária (ex: 8h)
- Carga máxima semanal (ex: 44h)
- Skills/certificações
- Disponibilidade declarada por dia da semana
```

### Ambiente de Trabalho (`work_environments`)
```
- Nome (ex: "UTI", "Salão", "Caixa 1")
- Cobertura mínima necessária (ex: 2 pessoas)
- Planta baixa (referência ao Digital Twin)
```

### Turno (`shifts`)
```
- Funcionário atribuído
- Horário de início e fim
- Status: draft | published | confirmed | cancelled
- Ambiente de trabalho
- Atividade de trabalho
```

---

## Ciclo de Vida de um Turno

```
[draft]       → Admin cria/edita manualmente ou via Auto Pilot
    │
    ▼
[published]   → Admin confirma e publica a semana
    │              ↳ Funcionário recebe notificação
    │              ↳ Sync com Google Calendar (se integrado)
    ▼
[confirmed]   → Funcionário confirma via MyShifts
    │
    ▼
[check-in]    → Funcionário faz check-in no início do turno (QR Code)
    │
    ▼
[check-out]   → Funcionário registra saída
    │
    ▼
[closed]      → Turno encerrado, horas registradas
```

---

## Regras de Negócio — Agendamento

| Regra | Descrição |
|-------|-----------|
| **Limite diário** | Funcionário não pode ultrapassar `max_daily_hours` |
| **Limite semanal** | Funcionário não pode ultrapassar `max_weekly_hours` |
| **Cobertura mínima** | Todo ambiente deve ter `min_coverage` pessoas em cada turno |
| **Disponibilidade** | Respeita `availability` JSONB declarado pelo funcionário |
| **Conflito de horário** | Sistema alerta ao tentar criar turno sobreposto |
| **Regra 11h** | Mínimo 11h entre turnos consecutivos (legislação trabalhista) |
| **Antecedência** | Escalas devem ser publicadas com mínimo de X dias de antecedência |

---

## Auto Pilot (IA)

> [!info] Diferencial Competitivo
> O Auto Pilot é a feature mais sofisticada do módulo de escalas. Usa constraint-solving + Gemini para gerar uma proposta de escala otimizada.

**Inputs:**
```
- Lista de funcionários com restrições
- Lista de ambientes com cobertura mínima
- Semana alvo
- Histórico de escalas anteriores (para diversificação)
- Preferências declaradas
```

**Algoritmo:**
```
1. Mapeia demanda: por ambiente, por dia, por turno
2. Mapeia capacidade: por funcionário, considerando restrições
3. Matching: greedy por prioridade de cobertura mínima
4. Otimização: balanceia carga entre funcionários
5. Gemini review: valida proposta e sugere ajustes
6. Retorna proposta para aprovação humana
```

**Output:** Proposta exibida no `AutoPilotReview.jsx`

---

## Check-in / Check-out

```
Funcionário no local de trabalho
         │
         ▼
Abre ShiftCheckinModal
         │
         ├── Opção 1: QR Code (html5-qrcode)
         │     └── Escaneia QR fixo no ambiente físico
         │
         └── Opção 2: Manual
               └── Confirma horário manualmente
         │
         ▼
Registra timestamp + localização
         │
         ▼
shift.status = 'in_progress'
         │
         ▼
[Fim do turno] → check-out
         │
         ▼
Calcula horas trabalhadas
         │
         ▼
Atualiza ShiftStats
```

---

## Integração com Calendários

Quando habilitada (`calendar_integrations` table):

| Evento | Ação |
|--------|------|
| Escala publicada | Cria evento no Google Calendar / Outlook |
| Turno editado | Atualiza evento |
| Turno cancelado | Remove evento |
| Funcionário confirma | Aceita convite do calendário |

---

## Regras de Permissão

| Ação | Admin | Member |
|------|-------|--------|
| Criar/editar turno | ✅ | ❌ |
| Publicar semana | ✅ | ❌ |
| Auto Pilot | ✅ | ❌ |
| Ver escalas da equipe | ✅ | ✅ |
| Confirmar próprio turno | ✅ | ✅ |
| Check-in / check-out | ✅ | ✅ |
| Gerenciar funcionários | ✅ | ❌ |

---

## Métricas (ShiftStats)

| Métrica | Cálculo |
|---------|---------|
| Horas planejadas vs. realizadas | Comparação shift vs. check-in/out |
| Taxa de presença | `confirmed / published * 100` |
| Cobertura média | `AVG(funcionários_presentes / min_coverage)` |
| Funcionário mais sobrecarregado | `MAX(weekly_hours)` |
| Turnos sem cobertura mínima | `COUNT WHERE coverage < min_coverage` |

---

*Conectado a: [[NEG - Hub de Negócio]] | [[COMP - ShiftsModule]] | [[NEG - Integrações com IA (Gemini)]] | [[ARQ - Camada de Serviços]]*
