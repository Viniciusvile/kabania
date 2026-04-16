---
tags: [componente, escalas, shifts, agendamento, funcionários]
status: ativo
complexidade: alta
ecossistema: componentes
---

# 📅 ShiftsModule — Gestão de Escalas

← Voltar ao [[COMP - Hub de Componentes]]

**Arquivo:** `src/components/Shifts/ShiftsModule.jsx`
**CSS:** `src/components/Shifts/ShiftsModule.css`
**Hook:** `src/hooks/useShifts.js`
**Service:** `src/services/shiftService.js`

---

## Responsabilidade

O ShiftsModule é o módulo mais complexo do Kabania. Gerencia a escala de trabalho de equipes, incluindo planejamento semanal, Auto Pilot com IA, check-in/out de funcionários e estatísticas.

---

## Sub-Componentes (13 no total)

```
ShiftsModule.jsx (pai)
├── ShiftGrid.jsx           ← Grade semanal de turnos
├── ShiftPlanner.jsx        ← Planejador avançado
├── ShiftSidebar.jsx        ← Painel lateral de ações rápidas
├── ShiftControls.jsx       ← Barra de controles
├── ShiftStats.jsx          ← Métricas e KPIs
├── AutoPilotReview.jsx     ← Revisão de escalas geradas por IA
├── IntelligencePanel.jsx   ← Insights de agendamento
├── EmployeesManager.jsx    ← Cadastro de funcionários
├── EnvironmentsManager.jsx ← Cadastro de ambientes de trabalho
├── MyShifts.jsx            ← Visão do funcionário (seus turnos)
├── ShiftCheckinModal.jsx   ← Modal de check-in/out
└── [Variantes premium/redesign]
```

---

## Hook: `useShifts.js`

```jsx
// src/hooks/useShifts.js
// Encapsula todo o estado e carregamento do módulo

const {
  shifts,              // array de turnos da semana
  employees,           // funcionários cadastrados
  environments,        // ambientes de trabalho
  activities,          // atividades de trabalho
  isLoading,           // estado de carregamento
  selectedWeek,        // semana selecionada (Date)
  setSelectedWeek,
  refreshShifts,       // recarrega dados
  createShift,
  updateShift,
  deleteShift,
  publishWeek,
} = useShifts(companyId);
```

**Estratégia de Cache:**
- Carrega ambientes, funcionários e atividades em **paralelo** no mount
- Usa cache em memória para evitar refetches
- Otimistic UI: atualiza estado local antes da confirmação do Supabase

---

## Props Recebidas

```jsx
currentCompany    // empresa atual (company_id)
currentUser       // usuário logado
userRole          // 'admin' | 'member' | 'viewer'
theme             // dark/light
```

---

## Estados Internos (ShiftsModule)

```jsx
const [activeTab, setActiveTab] = useState('grid');
// Tabs: 'grid' | 'planner' | 'employees' | 'environments' | 'my-shifts'

const [selectedDate, setSelectedDate] = useState(new Date());
const [isAutoPilotRunning, setIsAutoPilotRunning] = useState(false);
const [autoPilotSuggestion, setAutoPilotSuggestion] = useState(null);
const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
```

---

## ShiftGrid — Grade Semanal

```
         Seg   Ter   Qua   Qui   Sex   Sab   Dom
         01    02    03    04    05    06    07
─────────────────────────────────────────────────
Ana      [████ 08:00-16:00]           [████]
Bruno          [████ 14:00-22:00] [████]
Carlos    [██]       [████]      [███]
─────────────────────────────────────────────────
Cobertura  2     1     2     1     2     1     0
```

- Células clicáveis para criar/editar turno
- Cores indicam status (draft=cinza, published=verde, conflito=vermelho)
- Indicador de cobertura mínima no rodapé

---

## Auto Pilot (IA + Gemini)

```
1. Admin clica "Auto Pilot"
2. aiSchedulingService.generateOptimalSchedule() é chamado
   Input: employees[], environments[], week, constraints
3. Gemini API analisa e sugere distribuição ideal
4. AutoPilotReview.jsx exibe a proposta
5. Admin revisa, ajusta e aprova
6. publishWeek() grava no Supabase
```

**Restrições consideradas:**
- `max_daily_hours` por funcionário
- `max_weekly_hours` por funcionário
- `min_coverage` por ambiente/turno
- `availability` JSONB (disponibilidade declarada)
- Histórico de escalas anteriores

---

## Check-in / Check-out

```
ShiftCheckinModal.jsx
├── QR Code Scanner (html5-qrcode)
│   └── Funcionário escaneia QR no local de trabalho
├── Geolocalização (navigator.geolocation)
│   └── Verifica se está no ambiente correto
└── Registro de timestamp no Supabase
```

---

## Regras de Negócio

Ver [[NEG - Módulo de Escalas (Shifts)]] para detalhes completos.

---

## Fluxo Principal

```
1. ShiftsModule monta → useShifts() carrega dados paralelos
2. ShiftGrid exibe semana atual
3. Admin cria/edita turnos manualmente OU usa Auto Pilot
4. Ao finalizar: publishWeek() → status muda para 'published'
5. Funcionários veem escalas em MyShifts
6. No dia do turno: ShiftCheckinModal registra presença
7. ShiftStats exibe métricas da semana
```

---

## Dependências

```
Pai: [[COMP - App.jsx]]
Hook: useShifts.js
Services: shiftService.js, aiSchedulingService.js, geminiService.js
Libs: html5-qrcode
Regras: [[NEG - Módulo de Escalas (Shifts)]]
DB: shifts, employee_profiles, work_environments, work_activities, shift_assignments
```

---

*Conectado a: [[COMP - Hub de Componentes]] | [[NEG - Módulo de Escalas (Shifts)]] | [[NEG - Integrações com IA (Gemini)]] | [[ARQ - Camada de Serviços]]*
