---
tags: [negócio, ia, gemini, google, integração, ai]
status: ativo
complexidade: alta
ecossistema: negócio
---

# 🤖 Integrações com IA (Gemini)

← Voltar ao [[NEG - Hub de Negócio]]

**Service:** `src/services/geminiService.js`
**Configuração:** `VITE_GEMINI_API_KEY` em `.env`
**Componentes que usam:** [[COMP - KanbanBoard]], [[COMP - ShiftsModule]], `AIInsights.jsx`, `AIChatFab.jsx`

---

## Visão Geral

O Kabania integra o **Google Gemini** (modelo `gemini-pro`) em múltiplos módulos, tornando a IA um componente transversal da plataforma.

```javascript
// src/services/geminiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
```

---

## Usos da IA no Sistema

### 1. Análise de Tarefas (Kanban)
**Trigger:** Tarefa movida para coluna `ai_review`

```javascript
// Prompt enviado ao Gemini:
const prompt = `
  Analise a seguinte tarefa de software:
  Título: ${task.title}
  Descrição: ${task.description}

  Retorne um JSON com:
  - complexity: "baixa" | "média" | "alta"
  - clarityScore: 0-100
  - suggestedSubTasks: string[]
  - estimatedHours: number
  - risks: string[]
  - improvements: string[]
`;
```

---

### 2. Auto Pilot de Escalas
**Trigger:** Admin clica em "Auto Pilot" no ShiftsModule

```javascript
// aiSchedulingService.js usa o Gemini para:
// 1. Validar a proposta gerada pelo algoritmo
// 2. Identificar conflitos não detectados
// 3. Sugerir otimizações baseadas em padrões históricos

const prompt = `
  Revise esta proposta de escala de trabalho:
  ${JSON.stringify(proposedSchedule)}

  Restrições: ${JSON.stringify(constraints)}

  Identifique: conflitos, sobrecarga, cobertura insuficiente.
  Sugira melhorias mantendo as restrições.
`;
```

---

### 3. Importação Inteligente de Arquivos
**Trigger:** Upload de DOCX/PDF para importar tarefas

```javascript
// fileProcessingService.js
// 1. Extrai texto do arquivo (mammoth/pdfjs)
// 2. Envia ao Gemini para estruturar

const prompt = `
  Extraia as tarefas do seguinte documento e retorne como JSON array:
  ${extractedText}

  Formato: [{ title, description, priority, deadline, tags }]
`;
```

---

### 4. Insights de Analytics
**Trigger:** Acesso ao módulo AIInsights

```javascript
// Analisa dados consolidados da empresa
const prompt = `
  Analise estes dados da empresa ${company.name}:
  - Tarefas: ${JSON.stringify(taskMetrics)}
  - Escalas: ${JSON.stringify(shiftMetrics)}
  - Inventário: ${JSON.stringify(inventoryMetrics)}

  Gere 5 insights acionáveis com prioridade e impacto estimado.
`;
```

---

### 5. Chat com IA (AIChatFab)
**Trigger:** Usuário abre o chat flutuante

O AIChatFab é um assistente contextual que tem acesso ao estado atual da empresa (tarefas, escalas, alertas) e responde perguntas dos usuários.

```javascript
// Contexto injetado no chat:
const systemContext = `
  Você é o assistente Kabania para ${company.name}.
  Módulo atual: ${currentView}
  Dados contextuais: ${JSON.stringify(contextData)}
`;
```

---

## Tratamento de Erros e Custos

> [!warning] Rate Limiting e Custos
> O Gemini API tem limites de requisições por minuto. O sistema não implementa cache de respostas — cada análise é uma nova chamada. Em produção de alta escala, considerar debounce ou cache.

```javascript
// Tratamento de erro em geminiService.js
try {
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
} catch (error) {
  if (error.status === 429) {
    // Rate limit atingido
    throw new Error('IA temporariamente indisponível. Tente em breve.');
  }
  throw error;
}
```

---

## Identidade Visual da IA

> [!info] Cor Roxa para IA
> Por convenção visual no Kabania, tudo relacionado à IA usa `--color-purple` (`#A855F7`). Isso inclui: coluna `ai_review`, botão Auto Pilot, badge de análise IA, ícone do AIChatFab.

---

## Configuração de API Key

```
Arquivo: .env
Variável: VITE_GEMINI_API_KEY
Obtida em: https://makersuite.google.com/app/apikey
```

> [!warning] Segurança
> A `VITE_GEMINI_API_KEY` é exposta no bundle do frontend (como toda variável `VITE_*`). Para produção, considerar implementar um proxy backend que não exponha a chave ao cliente.

---

*Conectado a: [[NEG - Hub de Negócio]] | [[NEG - Módulo Kanban e Tarefas]] | [[NEG - Módulo de Escalas (Shifts)]] | [[ARQ - Camada de Serviços]]*
