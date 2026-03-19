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


export async function processTaskWithAI(taskDescription, companyId, isConcise = false, hub = null) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const authorizedTags = await getAuthorizedTags(companyId, hub);
    
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
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    // Normalize row data for better AI interpretation
    const normalizedData = {
      title: rowData.Tema || rowData.title || rowData.Assunto || rowData.Titulo || rowData.Subject || '',
      content: rowData.Conteudo || rowData.description || rowData.Descricao || rowData.Text || rowData.Conteúdo || '',
      section: rowData.Categoria || rowData.section || rowData.Seção || rowData.Category || '',
      tags: rowData.Tags || rowData.tags || rowData.Etiquetas || ''
    };

    if (!normalizedData.title && !normalizedData.content) {
      console.warn("Linha do CSV ignorada: Título e Conteúdo vazios.");
      return null;
    }
    
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
    
    if (!jsonMatch) {
      console.error("IA não retornou JSON para a linha:", text);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Final safety check: if it's merge, we need the ID. 
    // If ID is missing, try to find by title match in local context
    if (parsed.action === 'merge' && !parsed.existingId) {
      const match = context.find(k => k.title.toLowerCase() === normalizedData.title.toLowerCase());
      if (match) parsed.existingId = match.id;
      else parsed.action = 'create';
    }

    return parsed;
  } catch (error) {
    console.error("Erro ao processar linha:", error);
    return null;
  }
}

export async function analyzeCompanyStructure(members, collaborators, companyId) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const authorizedTags = await getAuthorizedTags(companyId, 'company_data');

    const prompt = `Você é um consultor de RH e estrutura organizacional. Analise a composição da equipe do Kabania:
    - MEMBROS (Gestão/Admin): ${members.length}
    - COLABORADORES (Campo/Operacional): ${collaborators.length}
    - LISTA DE ESPECIALIDADES: ${JSON.stringify(collaborators.map(c => c.specialty))}
    
    ${authorizedTags}

    REGRAS:
    1. Analise se a proporção Gestão vs Campo está equilibrada.
    2. Com base nas TAGS de "company_data", sugira 1 especialidade que pode estar faltando.
    3. Responda em no máximo 3 frases curtas e diretas.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return `Erro na análise estrutural: ${error.message}`;
  }
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
