/**
 * aiService.js — Centralized AI wrapper for the Kabania platform.
 * All AI calls should go through here so usage is tracked uniformly.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logUsage } from './aiUsageService';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');
const MODEL_NAME = 'gemini-flash-latest';

/**
 * Calls Gemini with a plain-text prompt and returns the response text.
 * Logs usage to Supabase asynchronously (never blocks the caller).
 *
 * @param {string} prompt
 * @param {string} feature  — label for usage tracking (e.g. 'kb_recommender')
 * @returns {Promise<string>}
 */
export async function generateText(prompt, feature = 'generic') {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY não configurada.');

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Fire-and-forget usage log — never throw
  const estimatedTokens = Math.ceil((prompt.length + text.length) / 4);
  logUsage({ model: MODEL_NAME, feature, tokensUsed: estimatedTokens }).catch(() => {});

  return text;
}

/**
 * Extracts a JSON object from a Gemini response that may contain markdown fences.
 * @param {string} text
 * @returns {object|null}
 */
export function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

/**
 * Extracts a JSON array from a Gemini response.
 * @param {string} text
 * @returns {Array|null}
 */
export function extractJSONArray(text) {
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}
