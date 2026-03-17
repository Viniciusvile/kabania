import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../supabaseClient';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  console.error("ERRO: VITE_GEMINI_API_KEY não encontrada no arquivo .env");
}
const genAI = new GoogleGenerativeAI(API_KEY);

// Basic in-memory cache for authorized tags to speed up IA requests
const tagsCache = {
  data: {}, // companyId -> { tags: string, timestamp: number }
  TTL: 1000 * 60 * 5 // 5 minutes
};

async function getAuthorizedTags(companyId) {
  if (!companyId) return 'NENHUMA TAG AUTORIZADA';

  // Check cache first
  const cached = tagsCache.data[companyId];
  if (cached && (Date.now() - cached.timestamp < tagsCache.TTL)) {
    console.log("Using cached tags for IA triage");
    return cached.tags;
  }

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

    // Update cache
    tagsCache.data[companyId] = {
      tags: tagsString,
      timestamp: Date.now()
    };

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

export async function analyzeProductivity(data, companyName = "Empresa") {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Você é um consultor executivo de performance para a empresa ${companyName}.
    Analise estes dados de produtividade (Kanban e Atividades):
    ${JSON.stringify(data)}
    
    REGRAS:
    1. Seja extremamente conciso.
    2. Liste 3-4 pontos acionáveis em forma de tópicos curtos.
    3. Use um tom executivo e personalizado para a ${companyName}.
    4. Se identificar itens parados (WIP), sugira "Reunião diária focada em desobstrução".
    5. Se identificar excesso em testes, sugira "Swarming da equipe para acelerar testes".
    6. Não use introduções longas.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Erro na análise: ${error.message}`;
  }
}

export async function generateWeeklySummary(data, companyName = "Empresa") {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Gere um Resumo Executivo Semanal personalizado para ${companyName} baseado nestas atividades:
    ${JSON.stringify(data)}
    
    FORMATO:
    - Um parágrafo curto de 3 linhas com o status geral.
    - 3 destaques principais em tópicos.
    - Tom profissional e direto.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Erro no resumo: ${error.message}`;
  }
}

export async function generateOperationFeedSummary(notifications, companyName = "Empresa") {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Você é a IA assistente do Centro de Comando da operação da empresa ${companyName}.
    Aqui estão os eventos recentes:
    ${JSON.stringify(notifications)}
    
    Escreva um resumo narrativo CURTO (máximo 3 frases) do que está acontecendo na operação.
    Exemplo de tom: "A equipe finalizou 5 instalações hoje, porém existem 2 novas vistorias urgentes pendentes de atenção."
    Vá direto ao ponto. Não use formatação em markdown, use texto corrido.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Não foi possível gerar o resumo da operação agora: ${error.message}`;
  }
}

export async function suggestPrioritization(tasks, companyName = "Empresa") {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Como consultor da ${companyName}, qual deve ser a prioridade #1 deste usuário hoje?
    Dados: ${JSON.stringify(tasks)}
    
    REPOSTA: Máximo 3 sentenças curtas e motivadoras, focadas no impacto para a ${companyName}.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Erro na priorização: ${error.message}`;
  }
}

export async function detectBottlenecks(kanbanData, companyName = "Empresa") {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Identifique 2 gargalos críticos no Kanban da ${companyName} e sugira a solução imediata:
    ${JSON.stringify(kanbanData)}
    
    DIRETRIZES DE SOLUÇÃO:
    - Para Itens Bloqueados (WIP paralisado): Sugira "Reunião diária focada exclusivamente em desobstrução e dependências".
    - Para Fila de Testes Saturada: Sugira "Aplique swarming (equipe ajuda nos testes) para acelerar o fluxo".
    
    Responda em no máximo 50 palavras no total, direto ao ponto.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Erro na detecção: ${error.message}`;
  }
}

export async function predictDemand(activities, companyName = "Empresa") {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Simplificar os dados contextuais para os últimos 30 dias se possível
    const recentActivities = activities.slice(0, 50).map(a => ({
      type: a.type,
      date: a.created_at || a.created
    }));

    const prompt = `Analise o histórico recente de atividades da empresa ${companyName} e preveja a demanda para a próxima semana.
    Dados recentes (máximo 50 itens):
    ${JSON.stringify(recentActivities)}
    
    DIRETRIZES:
    - Identifique qual "Tipo de Serviço" sofrerá maior demanda.
    - Dê uma explicação curta do motivo (padrões observados).
    - Sugira 1 ação preventiva (ex: "Alocar mais técnicos para X").
    
    FORMATO:
    - 3 frases curtas e diretas.
    - Tom executivo e focado em ação preventiva.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Erro na previsão: ${error.message}`;
  }
}

export async function analyzeServiceRequest(description, companyId) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
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
