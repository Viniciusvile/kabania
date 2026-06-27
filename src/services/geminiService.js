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

async function getAuthorizedTags(companyId, hub = null) {
  if (!companyId) return 'NENHUMA TAG AUTORIZADA';

  // Check cache first (Key includes hub to avoid pollution)
  const cacheKey = hub ? `${companyId}_${hub}` : companyId;
  const cached = tagsCache.data[cacheKey];
  if (cached && (Date.now() - cached.timestamp < tagsCache.TTL)) {
    console.log(`Using cached tags for IA triage (${hub || 'all'})`);
    return cached.tags;
  }

  try {
    let query = supabase
      .from('knowledge_base')
      .select('title, tags')
      .eq('company_id', companyId)
      .eq('enabled', true);
    
    // Filtro Temático (Thematic Scoping)
    if (hub) {
      query = query.eq('section', hub);
    }

    const { data: items, error } = await query;

    if (error || !items || items.length === 0) return 'NENHUMA TAG AUTORIZADA';

    const allTags = new Set();
    items.forEach(item => {
      allTags.add(item.title);
      if (item.tags) {
        item.tags.forEach(t => allTags.add(t));
      }
    });

    let tagsString = `TAGS AUTORIZADAS DISPONÍVEIS (${hub || 'GERAL'}):\n`;
    allTags.forEach(tag => {
      tagsString += `[TAG: ${tag}]\n`;
    });

    // Update cache
    tagsCache.data[cacheKey] = {
      tags: tagsString,
      timestamp: Date.now()
    };

    return tagsString;
  } catch (e) {
    console.error('Error fetching company knowledge from Supabase:', e);
    return 'NENHUMA TAG AUTORIZADA';
  }
}


// Utility for delays (throttle/backoff)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generic retry wrapper with exponential backoff for 429 errors
 */
