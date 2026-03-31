import fs from 'fs';
import path from 'path';
import { logger } from '../src/utils/logger.js';

/**
 * KABANIA MODULAR SYNC: ADVANCED EDITION
 * Sincroniza informações profundas do código para o ecossistema Obsidian.
 */

logger.info('🚀 Iniciando sincronização Kabania → Obsidian (modo incremental)');
logger.info('🚀 Iniciando sincronização Kabania → Obsidian (modo incremental)');
const MAP = {
  INDEX: path.join(OBSIDIAN_BASE, 'Index_Kabania.md'),
  SECURITY: path.join(OBSIDIAN_BASE, 'Kabania_Seguranca_e_Arquitetura.md'),
  DESIGN: path.join(OBSIDIAN_BASE, 'Kabania_Design_System.md'),
  MODULES: path.join(OBSIDIAN_BASE, 'Kabania_Modulos_e_Funcionalidades.md'),
  AI: path.join(OBSIDIAN_BASE, 'Kabania_Inteligencia_Artificial.md'),
};

const DATABASE_FOLDER = './database';
const SERVICES_FOLDER = './src/services';
const STYLES_FILE = './src/index.css';

// 2. Carregar Credenciais
function loadEnv() {
  const envContent = fs.readFileSync('./.env', 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
  });
  return env;
}

const env = loadEnv();
const genAI = new GoogleGenerativeAI(env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

async function deepModularSync() {
  logger.info('🚀 Iniciando Sincronização Profunda de Ecossistemas...');

  try {
    const timestamp = new Date().toLocaleString('pt-BR');

    // A. Atualizar Índice
    let indexContent = fs.readFileSync(MAP.INDEX, 'utf8');
    indexContent = indexContent.replace(/Última Varredura\*\*: .*/, `Última Varredura**: ${timestamp}`);
    fs.writeFileSync(MAP.INDEX, indexContent);

    // A. Coletar Dados de Alta Densidade
    const securityFull = fs.readFileSync(path.join(DATABASE_FOLDER, 'inventory_optimization.sql'), 'utf8');
    const modulesFile = fs.readFileSync(path.join('./src/components/Inventory', 'InventoryModule.jsx'), 'utf8');
    const aiMethods = fs.readFileSync(path.join(SERVICES_FOLDER, 'geminiService.js'), 'utf8');
    const cssVars = fs.readFileSync(path.join('./src/components/Inventory', 'InventoryModule.css'), 'utf8');

    // B. Prompt de Arquiteto para Múltiplas Saídas
    const prompt = `Você é um Analista de Documentação Técnica Sênior. Gere atualizações EXTREMAMENTE TÉCNICAS para as 4 seções abaixo do Projeto Kabania. 
    Lembre-se: Use detalhes de código, destaque a Otimização de Performance (RLS STABLE) e o Cache Instantâneo (Instant Hydration via localStorage).
    
    DADOS DE ENTRADA:
    SEGURANÇA E BANCO: ${securityFull.substring(0, 1500)}
    MODULOS (Inventory): ${modulesFile.substring(0, 1500)}
    IA (Methods): ${aiMethods.substring(0, 1000)}
    DESIGN (CSS Premium): ${cssVars.substring(0, 1000)}
    
    RETORNE EM BLOCOS SEPARADOS POR '###SEP###' na ordem: SEGURANÇA, DESIGN, MÓDULOS, IA.`;

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    const parts = content.split('###SEP###');

    if (parts.length >= 4) {
      fs.appendFileSync(MAP.SECURITY, `\n\n## 🔄 Snapshot Técnico (${timestamp})\n${parts[0].trim()}`);
      fs.appendFileSync(MAP.DESIGN, `\n\n## 🔄 Snapshot Técnico (${timestamp})\n${parts[1].trim()}`);
      fs.appendFileSync(MAP.MODULES, `\n\n## 🔄 Snapshot Técnico (${timestamp})\n${parts[2].trim()}`);
      fs.appendFileSync(MAP.AI, `\n\n## 🔄 Snapshot Técnico (${timestamp})\n${parts[3].trim()}`);
      
      logger.info('✅ Backup e Sincronização de alta densidade concluídos!');
    } else {
      logger.warn('⚠️ IA não retornou o número esperado de blocos. Sincronização parcial realizada.');
    }

  } catch (err) {
    logger.error(`❌ Erro na sincronização profunda: ${err.message}`);
  }
}

deepModularSync();
