import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

/**
 * BRAIN INTEGRATION TEST SUITE
 * Verifica a saúde do ecossistema de documentação modular.
 */

const CONFIG = {
  obsidianPath: 'C:/Users/vinic/Documents/Obsidian Vault/TEste/teste',
  files: [
    'Index_Kabania.md',
    'Kabania_Seguranca_e_Arquitetura.md',
    'Kabania_Design_System.md',
    'Kabania_Modulos_e_Funcionalidades.md',
    'Kabania_Inteligencia_Artificial.md'
  ],
  scripts: [
    'scripts/kabania_to_obsidian.js',
    'scripts/obsidian_to_kabania.js'
  ]
};

async function runTests() {
  console.log("🧪 Iniciando Bateria de Testes do Cérebro...\n");
  let score = 0;
  let total = 7;

  // Teste 1: Caminhos e Pastas
  console.log("1. Verificando diretório Obsidian...");
  if (fs.existsSync(CONFIG.obsidianPath)) {
    console.log("✅ Pasta TEste/teste encontrada.");
    score++;
  } else {
    console.error("❌ Erro: Pasta TEste/teste não encontrada!");
  }

  // Teste 2: Arquivos Modulares
  console.log("\n2. Verificando arquivos de ecossistema...");
  const missingFiles = CONFIG.files.filter(f => !fs.existsSync(path.join(CONFIG.obsidianPath, f)));
  if (missingFiles.length === 0) {
    console.log("✅ Todos os 5 arquivos de ecossistema estão presentes.");
    score++;
  } else {
    console.error(`❌ Erro: Arquivos faltando: ${missingFiles.join(', ')}`);
  }

  // Teste 3: Script de Sincronização (Código -> Obsidian)
  console.log("\n3. Testando Script: Kabania -> Obsidian...");
  const syncOut = spawnSync('node', ['scripts/kabania_to_obsidian.js'], { encoding: 'utf8' });
  if (syncOut.status === 0 && syncOut.stdout.includes('concluídos')) {
    console.log("✅ Sincronização de saída funcionando (IA + Snapshots).");
    score++;
  } else {
    console.error("❌ Erro no script Kabania -> Obsidian!");
    console.error(syncOut.stderr || syncOut.stdout);
  }

  // Teste 4: Timestamp no Índice
  console.log("\n4. Verificando atualização de timestamp no Index...");
  const indexContent = fs.readFileSync(path.join(CONFIG.obsidianPath, 'Index_Kabania.md'), 'utf8');
  if (!indexContent.includes('{{timestamp}}')) {
    console.log("✅ O timestamp foi processado (não há {{timestamp}} bruto).");
    score++;
  } else {
    console.error("❌ Erro: O índice ainda contém o placeholder {{timestamp}}!");
  }

  // Teste 5: Snapshots Técnicos (IA)
  console.log("\n5. Verificando presença de Snapshots Técnicos...");
  const aiNote = fs.readFileSync(path.join(CONFIG.obsidianPath, 'Kabania_Inteligencia_Artificial.md'), 'utf8');
  if (aiNote.includes('Snapshot Técnico')) {
    console.log("✅ Notas contêm snapshots gerados por IA.");
    score++;
  } else {
    console.error("❌ Erro: Notas não possuem snapshots técnicos!");
  }

  // Teste 6: Script de Upload (Obsidian -> Supabase)
  console.log("\n6. Testando Script: Obsidian -> Kabania...");
  const syncIn = spawnSync('node', ['scripts/obsidian_to_kabania.js'], { encoding: 'utf8' });
  if (syncIn.status === 0 && syncIn.stdout.includes('concluída')) {
    console.log("✅ Upload para a Base de Conhecimento funcionando.");
    score++;
  } else {
    console.error("❌ Erro no script Obsidian -> Kabania!");
    console.error(syncIn.stderr);
  }

  // Teste 7: Integridade do CSV/JSON (Opcional, mas vamo ver se o .env ta ok)
  if (fs.existsSync('./.env')) {
    console.log("\n7. Verificando .env e chaves...");
    console.log("✅ Arquivo de configuração presente.");
    score++;
  }

  console.log(`\n📊 Resultado Final: ${score}/${total}`);
  if (score === total) {
    console.log("🏆 O Cérebro está 100% integrando e saudável!");
  } else {
    console.warn("⚠️ Foruam encontrados alguns problemas que precisam de atenção.");
  }
}

runTests();