async function withRetry(fn, maxRetries = 3) {
  let lastError;
  for (let i = 1; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isQuotaError = error.message?.includes("429") || error.toString().includes("429");
      
      if (isQuotaError && i < maxRetries) {
        const waitTime = i * 2000; // 2s, 4s, 6s...
        console.warn(`[Gemini IA] Quota 429 atingida. Tentativa ${i}/${maxRetries}. Aguardando ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function processTaskWithAI(taskDescription, companyId, isConcise = false, hub = null) {
  return withRetry(async () => {
    // 1. Buscar base de conhecimento autorizada antecipadamente para servir de fallback se necessário
    let authorizedItems = [];
    try {
      if (companyId) {
        let query = supabase
          .from('knowledge_base')
          .select('title, description, tags, section')
          .eq('company_id', companyId)
          .eq('enabled', true);
        
        if (hub) {
          query = query.eq('section', hub);
        }
        
        const { data, error } = await query;
        if (!error && data) {
          authorizedItems = data;
        }
      }
    } catch (dbErr) {
      console.error("Erro ao carregar base de conhecimento para fallback:", dbErr);
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      
      const formattedTags = authorizedItems.length > 0
        ? `BASE DE CONHECIMENTO AUTORIZADA (Temas, Tags e Instruções):\n${authorizedItems.map(item => `Tema: ${item.title}\nTags: ${(item.tags || []).join(', ')}\nInstruções/Resolução: ${item.description}`).join('\n\n')}`
        : 'NENHUMA TAG AUTORIZADA';

      const prompt = `Você é uma IA de triagem e resposta de chamados de suporte técnico.
Sua tarefa é responder à "Mensagem do Usuário" utilizando estritamente a "BASE DE CONHECIMENTO AUTORIZADA" fornecida abaixo.

IMPORTANTE:
1. Analise a Mensagem do Usuário e identifique se ela se refere a um dos Temas ou Tags autorizados na BASE DE CONHECIMENTO AUTORIZADA.
2. Se o assunto da mensagem estiver relacionado a um tema autorizado:
   - Responda à dúvida do usuário baseando-se estritamente nas "Instruções/Resolução" correspondentes àquele tema.
   - Sua resposta deve ser CURTA, DIRETA e OBJETIVA (máximo de 3 sentenças curtas ou uma lista curta de tópicos). Não invente nem adicione detalhes externos.
3. Se o assunto da mensagem NÃO estiver relacionado a nenhuma Tag ou Tema autorizado:
   - Responda APENAS e EXATAMENTE: "Este assunto não está autorizado."
4. Não inclua saudações, introduções longas ou conclusões. Vá direto à resolução.

${formattedTags}

Mensagem do Usuário:
"${taskDescription}"

Resposta curta:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.warn("Erro na API do Gemini, usando fallback local na base de conhecimento:", error);
      
      if (authorizedItems.length === 0) {
        return "Este assunto não está autorizado.";
      }

      // FALLBACK LOCAL INTELIGENTE POR CORRESPONDÊNCIA DE STRINGS E TAGS
      const textToMatch = (taskDescription || '').toLowerCase();
      
      const isWholeWordMatch = (text, tag) => {
        const cleanText = text.toLowerCase().replace(/[^a-zA-Z0-9áàâãéèêíïóôõöúçñ]/g, ' ');
        const cleanTag = tag.toLowerCase().trim();
        const words = cleanText.split(/\s+/);
        
        if (cleanTag.includes(' ')) {
          return cleanText.includes(cleanTag);
        }
        
        return words.includes(cleanTag);
      };

      let bestMatch = null;
      let highestScore = 0;

      for (const item of authorizedItems) {
        let score = 0;
        
        // 1. Tag matching with whole word check
        const tags = item.tags || [];
        tags.forEach(tag => {
          if (tag && isWholeWordMatch(textToMatch, tag)) {
            score += 2;
          }
        });

        // 2. Title word matching (excluding stop words)
        const titleClean = item.title.toLowerCase().replace(/[^a-zA-Z0-9áàâãéèêíïóôõöúçñ]/g, ' ');
        const titleWords = titleClean.split(/\s+/).filter(w => w.length > 3 && !['como', 'para', 'onde', 'este', 'esta', 'tudo', 'mais'].includes(w));
        
        titleWords.forEach(word => {
          if (isWholeWordMatch(textToMatch, word)) {
            score += 1.5;
          }
        });

        // 3. Exact subtitle/phrase matching
        if (textToMatch.includes(item.title.toLowerCase()) || item.title.toLowerCase().includes(textToMatch)) {
          score += 3;
        }

        if (score > highestScore) {
          highestScore = score;
          bestMatch = item;
        }
      }

      // Threshold of 3.5 requires at least a tag and a title word, or a phrase match, etc.
      // to avoid loose single-word matches mapping unrelated items.
      const THRESHOLD = 3.5;
      if (bestMatch && highestScore >= THRESHOLD) {
        return bestMatch.description;
      }

      return "Este assunto não está autorizado.";
    }
  });
}

export async function analyzeProductivity(data, companyName = "Empresa", companyId = null, hub = 'corporativo') {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const authorizedTags = companyId ? await getAuthorizedTags(companyId, hub) : '';

    const prompt = `Você é um consultor executivo de performance para a empresa ${companyName}.
    Analise estes dados de produtividade (Kanban e Atividades):
    ${JSON.stringify(data)}
    
    ${authorizedTags}

    REGRAS DE ANÁLISE:
    1. Se houver "TAGS AUTORIZADAS", sua análise deve obrigatoriamente alinhar-se aos temas autorizados.
    2. Seja extremamente conciso.
    3. Liste 3-4 pontos acionáveis em forma de tópicos curtos.
    4. Use um tom executivo e personalizado para a ${companyName}.
    5. Se identificar itens parados (WIP), sugira "Reunião diária focada em desobstrução".
    6. Se identificar excesso em testes, sugira "Swarming da equipe para acelerar testes".
    7. Não use introduções longas.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Erro na análise: ${error.message}`;
  }
}

