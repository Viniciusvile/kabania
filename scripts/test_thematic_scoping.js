import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// 1. Carregar Variáveis do .env
const env = fs.readFileSync('./.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k.trim()] = v.trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const companyId = 'co-1773688319348';

/**
 * Versão simplificada da lógica do geminiService para teste
 */
async function getTagsTest(hub = null) {
  let query = supabase
    .from('knowledge_base')
    .select('title, section')
    .eq('company_id', companyId)
    .eq('enabled', true);
  
  if (hub) query = query.eq('section', hub);

  const { data: items, error } = await query;
  if (error) throw error;

  return items;
}

async function runTests() {
  console.log("🚀 Iniciando Testes de Escalonamento Temático...");

  // Teste 1: Geral (Sem Hub)
  const all = await getTagsTest();
  console.log(`\n📊 Teste 1 (Sem Hub): Retornou ${all.length} itens.`);
  
  // Teste 2: Hub Operacional
  const oper = await getTagsTest('operacional');
  console.log(`\n⚙️ Teste 2 (Hub Operacional): Retornou ${oper.length} itens.`);
  const hasCorpInOper = oper.some(i => i.section === 'corporativo');
  console.log(hasCorpInOper ? "❌ FALHA: Encontrou item corporativo no operacional." : "✅ SUCESSO: Apenas itens operacionais filtrados.");

  // Teste 3: Hub Corporativo
  const corp = await getTagsTest('corporativo');
  console.log(`\n💼 Teste 3 (Hub Corporativo): Retornou ${corp.length} itens.`);
  const hasOperInCorp = corp.some(i => i.section === 'operacional');
  console.log(hasOperInCorp ? "❌ FALHA: Encontrou item operacional no corporativo." : "✅ SUCESSO: Apenas itens corporativos filtrados.");

  console.log("\n✨ Testes finalizados.");
}

runTests();
