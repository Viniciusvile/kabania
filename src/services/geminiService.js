import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../supabaseClient';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  console.error("ERRO: VITE_GEMINI_API_KEY não encontrada no arquivo .env");
}
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `Identifique potenciais gargalos neste quadro Kanban (tarefas paradas há muito tempo ou excesso em uma coluna):
    ${JSON.stringify(kanbanData)}
    Responda em português com sugestões de ação.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Erro na detecção: ${error.message}`;
  }
}

export async function analyzeServiceRequest(description, companyId) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const authorizedTags = await getAuthorizedTags(companyId);

    const prompt = `Você é um assistente de triagem inteligente para uma plataforma de gestão de serviços.
    Analise a descrição da solicitação de serviço abaixo e retorne um objeto JSON com sugestões de preenchimento.

    DESCRIÇÃO DA SOLICITAÇÃO:
    "${description}"

    ${authorizedTags}

    REGRAS DE RETORNO:
    1. Retorne APENAS um objeto JSON puro, sem markdown, sem explicações.
    2. O campo "type" DEVE ser exatamente uma das seguintes opções:
       - "Manutenção Preventiva - 45 minutos"
       - "Manutenção Corretiva - 60 minutos" 
       - "Instalação Field Control - 90 minutos"
       - "Instalação de Equipamento - 120 minutos"
       - "Vistoria - 30 minutos"
    3. Campos do JSON:
       - "type": (Obrigatório) Uma das opções acima.
       - "duration": Estimativa em minutos (número inteiro).
       - "priority": "Baixa", "Média", "Alta" ou "Urgente".
       - "kb_suggested_tag": Se a descrição se relacionar com alguma das TAGS AUTORIZADAS, retorne o nome da TAG. Caso contrário, null.
       - "short_summary": Um resumo de no máximo 10 palavras.

    FORMATO DE RESPOSTA EXEMPLO:
    {"type": "Manutenção Corretiva - 60 minutos", "duration": 60, "priority": "Alta", "kb_suggested_tag": "Inadimplência", "short_summary": "Reparo urgente de vazamento no salão."}

    RESPOSTA JSON:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    console.log("Resposta bruta da IA:", text);
    
    // Improved JSON extraction: find the first { and last }
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Não foi possível encontrar JSON na resposta da IA:", text);
      return null;
    }
    
    const cleanJson = jsonMatch[0];
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Erro ao analisar solicitação:", error);
    return null;
  }
}

export async function checkActivityDuplicates(description, existingActivities) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    
    // Send only relevant data to minimize tokens
    const context = existingActivities.slice(0, 10).map(a => ({
      location: a.location,
      desc: a.description || a.title,
      status: a.status
    }));

    const prompt = `Analise se a nova solicitação abaixo é uma duplicata de alguma já existente.
    
    NOVA SOLICITAÇÃO: "${description}"
    
    SOLICITAÇÕES ACTIVAS: ${JSON.stringify(context)}
    
    Retorne um objeto JSON:
    {
      "isDuplicate": boolean,
      "similarityScore": number (0-100),
      "duplicateId": string (se houver),
      "reason": string (curta em português)
    }
    
    Responda apenas o JSON:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const cleanJson = response.text().match(/\{[\s\S]*\}/)?.[0];
    
    if (!cleanJson) return { isDuplicate: false };
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Erro ao verificar duplicidade:", error);
    return { isDuplicate: false };
  }
}
