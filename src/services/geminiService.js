import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../supabaseClient';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

async function getAuthorizedTags(companyId) {
  if (!companyId) return 'NENHUMA TAG AUTORIZADA';

  try {
    const { data: items, error } = await supabase
      .from('knowledge_base')
      .select('title, tags')
      .eq('company_id', companyId)
      .eq('enabled', true);

    if (error || !items || items.length === 0) return 'NENHUMA TAG AUTORIZADA';

    const allTags = new Set();
    items.forEach(item => {
      allTags.add(item.title);
      if (item.tags) {
        item.tags.forEach(t => allTags.add(t));
      }
    });

    let tagsString = 'TAGS AUTORIZADAS DISPONÍVEIS:\n';
    allTags.forEach(tag => {
      tagsString += `[TAG: ${tag}]\n`;
    });
    return tagsString;
  } catch (e) {
    console.error('Error fetching company knowledge from Supabase:', e);
    return 'NENHUMA TAG AUTORIZADA';
  }
}


export async function processTaskWithAI(taskDescription, companyId, isConcise = false) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const authorizedTags = await getAuthorizedTags(companyId);
    
    const prompt = `Você é uma IA que responde perguntas usando dados vindos de uma API externa de conhecimento.

IMPORTANTE: Existe um sistema de TAGS que controla quais assuntos podem ser respondidos.

REGRAS DE FUNCIONAMENTO
1. A Base de Conhecimento contém apenas TAGS de autorização de tema.
2. Cada TAG representa um assunto que está autorizado para resposta.
3. Quando o usuário fizer uma pergunta, você deve:
   - PASSO 1: Identificar o tema principal da pergunta.
   - PASSO 2: Verificar se existe uma TAG correspondente ou logicamente relacionada a esse tema na lista de "TAGS AUTORIZADAS DISPONÍVEIS".
   - PASSO 3:
     * SE EXISTIR TAG AUTORIZADA: Responda de forma CURTA e DIRETA.
       REQUISITO DE FORMATO: Forneça uma resposta de no máximo 3 sentenças curtas ou uma lista de tópicos. Seja objetivo.
     * SE NÃO EXISTIR TAG AUTORIZADA: Responda APENAS: "Este assunto não está autorizado."
4. As TAGS não contêm informação, apenas controle de acesso.
5. Nunca ignore o sistema de TAGS.
6. Vá direto ao ponto, evite introduções longas.

${authorizedTags}

Mensagem do Usuário:
"${taskDescription}"

Resposta curta:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Erro na API do Gemini:", error);
    
    // Check if it is a 429 Rate Limit error
    if (error.message && error.message.includes("429")) {
      return "⚠️ Limite de requisições (Quota) atingido. Por favor, aguarde um momento e tente novamente.";
    }
    
    return `Ocorreu um erro: ${error.message || error.toString()}.`;
  }
}

export async function analyzeProductivity(data) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Você é um analista de produtividade especialista em Kanban. 
    Analise os seguintes dados e sugira 3 melhorias de processo:
    ${JSON.stringify(data)}
    Responda em português, de forma executiva e profissional.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Erro na análise: ${error.message}`;
  }
}

export async function generateWeeklySummary(data) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Gere um resumo semanal das atividades desta empresa para um relatório de diretoria:
    ${JSON.stringify(data)}
    Destaque as conclusões e pontos de atenção. Responda em português.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Erro no resumo: ${error.message}`;
  }
}

export async function suggestPrioritization(tasks) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Com base nestas tarefas do usuário, qual deve ser a prioridade #1 para hoje e por quê?
    ${JSON.stringify(tasks)}
    Considere prazos e importância. Responda de forma curta e motivadora em português.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Erro na priorização: ${error.message}`;
  }
}

export async function detectBottlenecks(kanbanData) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Identifique potenciais gargalos neste quadro Kanban (tarefas paradas há muito tempo ou excesso em uma coluna):
    ${JSON.stringify(kanbanData)}
    Responda em português com sugestões de ação.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Erro na detecção: ${error.message}`;
  }
}