export async function generateWeeklySummary(data, companyName = "Empresa", companyId = null, hub = 'corporativo') {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const authorizedTags = companyId ? await getAuthorizedTags(companyId, hub) : '';

    const prompt = `Gere um Resumo Executivo Semanal personalizado para ${companyName} baseado nestas atividades:
    ${JSON.stringify(data)}
    
    ${authorizedTags}

    FORMATO:
    - Se houver "TAGS AUTORIZADAS", foque nos temas listados nelas.
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
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
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

export async function suggestPrioritization(tasks, companyName = "Empresa", companyId = null, hub = 'corporativo') {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const authorizedTags = companyId ? await getAuthorizedTags(companyId, hub) : '';

    const prompt = `Como consultor da ${companyName}, qual deve ser a prioridade #1 deste usuário hoje?
    Dados: ${JSON.stringify(tasks)}
    
    ${authorizedTags}

    REPOSTA: Máximo 3 sentenças curtas e motivadoras, focadas no impacto para a ${companyName} e respeitando os temas autorizados.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Erro na priorização: ${error.message}`;
  }
}

export async function detectBottlenecks(kanbanData, companyName = "Empresa", companyId = null, hub = 'corporativo') {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const authorizedTags = companyId ? await getAuthorizedTags(companyId, hub) : '';

    const prompt = `Identifique 2 gargalos críticos no Kanban da ${companyName} e sugira a solução imediata:
    ${JSON.stringify(kanbanData)}
    
    ${authorizedTags}

    DIRETRIZES DE SOLUÇÃO:
    - Use as TAGS autorizadas para entender o contexto do negócio.
    - Para Itens Bloqueados (WIP paralisado): Sugira "Reunião diária focada exclusivamente em desobstrução e dependências".
    - Para Fila de Testes Saturada: Sugira "Aplique swarming (equipe ajuda nos testes) para acelerar o fluxo".
    
    Responda em no máximo 50 palavras no total, direto ao ponto.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Erro na detecção: ${error.message}`;
  }
}

export async function predictDemand(activities, companyName = "Empresa", companyId = null, hub = 'operacional') {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const authorizedTags = companyId ? await getAuthorizedTags(companyId, hub) : '';

    // Simplificar os dados contextuais para os últimos 30 dias se possível
    const recentActivities = activities.slice(0, 50).map(a => ({
      type: a.type,
      date: a.created_at || a.created
    }));

    const prompt = `Analise o histórico recente de atividades da empresa ${companyName} e preveja a demanda para a próxima semana.
    Dados recentes (máximo 50 itens):
    ${JSON.stringify(recentActivities)}
    
    ${authorizedTags}

    DIRETRIZES:
    - Utilize as categorias autorizadas nas TAGS para fundamentar a previsão.
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
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const authorizedTags = await getAuthorizedTags(companyId, 'operacional');

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
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
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

export async function processKnowledgeFile(extractedText, existingKnowledge = []) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    // Prepare comparison context (titles and tags only)
    const context = existingKnowledge.map(k => ({
      id: k.id,
      title: k.title,
      tags: k.tags
    }));

    const prompt = `Você é um analista de conhecimento sênior. Analise o texto extraído de um arquivo e organize-o para uma Base de Conhecimento.
    
    TEXTO DO ARQUIVO:
    "${extractedText.substring(0, 5000)}" // First 5k chars for analysis
    
    BASE ATUAL (Títulos e Tags): ${JSON.stringify(context)}
    
    REGRAS DE RETORNO:
    1. O sistema possui 3 seções: "company_data" (Empresa), "troubleshooting" (Problemas), "general" (Geral).
    2. Identifique se o conteúdo é similar a algum item já existente na BASE ATUAL.
    3. Se for similar, sugira "merge" e indique o "existingId".
    4. Se for novo, sugira "create".
    5. Gere um Título curto, uma Descrição de 2 frases e 3-4 Tags.
    
    Retorne APENAS um objeto JSON no formato:
    {
      "action": "create" | "merge",
      "existingId": "id_do_item_similar_se_houver",
      "suggested": {
        "title": "Título Curto",
        "description": "Descrição concatenada do que foi aprendido.",
        "section": "company_data" | "troubleshooting" | "general",
        "tags": ["Tag1", "Tag2", "Tag3"]
      },
      "explanation": "Por que escolhi esta ação e categoria?"
    }
    
    RESPOSTA JSON:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error("IA não retornou um JSON válido.");
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Erro ao processar arquivo com IA:", error);
    throw error;
  }
}

export async function processKnowledgeRow(rowData, existingKnowledge = []) {
  const normalizedData = {
    title: (rowData.Tema || rowData.title || rowData.Assunto || rowData.Titulo || rowData.Subject || '').trim(),
    content: (rowData.Conteudo || rowData.description || rowData.Descricao || rowData.Text || rowData.Conteúdo || '').trim(),
    section: (rowData.Categoria || rowData.section || rowData.Seção || rowData.Category || '').trim(),
    tags: (rowData.Tags || rowData.tags || rowData.Etiquetas || '')
  };

  if (!normalizedData.title && !normalizedData.content) {
    console.warn("Linha do CSV ignorada: Título e Conteúdo vazios.");
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    // Prepare comparison context
    const context = existingKnowledge.slice(0, 50).map(k => ({
      id: k.id,
      title: k.title,
      tags: k.tags
    }));

    const prompt = `Analise este item de conhecimento para importar:
    TEMA/TITULO: "${normalizedData.title}"
    CONTEUDO: "${normalizedData.content}"
    CATEGORIA SUGERIDA: "${normalizedData.section}"
    TAGS SUGERIDAS: "${normalizedData.tags}"
    
    BASE ATUAL: ${JSON.stringify(context.map(c => c.title))}
    
    REGRAS:
    1. Se o TEMA/TITULO ou CONTEUDO já existir na BASE ATUAL de forma idêntica ou muito similar, retorne action: "merge".
    2. Se for uma informação nova para a base, retorne action: "create".
    3. Normalize a seção sugerida para um destes: "company_data", "troubleshooting" ou "general".
    4. Gere pelo menos 3 tags relevantes se o campo tags estiver vazio.
    
    IMPORTANTE: Retorne APENAS o JSON no formato abaixo, sem explicações:
    {
      "action": "create" | "merge",
      "existingId": "id_do_item_similar_se_houver",
      "suggested": {
        "title": "Título Normalizado",
        "description": "Conteúdo ou resumo",
        "section": "company_data | troubleshooting | general",
        "tags": ["tag1", "tag2", "tag3"]
      }
    }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.action === 'merge' && !parsed.existingId) {
        const match = existingKnowledge.find(k => k.title.toLowerCase() === normalizedData.title.toLowerCase());
        if (match) parsed.existingId = match.id;
        else parsed.action = 'create';
      }
      return parsed;
    }
  } catch (error) {
    console.warn("Erro ao usar IA para processar linha, usando fallback local:", error);
  }

  // FALLBACK LOCAL AUTOMÁTICO SE A API DO GEMINI FALHAR (EX: CHAVE LEAKED/REVOGADA)
  const match = existingKnowledge.find(k => k.title.toLowerCase() === normalizedData.title.toLowerCase());
  
  let section = 'general';
  const secLower = normalizedData.section.toLowerCase();
  if (secLower.includes('empresa') || secLower.includes('company') || secLower.includes('corporativo') || secLower.includes('dados')) {
    section = 'company_data';
  } else if (secLower.includes('trouble') || secLower.includes('resol') || secLower.includes('suporte') || secLower.includes('ajuda') || secLower.includes('problemas')) {
    section = 'troubleshooting';
  }

  let tags = [];
  if (typeof normalizedData.tags === 'string' && normalizedData.tags.trim()) {
    tags = normalizedData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
  } else if (Array.isArray(normalizedData.tags)) {
    tags = normalizedData.tags;
  }
  if (tags.length === 0) {
    tags = ['Importado'];
  }

  return {
    action: match ? 'merge' : 'create',
    existingId: match ? match.id : undefined,
    suggested: {
      title: normalizedData.title,
      description: normalizedData.content,
      section: section,
      tags: tags
    }
  };
}


