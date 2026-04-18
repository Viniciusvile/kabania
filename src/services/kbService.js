/**
 * kbService.js — Smart Article Recommender for the Knowledge Base.
 *
 * Uses Gemini (via aiService) to find the 3 most related articles
 * for a given article, with localStorage caching (TTL: 24h).
 */
import { generateText, extractJSONArray } from './aiService';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cacheKey(companyId, articleId) {
  return `kb_related_${companyId}_${articleId}`;
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ids, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem(key); return null; }
    return ids;
  } catch { return null; }
}

function writeCache(key, ids) {
  try { localStorage.setItem(key, JSON.stringify({ ids, ts: Date.now() })); } catch {}
}

/**
 * Returns up to 3 article IDs most related to `article` from `allArticles`.
 * Results are cached per company+article for 24 hours.
 *
 * @param {object}   article      - The currently viewed article
 * @param {object[]} allArticles  - All articles in the company's KB
 * @param {string}   companyId    - Used as part of the cache key
 * @returns {Promise<string[]>}   - Array of related article IDs
 */
export async function getRecommendations(article, allArticles, companyId) {
  const key = cacheKey(companyId, article.id);
  const cached = readCache(key);
  if (cached) return cached;

  const candidates = allArticles
    .filter(a => a.id !== article.id)
    .map(a => ({ id: a.id, title: a.title, tags: a.tags || [], section: a.section }));

  if (candidates.length === 0) return [];

  const prompt = `Você é um assistente de base de conhecimento empresarial.

Artigo atual:
- Título: "${article.title}"
- Descrição: "${(article.description || '').substring(0, 300)}"
- Tags: ${(article.tags || []).join(', ')}
- Seção: ${article.section}

Artigos disponíveis:
${JSON.stringify(candidates)}

Retorne APENAS um JSON array com os IDs dos 3 artigos mais relevantes e relacionados ao artigo atual, ordenados por relevância decrescente.
Se não houver artigos relacionados, retorne [].
Formato exato: ["id1", "id2", "id3"]`;

  try {
    const text = await generateText(prompt, 'kb_recommender');
    const ids = extractJSONArray(text);
    const result = Array.isArray(ids) ? ids.slice(0, 3) : [];
    writeCache(key, result);
    return result;
  } catch (error) {
    console.error('[kbService.getRecommendations]', error);
    return [];
  }
}

/**
 * Invalidates the cached recommendations for a specific article.
 * Call this when an article is created or updated.
 */
export function invalidateCache(companyId, articleId) {
  try { localStorage.removeItem(cacheKey(companyId, articleId)); } catch {}
}
