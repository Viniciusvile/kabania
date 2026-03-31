import fs from 'fs';
import { logger } from '../src/utils/logger.js';
import path from 'path';
import { logger } from '../src/utils/logger.js';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../src/utils/logger.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../src/utils/logger.js';

// 1. Configurações e Caminhos
const OBSIDIAN_VAULT_PATH = 'C:/Users/vinic/Documents/Obsidian Vault/TEste/teste/';
const ENV_PATH = './.env';

// 2. Carregar Variáveis de Ambiente Manualmente (Simulando dotenv para evitar nova dependência)
function loadEnv() {
  const envContent = fs.readFileSync(ENV_PATH, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
  });
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const geminiKey = env.VITE_GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey || !geminiKey) {
  console.error("ERRO: Variáveis de ambiente faltando no .env");
  process.exit(1);
}

// 3. Inicializar Clientes
const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

/**
 * Função principal de processamento
 */
async function syncObsidianToKabania() {
  logger.info('🚀 Iniciando sincronização: Obsidian -> Kabania');
  
  try {
    const files = getMarkdownFiles(OBSIDIAN_VAULT_PATH);
    logger.info(`📂 Encontrados ${files.length} arquivos .md para analisar.`);

    for (const filePath of files) {
      const fileName = path.basename(filePath);
      const rawContent = fs.readFileSync(filePath, 'utf8');

      if (!rawContent.trim() || rawContent.length < 10) continue;

      const { data: metadata, content } = parseFrontmatter(rawContent);
      
      // 🛡️ REGRAS DE SINCRONIZAÇÃO
      // Apenas sincroniza se 'sync: true' estiver no YAML ou se for um Hub da pasta 06_ECOSYSTEM
      const isEcosystemFile = filePath.includes('06_ECOSYSTEM');
      const shouldSync = metadata.sync === 'true' || isEcosystemFile;

      if (!shouldSync) {
        logger.info(`⏩ Ignorando ${fileName} (sem flag sync: true).`);
        continue;
      }

      logger.info(`🔍 Analisando: ${fileName}...`);
      
      const analysis = await analyzeWithAI(content, fileName, metadata);
      
      if (!analysis) continue;

      const { error } = await supabase
        .from('knowledge_base')
        .insert([
          {
            id: `kb-obs-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            title: analysis.title || fileName.replace('.md', ''),
            description: analysis.description,
            section: metadata.category || analysis.section,
            tags: analysis.tags,
            enabled: true,
            company_id: 'co-1773688319348'
          }
        ]);

      if (error) {
        console.error(`❌ Erro ao salvar ${fileName}:`, error.message);
      } else {
        console.log(`✅ [${analysis.section}] ${analysis.title} sincronizado!`);
      }
    }

    logger.info("✨ Sincronização concluída!");

  } catch (error) {
    logger.error(`❌ Erro crítico no script:`, error);
  }
}

/**
 * Busca recursiva de arquivos .md
 */
function getMarkdownFiles(dir, files_ = []) {
  const files = fs.readdirSync(dir);
  for (const i in files) {
    const name = path.join(dir, files[i]);
    if (fs.statSync(name).isDirectory()) {
      if (!files[i].startsWith('.')) getMarkdownFiles(name, files_);
    } else {
      if (name.endsWith('.md')) files_.push(name);
    }
  }
  return files_;
}

/**
 * Parser simples de Frontmatter (YAML)
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
  if (!match) return { data: {}, content };
  
  const yaml = match[1];
  const data = {};
  yaml.split(/\r?\n/).forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join(':').trim();
      data[key] = val;
    }
  });
  
  return { data, content: content.replace(match[0], '').trim() };
}

/**
 * Lógica de IA (Gemini)
 */
async function analyzeWithAI(text, fileName) {
  const prompt = `Você é um analista de conhecimento. Analise o conteúdo desta nota do Obsidian e organize para o sistema Kabania.
  
  CONTEÚDO: "${text.substring(0, 3000)}"
  NOME DO ARQUIVO: "${fileName}"
  
  REGRAS:
  1. Crie um Título curto e profissional.
  2. Classifique em uma destas categorias prioritárias: "operacional", "corporativo", "inteligencia".
  3. Se não se encaixar nos temas acima, use "company_data" ou "general".
  4. Gere 3-4 tags relevantes.
  
  Retorne APENAS um JSON no formato:
  {
    "title": "Título",
    "description": "Resumo de 2 frases",
    "section": "operacional" | "corporativo" | "inteligencia" | "company_data" | "general",
    "tags": ["Tag1", "Tag2"]
  }`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().match(/\{[\s\S]*\}/)?.[0];
    const data = JSON.parse(jsonText);
    
    // Forçar categoria se for um arquivo de Hub
    if (fileName.toLowerCase().includes('operacional')) data.section = 'operacional';
    if (fileName.toLowerCase().includes('corporativo')) data.section = 'corporativo';
    if (fileName.toLowerCase().includes('inteligencia')) data.section = 'inteligencia';
    
    return data;
  } catch (e) {
    console.error("Erro na IA:", e.message);
    return null;
  }
}

// Executar
syncObsidianToKabania();
