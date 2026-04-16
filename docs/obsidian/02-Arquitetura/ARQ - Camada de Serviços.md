---
tags: [arquitetura, serviços, services, integração, backend]
status: ativo
complexidade: média
ecossistema: arquitetura
---

# ⚙️ Camada de Serviços

← Voltar ao [[ARQ - Hub de Arquitetura]]

> [!info] Padrão Repository
> Os arquivos em `src/services/` implementam o padrão Repository — abstraem toda a lógica de acesso ao Supabase e APIs externas dos componentes React. Componentes chamam serviços; serviços falam com o banco.

---

## Mapa dos Serviços

| Arquivo | Responsabilidade | Complexidade |
|---------|-----------------|-------------|
| `shiftService.js` | CRUD de escalas, ambientes, funcionários | Alta |
| `geminiService.js` | Integração Google Gemini (análise de texto, IA) | Alta |
| `aiSchedulingService.js` | Algoritmo de scheduling com restrições | Alta |
| `calendarIntegrationService.js` | Sync Google Calendar + Outlook | Alta |
| `calendarService.js` | CRUD de eventos de calendário | Média |
| `fileProcessingService.js` | Importação CSV, DOCX, PDF | Média |
| `historyService.js` | Gravação e leitura de audit_logs | Baixa |
| `notificationService.js` | Notificações in-app + alertas de prazo | Média |
| `offlineSyncService.js` | Fila offline PWA + sync ao reconectar | Alta |
| `smartAllocationService.js` | Balanceamento de carga de trabalho | Alta |

---

## `shiftService.js`

**Responsabilidade:** Abstrai toda a comunicação com as tabelas de escalas.

```javascript
// Principais funções exportadas:
getShifts(companyId, weekStart)          // Busca escalas da semana
createShift(shiftData)                   // Cria novo turno
updateShift(shiftId, updates)            // Atualiza turno
deleteShift(shiftId)                     // Remove turno
getEmployeeProfiles(companyId)           // Lista funcionários
getWorkEnvironments(companyId)           // Lista ambientes
assignEmployeeToShift(shiftId, empId)    // Atribuição
publishWeekSchedule(companyId, week)     // Publica semana
```

**Tabelas acessadas:** `shifts`, `employee_profiles`, `work_environments`, `work_activities`, `shift_assignments`

---

## `geminiService.js`

**Responsabilidade:** Interface com a Google Gemini API para features de IA.

```javascript
// Principais usos no sistema:
analyzeTask(taskDescription)              // Categoriza e prioriza tarefas
generateScheduleSuggestion(constraints)  // Sugere escalas automaticamente
extractEntitiesFromText(text)            // Extrai dados de arquivos importados
generateInsights(analyticsData)          // Gera insights de relatórios
answerQuestion(context, question)        // Chat AI (AIChatFab)
```

**Configuração:**
```javascript
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
```

---

## `aiSchedulingService.js`

**Responsabilidade:** Algoritmo de constraint-based scheduling para o Auto Pilot.

```javascript
// Restrições consideradas:
// - max_daily_hours por funcionário
// - max_weekly_hours por funcionário
// - min_coverage por ambiente
// - disponibilidade declarada (availability JSONB)
// - skills necessárias para a atividade

generateOptimalSchedule(employees, environments, week) {
  // 1. Mapeia restrições de cada funcionário
  // 2. Identifica necessidades por ambiente
  // 3. Roda algoritmo de alocação (greedy + backtracking)
  // 4. Retorna proposta de escala para revisão humana
}
```

**Usado por:** [[COMP - ShiftsModule]] → AutoPilotReview

---

## `fileProcessingService.js`

**Responsabilidade:** Processa arquivos importados pelo usuário.

```javascript
// Formatos suportados:
processCSV(file)    → papaparse
processDOCX(file)   → mammoth
processPDF(file)    → pdfjs-dist

// Após extração de texto:
// → geminiService.extractEntitiesFromText() para estruturar dados
// → Importação em lote para Supabase
```

---

## `offlineSyncService.js`

**Responsabilidade:** Garante que ações feitas offline sejam sincronizadas.

```javascript
// Fluxo:
// 1. Ação do usuário → tenta Supabase
// 2. Se offline → salva em fila no localStorage
// 3. ao reconectar → detecta fila → processa em ordem
// 4. Conflitos → estratégia last-write-wins

queueAction(action)     // Adiciona à fila offline
processQueue()          // Sincroniza fila
isOnline()              // Verifica conectividade
```

---

## `notificationService.js`

**Responsabilidade:** Gerencia alertas e notificações in-app.

```javascript
// Tipos de notificação:
// - Tarefa com prazo próximo (deadline alert)
// - Novo chamado de suporte atribuído
// - Turno publicado / confirmado
// - Estoque abaixo do mínimo

createNotification(userId, type, message, metadata)
getUnreadNotifications(userId)
markAsRead(notificationId)
```

---

## `historyService.js`

**Responsabilidade:** Registra todas as ações auditáveis no sistema.

```javascript
logAction(companyId, userEmail, action, entityType, entityId, details)
// Grava em audit_logs
// details = { before: {...}, after: {...} }  ← diff da mudança
```

**Usado em:** Toda operação destrutiva (delete, update importante, publish)

---

*Conectado a: [[ARQ - Hub de Arquitetura]] | [[NEG - Integrações com IA (Gemini)]] | [[NEG - Módulo de Escalas (Shifts)]]*
