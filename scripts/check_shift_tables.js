import { supabase } from '../src/lib/supabase.js';

async function checkTables() {
  console.log("🔍 Verificando Tabelas de Escalas...");
  
  const tables = [
    'work_environments',
    'work_activities',
    'shifts',
    'employee_profiles'
  ];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`❌ Erro na tabela [${table}]:`, error.message);
    } else {
      console.log(`✅ Tabela [${table}] existe.`);
    }
  }
}

checkTables();
