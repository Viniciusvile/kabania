/**
 * aiUsageService.js — Logs every AI call to the `ai_usage` Supabase table.
 * All functions are fire-and-forget: errors are swallowed so they never
 * interrupt the caller.
 */
import { supabase } from '../supabaseClient';

/**
 * @param {{ model: string, feature: string, tokensUsed: number }} params
 */
export async function logUsage({ model, feature, tokensUsed }) {
  try {
    await supabase.from('ai_usage').insert([{
      model,
      feature,
      tokens_used: tokensUsed,
      // Rough cost estimate: Gemini Flash is ~$0.075 / 1M tokens
      cost: parseFloat(((tokensUsed / 1_000_000) * 0.075).toFixed(8)),
    }]);
  } catch {
    // Never surface usage-logging errors to the user
  }
}

/**
 * Returns the AI usage summary for the current company's session.
 * Used by monitoring dashboards.
 * @param {{ limit?: number }} options
 */
export async function fetchUsageLogs({ limit = 100 } = {}) {
  const { data, error } = await supabase
    .from('ai_usage')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