export async function analyzeCompanyPerformance(metrics, companyId) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const authorizedTags = await getAuthorizedTags(companyId, 'corporativo');

    const prompt = `Você é um gestor de operações sênior. Analise as métricas de desempenho da empresa:
    - TOTAL DE TAREFAS: ${metrics.totalTasks}
    - TAXA DE CONCLUSÃO: ${metrics.completionRate}%
    - TAREFAS EM PROGRESSO: ${metrics.inProgress}
    - ALERTAS DE PRAZO: ${metrics.deadlineAlerts}
    
    ${authorizedTags}

    REGRAS:
    1. Interprete os números em relação ao contexto das TAGS corporativas.
    2. Identifique o maior risco atual.
    3. Sugira uma ação imediata para o gestor.
    4. Responda em no máximo 150 palavras, tom profissional e encorajador.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Erro na análise de desempenho: ${error.message}`;
  }
}

export async function suggestShiftAssignments(shift, availableEmployees, companyName = "Empresa") {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const context = {
      shift: {
        id: shift.id,
        activity: shift.activity_name,
        environment: shift.environment_name,
        required_role: shift.required_role,
        required_skills: shift.required_skills || []
      },
      candidates: availableEmployees.map(e => ({
        id: e.id,
        name: e.name,
        role: e.role,
        skills: e.skills || [],
        performance: e.performance_notes
      }))
    };

    const prompt = `Como assistente inteligente da ${companyName}, analise qual colaborador é o melhor "Match" para esta escala.
    
    ESCALA: ${JSON.stringify(context.shift)}
    CANDIDATOS: ${JSON.stringify(context.candidates)}
    
    REGRAS:
    1. Priorize quem tem as "required_skills" da atividade.
    2. Verifique se o "role" coincide.
    3. Retorne um ranking dos TOP 3 no formato JSON.
    
    FORMATO DE RETORNO (JSON APENAS):
    {
      "suggestions": [
        {
          "employeeId": "uuid",
          "name": "Nome",
          "matchScore": 0-100,
          "reason": "Explicação curta em português"
        }
      ],
      "strategic_insight": "Uma frase sobre a alocação ideal."
    }
    
    RESPOSTA JSON:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error) {
    console.error("Erro na sugestão de escalas:", error);
    return null;
  }
}

export async function generateShiftInsights(shifts, employees, companyName = "Empresa") {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const context = {
      totalShifts: shifts.length,
      unassigned: shifts.filter(s => s.assigned_count === 0).length,
      distribution: shifts.reduce((acc, s) => {
        acc[s.environment_name] = (acc[s.environment_name] || 0) + 1;
        return acc;
      }, {})
    };

    const prompt = `Gere um Insight de Gestão para a escala de trabalho da ${companyName}.
    DADOS RESUMIDOS: ${JSON.stringify(context)}
    
    REGRAS:
    1. Identifique se há sobrecarga em algum ambiente.
    2. Alerte sobre escalas sem colaboradores.
    3. Responda em no máximo 100 palavras.
    4. Tom executivo e focado em otimização.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Erro ao gerar insights: ${error.message}`;
  }
}

// ──────────────────────────────────────────────────────────────────
// SMART ARTICLE RECOMMENDER — Knowledge Base
// ──────────────────────────────────────────────────────────────────
export async function getRelatedArticles(currentArticle, allArticles) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const candidates = allArticles
      .filter(a => a.id !== currentArticle.id)
      .map(a => ({ id: a.id, title: a.title, tags: a.tags || [], section: a.section }));

    if (candidates.length === 0) return [];

    const prompt = `Você é um assistente de base de conhecimento empresarial.

Artigo atual:
- Título: "${currentArticle.title}"
- Descrição: "${(currentArticle.description || '').substring(0, 300)}"
- Tags: ${(currentArticle.tags || []).join(', ')}
- Seção: ${currentArticle.section}

Artigos disponíveis:
${JSON.stringify(candidates)}

Retorne APENAS um JSON array com os IDs dos 3 artigos mais relevantes e relacionados ao artigo atual, ordenados por relevância decrescente.
Se não houver artigos relacionados, retorne [].
Formato exato: ["id1", "id2", "id3"]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    const ids = JSON.parse(match[0]);
    return Array.isArray(ids) ? ids.slice(0, 3) : [];
  } catch (error) {
    console.error('[getRelatedArticles]', error);
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────
// AI-BASED ESTIMATION — Kanban Cards
// ──────────────────────────────────────────────────────────────────
export async function estimateCardEffort(title, description) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `Você é um especialista em gestão ágil de projetos.

Tarefa Kanban:
- Título: "${title}"
- Descrição: "${(description || 'Sem descrição').substring(0, 500)}"

Com base no título e descrição, estime o esforço necessário.
Responda APENAS com JSON válido no formato:
{"estimate": "2-4h", "complexity": "média", "reasoning": "Uma frase curta explicando o porquê"}

Regras de complexidade:
- baixa: bug fix simples, atualização de texto, ajuste visual → "30min" a "2h"
- média: novo componente, integração de API, lógica de negócio → "2-8h"
- alta: nova feature completa, refactoring, múltiplos sistemas → "1-3d"`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!parsed.estimate || !parsed.complexity) return null;
    return parsed;
  } catch (error) {
    console.error('[estimateCardEffort]', error);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────
// EMAIL AI TAG SUGGESTER
// ──────────────────────────────────────────────────────────────────
export async function suggestEmailTags(subject, body, companyId) {
  return withRetry(async () => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const authorizedTags = await getAuthorizedTags(companyId);

      const prompt = `Você é um assistente de inteligência artificial especializado na classificação e triagem de e-mails corporativos.
Analise o assunto e o corpo do e-mail abaixo e classifique-o cruzando informações com as tags da empresa.

ASSUNTO: "${subject}"
CORPO DO E-MAIL: "${body}"

${authorizedTags}

REGRAS DE RETORNO:
1. Retorne APENAS um objeto JSON válido, sem decorações em markdown ou blocos de código.
2. No campo "suggestedTags", retorne as tags correspondentes às "TAGS AUTORIZADAS DISPONÍVEIS" que combinam com o assunto/conteúdo do e-mail.
3. No campo "additionalTags", sugira outras tags relevantes para categorização geral (ex: "Urgente", "Cobrança", "Dúvida", "Retorno").
4. No campo "category", defina uma classificação (ex: "Suporte", "Financeiro", "Vendas", "Comercial", "Outros").
5. No campo "summary", gere um resumo conciso do e-mail (máximo 12 palavras).
6. No campo "toneAnalysis", identifique o tom do e-mail (ex: "Formal", "Urgente", "Cordial", "Frio").

RESPOSTA JSON MODELO:
{
  "suggestedTags": ["TagAutorizada1"],
  "additionalTags": ["Urgente", "Cobrança"],
  "category": "Financeiro",
  "summary": "Resumo de até 12 palavras aqui.",
  "toneAnalysis": "Formal"
}

RESPOSTA JSON:`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("A IA não retornou um JSON válido.");
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("Erro ao sugerir tags para e-mail:", error);
      throw error;
    }
  });
}

