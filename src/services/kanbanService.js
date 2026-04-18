/**
 * kanbanService.js — AI-Based Effort Estimation for Kanban cards.
 *
 * Uses Gemini (via aiService) with a few-shot prompt to estimate effort.
 * Results are cached in localStorage by card ID (TTL: 48h).
 */
import { generateText, extractJSON } from './aiService';

const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

function cacheKey(taskId) {
  return `kanban_estimate_${taskId}`;
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

/**
 * Estimates the effort for a Kanban card based on its title and description.
 *
 * @param {{ title: string, description?: string, taskId?: string }} params
 * @returns {Promise<{ estimate: string, complexity: 'baixa'|'média'|'alta', reasoning: string } | null>}
 */
export async function estimateCard({ title, description = '', taskId = null }) {
  if (!title?.trim()) return null;

  if (taskId) {
    const cached = readCache(cacheKey(taskId));
    if (cached) return cached;
  }

  const prompt = `Você é um especialista em gestão ágil de projetos.

Exemplos de estimativas:
- "Corrigir typo no botão de login" → {"estimate":"15min","complexity":"baixa","reasoning":"Simples alteração de texto sem lógica envolvida."}
- "Criar componente de filtro com múltiplas opções" → {"estimate":"3-5h","complexity":"média","reasoning":"Requer estado, props e tratamento de UX."}
- "Refatorar sistema de autenticação para suportar SSO" → {"estimate":"2-3d","complexity":"alta","reasoning":"Múltiplos sistemas afetados, testes necessários."}

Tarefa Kanban:
- Título: "${title}"
- Descrição: "${description.substring(0, 500) || 'Sem descrição'}"

Estime o esforço. Responda APENAS com JSON válido:
{"estimate": "Xh", "complexity": "baixa|média|alta", "reasoning": "Uma frase curta em português explicando o porquê"}

Regras de complexidade:
- baixa: bug fix, ajuste visual, atualização de texto → "15min" a "2h"
- média: novo componente, integração, lógica de negócio → "2-8h"
- alta: nova feature completa, refactoring, múltiplos sistemas → "1-3d"`;

  try {
    const text = await generateText(prompt, 'kanban_estimation');
    const parsed = extractJSON(text);
    if (!parsed?.estimate || !parsed?.complexity) return null;

    const result = {
      estimate: parsed.estimate,
      complexity: parsed.complexity,
      reasoning: parsed.reasoning || '',
    };

    if (taskId) writeCache(cacheKey(taskId), result);
    return result;
  } catch (error) {
    console.error('[kanbanService.estimateCard]', error);
    return null;
  }
}

/**
 * Clears the cached estimation for a card (call when card title/desc changes).
 */
export function invalidateEstimate(taskId) {
  try { localStorage.removeItem(cacheKey(taskId)); } catch {}
}
