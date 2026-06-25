/**
 * Etapa 4 - Introducao e Resultados Esperados
 * Mesma estrutura/tipografia das etapas anteriores (build_etapa1.cjs)
 */
const fs = require("fs");
const path = require("path");

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageBreak, PageNumber
} = require("docx");

const BASE = "C:\\Users\\vinic\\Desktop\\kabania\\meuTcc";
const OUT = path.join(BASE, "TCC_Etapa4_Introducao_Resultados_Esperados.docx");
const STATS = JSON.parse(fs.readFileSync(path.join(BASE, "monte_carlo_stats.json"), "utf8"));
const fmt = v => Number(v).toFixed(1).replace(".", ",");

const FONT = "Times New Roman";

function p(text, opts = {}) {
  const { bold = false, italic = false, size = 24, align = AlignmentType.JUSTIFIED,
    spacingAfter = 0, spacingBefore = 0, indent = false, lineSpacing = 360 } = opts;
  return new Paragraph({
    alignment: align,
    spacing: { before: spacingBefore, after: spacingAfter, line: lineSpacing },
    indent: indent ? { firstLine: 720 } : undefined,
    children: [new TextRun({ text, bold, italics: italic, size, font: FONT })]
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, alignment: AlignmentType.LEFT,
    spacing: { before: 480, after: 360, line: 360 }, pageBreakBefore: true,
    children: [new TextRun({ text, bold: true, size: 28, font: FONT })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2, alignment: AlignmentType.LEFT,
    spacing: { before: 360, after: 240, line: 360 },
    children: [new TextRun({ text, bold: true, size: 26, font: FONT })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3, alignment: AlignmentType.LEFT,
    spacing: { before: 280, after: 180, line: 360 },
    children: [new TextRun({ text, bold: true, italics: true, size: 24, font: FONT })]
  });
}

function num(text) {
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    spacing: { line: 360, after: 60 }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, size: 24, font: FONT })]
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { line: 360, after: 60 }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, size: 24, font: FONT })]
  });
}

function ref(text) {
  return new Paragraph({
    spacing: { line: 280, after: 200 }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, size: 24, font: FONT })]
  });
}

function blank(n = 1) { return Array.from({ length: n }, () => p("")); }

// Tabela helper
const borda = { style: BorderStyle.SINGLE, size: 4, color: "333333" };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };
function celula(text, opts = {}) {
  const { bold = false, header = false, align = AlignmentType.LEFT, width = 2340 } = opts;
  return new TableCell({
    borders: bordas, width: { size: width, type: WidthType.DXA },
    shading: header ? { fill: "1E2761", type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 90, bottom: 90, left: 110, right: 110 },
    children: [new Paragraph({
      alignment: align, spacing: { line: 280 },
      children: [new TextRun({ text, bold: bold || header, color: header ? "FFFFFF" : "000000", size: 22, font: FONT })]
    })]
  });
}
function legendaTabela(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, size: 22, font: FONT })] });
}
function fonteTabela(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 240 },
    children: [new TextRun({ text, italics: true, size: 20, font: FONT })] });
}

const conteudo = [];

// ============ CAPA ============
conteudo.push(
  p("UNIVERSIDADE PAULISTA – UNIP", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 240 }),
  p("CURSO DE CIÊNCIA DA COMPUTAÇÃO", { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 720 }),
  ...blank(6),
  p("VINICIUS VILELA RUFINI", { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 720 }),
  ...blank(5),
  p("O PARADIGMA DO KANBAN SEMÂNTICO:", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 120 }),
  p("OTIMIZAÇÃO DE PERFORMANCE OPERACIONAL ATRAVÉS DO MECANISMO KANBAN IA COM CONTEXTUALIZAÇÃO AUTÔNOMA VIA LLMs E CONTROLE DE ACESSO POR TAGS (RLS)",
    { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 480 }),
  ...blank(2),
  p("ETAPA 4 – INTRODUÇÃO E RESULTADOS ESPERADOS", { align: AlignmentType.CENTER, bold: true, italic: true, size: 24, spacingAfter: 480 }),
  ...blank(6),
  p("SÃO PAULO", { align: AlignmentType.CENTER, bold: true, size: 24, spacingAfter: 120 }),
  p("2026", { align: AlignmentType.CENTER, bold: true, size: 24 }),
  new Paragraph({ children: [new PageBreak()] })
);

// ============ FOLHA DE ROSTO ============
conteudo.push(
  p("VINICIUS VILELA RUFINI", { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 720 }),
  ...blank(5),
  p("O PARADIGMA DO KANBAN SEMÂNTICO:", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 120 }),
  p("OTIMIZAÇÃO DE PERFORMANCE OPERACIONAL ATRAVÉS DO MECANISMO KANBAN IA COM CONTEXTUALIZAÇÃO AUTÔNOMA VIA LLMs E CONTROLE DE ACESSO POR TAGS (RLS)",
    { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 720 }),
  ...blank(4),
  new Paragraph({
    alignment: AlignmentType.RIGHT, indent: { left: 4500 }, spacing: { line: 280 },
    children: [new TextRun({
      text: "Etapa 4 – Introdução e Resultados Esperados do Trabalho de Conclusão de Curso, apresentada à Universidade Paulista – UNIP como requisito parcial para obtenção do título de Bacharel em Ciência da Computação. Documento submetido à apreciação do(a) orientador(a).",
      size: 22, font: FONT
    })]
  }),
  blank(1)[0],
  new Paragraph({
    alignment: AlignmentType.RIGHT, indent: { left: 4500 }, spacing: { line: 280 },
    children: [new TextRun({ text: "Orientador(a): Prof(a). [Nome do Orientador]", size: 22, font: FONT })]
  }),
  ...blank(10),
  p("SÃO PAULO", { align: AlignmentType.CENTER, bold: true, size: 24, spacingAfter: 120 }),
  p("2026", { align: AlignmentType.CENTER, bold: true, size: 24 }),
  new Paragraph({ children: [new PageBreak()] })
);

// ============ SUMARIO ============
conteudo.push(
  p("SUMÁRIO", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 360 }),
  p("1 INTRODUÇÃO ......................................................................................................... 4"),
  p("1.1 Contextualização do Problema ........................................................................... 4"),
  p("1.2 Objetivos ............................................................................................................. 5"),
  p("1.2.1 Objetivo Geral ................................................................................................... 5"),
  p("1.2.2 Objetivos Específicos ........................................................................................ 5"),
  p("1.3 Justificativa .......................................................................................................... 6"),
  p("1.4 Metodologia ......................................................................................................... 7"),
  p("1.5 Estrutura do Trabalho .......................................................................................... 8"),
  p("2 RESULTADOS ESPERADOS .............................................................................. 9"),
  p("2.1 Hipóteses de Pesquisa ......................................................................................... 9"),
  p("2.2 Resultados Esperados quanto aos Tempos Operacionais ................................. 9"),
  p("2.3 Resultados Esperados quanto a SLA e First Contact Resolution ................... 10"),
  p("2.4 Resultados Esperados quanto à Eficiência Computacional ............................ 11"),
  p("2.5 Resultados Esperados quanto ao Retorno Financeiro ..................................... 11"),
  p("2.6 Validação Preliminar e Síntese das Expectativas .......................................... 12"),
  p("REFERÊNCIAS .................................................................................................... 13"),
  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 1 INTRODUCAO
// ============================================================
conteudo.push(h1("1 INTRODUÇÃO"));

conteudo.push(h2("1.1 Contextualização do Problema"));
conteudo.push(
  p("As empresas prestadoras de serviços que operam em múltiplos turnos — tais como Centrais de Serviços Compartilhados (CSC), operações logísticas e suporte técnico — convivem com um paradoxo silencioso: ainda que adotem metodologias ágeis visuais, como o Kanban, continuam expostas a perdas significativas de produtividade decorrentes do tempo gasto pelos operadores na busca por informação. Manuais corporativos, procedimentos operacionais padrão (POPs) e regras de negócio frequentemente residem em repositórios desconexos, planilhas avulsas ou exigem o acionamento de supervisores e áreas adjacentes, gerando interrupções que rompem o fluxo de trabalho.",
    { indent: true, spacingAfter: 200 }),
  p("Esse fenômeno, designado nesta pesquisa como Gargalo Cognitivo, traduz-se em tempo de espera oculta (Wait Time), em desvios de qualidade na execução das tarefas e, sobretudo, em quebras recorrentes de Service Level Agreements (SLAs), com consequente exposição a multas contratuais e à corrosão da confiança dos clientes corporativos. Estudos consolidados, como o relatório clássico da IDC conduzido por Feldman e Sherman (2004), apontam que trabalhadores do conhecimento despendem entre 15% e 30% de sua jornada apenas localizando informações descentralizadas.",
    { indent: true, spacingAfter: 200 }),
  p("O Kanban tradicional, embora eficaz para dar visibilidade ao fluxo e limitar o trabalho em progresso (WIP), opera de forma passiva: o cartão informa o estado da tarefa, mas não injeta conhecimento operacional no momento da execução. A presente pesquisa parte da premissa de que essa passividade pode — e deve — ser superada pela integração nativa de Inteligência Artificial Generativa ao ciclo de vida do cartão, desde que respaldada por mecanismos sólidos de segurança multilocatário. Surge, assim, a proposta do Mecanismo Kanban IA, objeto central deste trabalho.",
    { indent: true })
);

conteudo.push(h2("1.2 Objetivos"));
conteudo.push(h3("1.2.1 Objetivo Geral"));
conteudo.push(p(
  "Conceber, implementar e validar o Mecanismo Kanban IA como evolução arquitetural do Kanban Tradicional, demonstrando, por meio de simulação computacional de eventos discretos com replicação Monte Carlo, sua superioridade na redução do Cycle Time e na elevação das taxas de cumprimento de SLAs e de First Contact Resolution em operações corporativas multiturno.",
  { indent: true }
));

conteudo.push(h3("1.2.2 Objetivos Específicos"));
conteudo.push(p("Para que o objetivo geral seja integralmente atingido, foram delineados os seguintes objetivos específicos:", { indent: true, spacingAfter: 120 }));
conteudo.push(
  num("Caracterizar, com base na literatura especializada (ANDERSON, 2010; REINERTSEN, 2009), os componentes de tempo (Wait Time, Touch Time, Cycle Time e Lead Time) que compõem o ciclo de execução de uma tarefa em um sistema Kanban Tradicional."),
  num("Projetar a arquitetura lógica do Mecanismo Kanban IA, descrevendo a sinergia entre o backend Supabase/PostgreSQL, o frontend React/Vite, a camada de Row Level Security (RLS) e a integração com a API do Google Gemini, formalizada por meio de diagramas UML."),
  num("Implementar um simulador de eventos discretos em Node.js capaz de gerar amostras estatísticas comparáveis entre o Kanban Tradicional e o Mecanismo Kanban IA, executando ao menos 30 réplicas independentes para fins de inferência estatística."),
  num("Mensurar, sobre amostras de 100 cartões operacionais por réplica, os ganhos relativos nas dimensões de tempo, conformidade de SLA, FCR e consumo de tokens, submetendo as diferenças a teste t pareado bilateral."),
  num("Traduzir os ganhos técnicos em projeções financeiras de Return on Investment (ROI), fornecendo argumentos quantitativos para a defesa acadêmica e para a adoção corporativa do produto.")
);

conteudo.push(h2("1.3 Justificativa"));
conteudo.push(
  p("A presente pesquisa justifica-se sob três dimensões complementares: acadêmica, tecnológica e socioeconômica.",
    { indent: true, spacingAfter: 200 }),
  p("Do ponto de vista acadêmico, há uma escassez de trabalhos brasileiros que conjuguem, em um mesmo artefato, métodos ágeis de gestão visual (Kanban), arquiteturas de Inteligência Artificial generativa (Large Language Models) e mecanismos de segurança relacional em nível de linha (Row Level Security). A literatura nacional tende a tratar esses temas de forma isolada, deixando lacunas na compreensão de como suas sinergias se traduzem em ganho operacional mensurável.",
    { indent: true, spacingAfter: 200 }),
  p("Do ponto de vista tecnológico, a popularização dos Large Language Models e das arquiteturas de Retrieval-Augmented Generation (RAG), conforme descrito por Lewis et al. (2020), inaugurou uma nova geração de assistentes capazes de transformar texto bruto em prescrições acionáveis. Contudo, sua adoção em ambientes corporativos esbarra em dois desafios críticos: o custo computacional por tokens consumidos a cada requisição e o risco de exposição indevida de dados sensíveis entre clientes em arquiteturas multilocatário. O Mecanismo Kanban IA propõe endereçar simultaneamente essas frentes, combinando a indexação semântica do conhecimento corporativo por meio de Tags de Autorização Temática com as políticas nativas de RLS do PostgreSQL.",
    { indent: true, spacingAfter: 200 }),
  p("Do ponto de vista socioeconômico, projeções preliminares da modelagem indicam economia potencial superior a um milhão de reais anuais para uma empresa de médio porte que processe mil chamados mensais. Trata-se, portanto, de uma contribuição com potencial de aplicação direta no tecido produtivo brasileiro, especialmente em segmentos intensivos em atendimento e suporte técnico.",
    { indent: true })
);

conteudo.push(h2("1.4 Metodologia"));
conteudo.push(
  p("A presente pesquisa adota uma abordagem mista que combina pesquisa bibliográfica, pesquisa-ação na construção do artefato de software e validação empírica por meio de simulação computacional.",
    { indent: true, spacingAfter: 200 }),
  p("A pesquisa bibliográfica apoia-se em cinco eixos temáticos: métodos ágeis e métricas Kanban (ANDERSON, 2010; REINERTSEN, 2009); custo organizacional da busca por informação (FELDMAN; SHERMAN, 2004; CHOO, 2003); arquiteturas de IA Generativa com recuperação aumentada (LEWIS et al., 2020; MIN et al., 2022); segurança em bancos de dados relacionais multilocatário (CHONG; CARRARO, 2006; POSTGRESQL GLOBAL DEVELOPMENT GROUP, 2025); e simulação computacional de eventos discretos (BANKS et al., 2010).",
    { indent: true, spacingAfter: 200 }),
  p("A construção do artefato segue o modelo de pesquisa-ação aplicada ao desenvolvimento de software, com implementação em pilha tecnológica moderna: React.js com Vite no frontend, Supabase/PostgreSQL no backend, hospedagem na Vercel Edge Network e integração com a API do Google Gemini para geração de prescrições contextuais.",
    { indent: true, spacingAfter: 200 }),
  p("A validação empírica é conduzida por Simulação Computacional de Eventos Discretos (DES), replicada segundo o protocolo Monte Carlo, com trinta réplicas independentes de cem cartões operacionais cada — totalizando três mil execuções simuladas. Os parâmetros estocásticos são calibrados a partir do intervalo de 15% a 30% de tempo perdido em busca por informação reportado por Feldman e Sherman (2004), e as diferenças entre os sistemas são submetidas ao teste t pareado bilateral, com vinte e nove graus de liberdade e nível de significância crítico α = 0,001.",
    { indent: true })
);

conteudo.push(h2("1.5 Estrutura do Trabalho"));
conteudo.push(
  p("Além desta introdução, o presente Trabalho de Conclusão de Curso encontra-se organizado em mais seis capítulos, complementados por referências bibliográficas e apêndices. O Capítulo 2 apresenta a fundamentação teórica, em cinco eixos. O Capítulo 3 descreve a arquitetura e a modelagem do sistema Kanban IA, incluindo os diagramas UML. O Capítulo 4 detalha a implementação e os artefatos reais, com destaque para as políticas RLS em produção. O Capítulo 5 formaliza a metodologia de simulação. O Capítulo 6 apresenta e discute os resultados obtidos. O Capítulo 7 traz as considerações finais, as limitações e os trabalhos futuros. Encerram o documento as Referências, em conformidade com a ABNT NBR 6023, e os Apêndices A e B, que reproduzem os códigos-fonte autorais do simulador.",
    { indent: true })
);

// ============================================================
// 2 RESULTADOS ESPERADOS
// ============================================================
conteudo.push(h1("2 RESULTADOS ESPERADOS"));
conteudo.push(
  p("Este capítulo formaliza as hipóteses de pesquisa e os resultados esperados do experimento de validação, articulando-os com as projeções preliminares já obtidas a partir das primeiras execuções do modelo de simulação. Cabe ressaltar que os valores numéricos aqui apresentados constituem expectativas fundamentadas — derivadas tanto da literatura quanto de execuções preliminares do simulador —, cuja consolidação definitiva será apresentada no capítulo de resultados da versão final do trabalho.",
    { indent: true })
);

conteudo.push(h2("2.1 Hipóteses de Pesquisa"));
conteudo.push(
  p("A pesquisa estrutura-se em torno de uma hipótese central e quatro hipóteses derivadas, todas passíveis de verificação por meio do experimento de simulação:",
    { indent: true, spacingAfter: 120 }),
  bullet("Hipótese central (H1): a injeção semântica de conhecimento autorizado no cartão Kanban reduz significativamente o Cycle Time em relação ao Kanban tradicional."),
  bullet("Hipótese derivada (H1a): o ganho concentra-se majoritariamente na redução do Wait Time, e não na aceleração do Touch Time."),
  bullet("Hipótese derivada (H1b): a redução do Cycle Time reduz, por consequência, a taxa de quebra de SLA."),
  bullet("Hipótese derivada (H1c): a disponibilidade do conhecimento contextualizado eleva a taxa de First Contact Resolution (FCR)."),
  bullet("Hipótese derivada (H1d): a filtragem por Tags de Autorização Temática reduz o consumo de tokens do modelo de linguagem em relação a uma abordagem RAG genérica."),
  p("A hipótese nula (H0) correspondente sustenta que não há diferença estatisticamente significativa entre os dois sistemas. O experimento visa, portanto, rejeitar H0 ao nível de significância α = 0,001.",
    { indent: true, spacingBefore: 120 })
);

conteudo.push(h2("2.2 Resultados Esperados quanto aos Tempos Operacionais"));
conteudo.push(
  p("Espera-se que o Mecanismo Kanban IA promova reduções expressivas nas três métricas temporais analisadas, com destaque para o Wait Time, em conformidade com a hipótese H1a. A Tabela 1 sintetiza os resultados esperados, já corroborados pelas projeções preliminares da simulação.",
    { indent: true })
);
conteudo.push(legendaTabela("Tabela 1 – Resultados esperados quanto aos tempos operacionais médios (em minutos)"));
conteudo.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2760, 2200, 2200, 2200],
  rows: [
    new TableRow({ tableHeader: true, children: [
      celula("Métrica", { header: true, align: AlignmentType.CENTER, width: 2760 }),
      celula("Kanban Tradicional", { header: true, align: AlignmentType.CENTER, width: 2200 }),
      celula("Kanban IA", { header: true, align: AlignmentType.CENTER, width: 2200 }),
      celula("Redução esperada", { header: true, align: AlignmentType.CENTER, width: 2200 }),
    ]}),
    new TableRow({ children: [
      celula("Wait Time", { width: 2760 }),
      celula(`${fmt(STATS.wait.A_media)} min`, { align: AlignmentType.CENTER, width: 2200 }),
      celula(`${fmt(STATS.wait.B_media)} min`, { align: AlignmentType.CENTER, width: 2200 }),
      celula(`${fmt(STATS.wait.delta_pct)}%`, { align: AlignmentType.CENTER, bold: true, width: 2200 }),
    ]}),
    new TableRow({ children: [
      celula("Touch Time", { width: 2760 }),
      celula(`${fmt(STATS.touch.A_media)} min`, { align: AlignmentType.CENTER, width: 2200 }),
      celula(`${fmt(STATS.touch.B_media)} min`, { align: AlignmentType.CENTER, width: 2200 }),
      celula(`${fmt(STATS.touch.delta_pct)}%`, { align: AlignmentType.CENTER, bold: true, width: 2200 }),
    ]}),
    new TableRow({ children: [
      celula("Cycle Time", { width: 2760 }),
      celula(`${fmt(STATS.cycle.A_media)} min`, { align: AlignmentType.CENTER, width: 2200 }),
      celula(`${fmt(STATS.cycle.B_media)} min`, { align: AlignmentType.CENTER, width: 2200 }),
      celula(`${fmt(STATS.cycle.delta_pct)}%`, { align: AlignmentType.CENTER, bold: true, width: 2200 }),
    ]}),
  ]
}));
conteudo.push(fonteTabela("Fonte: projeções preliminares da simulação, elaboradas pelo autor (2026)."));
conteudo.push(
  p(`Conforme se observa, espera-se que o Wait Time seja reduzido em aproximadamente ${fmt(STATS.wait.delta_pct)}%, caindo de cerca de ${fmt(STATS.wait.A_media)} minutos para algo próximo de ${fmt(STATS.wait.B_media)} minutos por cartão — confirmando a hipótese de que o tempo de espera por informação é a principal fonte de ineficiência atacada pelo mecanismo. O Cycle Time global, por sua vez, deverá apresentar redução em torno de ${fmt(STATS.cycle.delta_pct)}%.`,
    { indent: true, spacingBefore: 120 })
);

conteudo.push(h2("2.3 Resultados Esperados quanto a SLA e First Contact Resolution"));
conteudo.push(
  p(`No tocante à conformidade contratual, espera-se que a taxa de quebra de SLA — definida como o percentual de cartões cujo Cycle Time ultrapassa o limite de 240 minutos — seja reduzida de aproximadamente ${fmt(STATS.sla.A_media)}% no Kanban tradicional para um patamar próximo de ${fmt(STATS.sla.B_media)}% no Mecanismo Kanban IA, mitigando de forma quase integral a exposição a multas contratuais (hipótese H1b).`,
    { indent: true, spacingAfter: 200 }),
  p(`Quanto à autonomia do operador, espera-se que a taxa de First Contact Resolution evolua de cerca de ${fmt(STATS.fcr.A_media)}% para aproximadamente ${fmt(STATS.fcr.B_media)}%, em decorrência da disponibilidade imediata, na própria interface, de um roteiro de resolução validado pela política corporativa (hipótese H1c). Tal elevação representa ganho de aproximadamente ${fmt(STATS.fcr.B_media - STATS.fcr.A_media)} pontos percentuais na resolução sem escalonamento.`,
    { indent: true })
);

conteudo.push(h2("2.4 Resultados Esperados quanto à Eficiência Computacional"));
conteudo.push(
  p("No plano da eficiência computacional, espera-se que a estratégia de pré-filtragem por Tags de Autorização Temática reduza substancialmente o volume de tokens transmitidos ao modelo de linguagem a cada requisição (hipótese H1d). Estima-se uma redução da ordem de 87,5% no payload médio — de aproximadamente 12.000 tokens, em uma abordagem RAG genérica que envia todo o corpus da empresa, para cerca de 1.500 tokens, ao enviar apenas o fragmento de conhecimento estritamente pertinente à tarefa.",
    { indent: true, spacingAfter: 200 }),
  p("Espera-se, ademais, que essa economia computacional viabilize latência de resposta inferior a 1,5 segundo, tornando o sistema apto a operar em tempo real na interface reativa e neutralizando o principal argumento contrário à adoção de Large Language Models em escala corporativa: o custo recorrente por interação.",
    { indent: true })
);

conteudo.push(h2("2.5 Resultados Esperados quanto ao Retorno Financeiro"));
const horasSalvas = ((STATS.cycle.A_media - STATS.cycle.B_media) * 100 / 60).toFixed(1).replace(".", ",");
conteudo.push(
  p(`A partir dos ganhos de tempo projetados, espera-se demonstrar retorno financeiro relevante. Considerando um custo médio de R$ 50,00 por hora técnica operacional, estima-se a economia de aproximadamente ${horasSalvas} horas operacionais a cada lote de 100 cartões processados. Projetada para uma operação de médio porte, com mil chamados mensais, essa economia deverá ultrapassar a marca de um milhão de reais anuais em força de trabalho, sem contabilizar ganhos indiretos com a redução de passivos contratuais por descumprimento de SLA e com a melhoria da experiência do cliente.`,
    { indent: true, spacingAfter: 200 }),
  p("Ressalta-se que tais valores constituem estimativa de cenário, e não um retorno auditado, destinando-se a dimensionar a ordem de grandeza do impacto econômico potencial da solução.",
    { indent: true })
);

conteudo.push(h2("2.6 Validação Preliminar e Síntese das Expectativas"));
conteudo.push(
  p("As projeções preliminares obtidas a partir das primeiras execuções do simulador, com replicação Monte Carlo de trinta amostras, corroboram integralmente as hipóteses formuladas. O teste t pareado bilateral aplicado às diferenças entre os dois sistemas produziu estatísticas t consistentemente superiores ao valor crítico de 3,659 (referente a vinte e nove graus de liberdade e α = 0,001) em todas as métricas analisadas, conforme sintetizado na Tabela 2.",
    { indent: true })
);
conteudo.push(legendaTabela("Tabela 2 – Síntese das expectativas e significância estatística preliminar"));
conteudo.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [3360, 3000, 3000],
  rows: [
    new TableRow({ tableHeader: true, children: [
      celula("Indicador", { header: true, align: AlignmentType.CENTER, width: 3360 }),
      celula("Expectativa", { header: true, align: AlignmentType.CENTER, width: 3000 }),
      celula("Estatística t (df=29)", { header: true, align: AlignmentType.CENTER, width: 3000 }),
    ]}),
    new TableRow({ children: [
      celula("Redução do Wait Time", { width: 3360 }),
      celula(`${fmt(STATS.wait.delta_pct)}%`, { align: AlignmentType.CENTER, width: 3000 }),
      celula(`${fmt(STATS.wait.t_stat)}`, { align: AlignmentType.CENTER, width: 3000 }),
    ]}),
    new TableRow({ children: [
      celula("Redução do Cycle Time", { width: 3360 }),
      celula(`${fmt(STATS.cycle.delta_pct)}%`, { align: AlignmentType.CENTER, width: 3000 }),
      celula(`${fmt(STATS.cycle.t_stat)}`, { align: AlignmentType.CENTER, width: 3000 }),
    ]}),
    new TableRow({ children: [
      celula("Redução da Quebra de SLA", { width: 3360 }),
      celula(`${fmt(STATS.sla.A_media)}% → ${fmt(STATS.sla.B_media)}%`, { align: AlignmentType.CENTER, width: 3000 }),
      celula(`${fmt(STATS.sla.t_stat)}`, { align: AlignmentType.CENTER, width: 3000 }),
    ]}),
    new TableRow({ children: [
      celula("Elevação do FCR", { width: 3360 }),
      celula(`${fmt(STATS.fcr.A_media)}% → ${fmt(STATS.fcr.B_media)}%`, { align: AlignmentType.CENTER, width: 3000 }),
      celula(`${fmt(Math.abs(STATS.fcr.t_stat))}`, { align: AlignmentType.CENTER, width: 3000 }),
    ]}),
  ]
}));
conteudo.push(fonteTabela("Fonte: projeções preliminares da simulação Monte Carlo, elaboradas pelo autor (2026)."));
conteudo.push(
  p("Diante desse quadro, espera-se que a versão final do trabalho confirme, com robustez estatística, que o Mecanismo Kanban IA representa evolução significativa em relação ao Kanban tradicional, rejeitando-se a hipótese nula com p < 0,001 em todas as dimensões avaliadas. Reitera-se, por fim, que a simulação constitui uma prova de conceito quantitativa, cuja função é dimensionar o efeito esperado sob hipóteses fundamentadas na literatura, não substituindo a validação em ambiente produtivo real — etapa indicada como trabalho futuro prioritário.",
    { indent: true })
);

// ============================================================
// REFERENCIAS
// ============================================================
conteudo.push(h1("REFERÊNCIAS"));
const refs = [
  "ANDERSON, David J. Kanban: Successful Evolutionary Change for Your Technology Business. Sequim: Blue Hole Press, 2010. 261 p.",
  "BANKS, Jerry; CARSON II, John S.; NELSON, Barry L.; NICOL, David M. Discrete-Event System Simulation. 5. ed. Upper Saddle River: Pearson, 2010. 622 p.",
  "CHONG, Frederick; CARRARO, Gianpaolo. Architecture Strategies for Catching the Long Tail: Multi-Tenant SaaS Architecture. Redmond: Microsoft Corporation, 2006. Disponível em: https://learn.microsoft.com/en-us/previous-versions/dotnet/articles/aa479069(v=msdn.10). Acesso em: 11 mai. 2026.",
  "CHOO, Chun Wei. A organização do conhecimento: como as organizações usam a informação para criar significado, construir conhecimento e tomar decisões. São Paulo: Senac, 2003. 425 p.",
  "FELDMAN, Susan; SHERMAN, Chris. The High Cost of Not Finding Information. IDC White Paper #29127. Framingham: International Data Corporation, 2004.",
  "LEWIS, Patrick et al. Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. In: Advances in Neural Information Processing Systems (NeurIPS), v. 33, p. 9459-9474, 2020. Disponível em: https://arxiv.org/abs/2005.11401. Acesso em: 11 mai. 2026.",
  "MIN, Sewon et al. Rethinking the Role of Demonstrations: What Makes In-Context Learning Work? In: Proceedings of the 2022 Conference on Empirical Methods in Natural Language Processing (EMNLP), Abu Dhabi, 2022. Disponível em: https://arxiv.org/abs/2202.12837. Acesso em: 11 mai. 2026.",
  "POSTGRESQL GLOBAL DEVELOPMENT GROUP. PostgreSQL 16 Documentation: Row Security Policies. 2025. Disponível em: https://www.postgresql.org/docs/16/ddl-rowsecurity.html. Acesso em: 11 mai. 2026.",
  "REINERTSEN, Donald G. The Principles of Product Development Flow: Second Generation Lean Product Development. Redondo Beach: Celeritas Publishing, 2009. 294 p."
];
refs.forEach(r => conteudo.push(ref(r)));

// ============ DOCUMENTO ============
const doc = new Document({
  creator: "Vinicius Vilela Rufini",
  title: "TCC - Etapa 4 - Introducao e Resultados Esperados",
  description: "Etapa 4 do TCC para envio ao orientador - UNIP Ciencia da Computacao",
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 28, bold: true },
        paragraph: { spacing: { before: 480, after: 360, line: 360 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 26, bold: true },
        paragraph: { spacing: { before: 360, after: 240, line: 360 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 24, bold: true, italics: true },
        paragraph: { spacing: { before: 280, after: 180, line: 360 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "%1)", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1701, right: 1134, bottom: 1134, left: 1701 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "TCC – Etapa 4 – Mecanismo Kanban IA", size: 18, font: FONT, italics: true })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Página ", size: 18, font: FONT }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, font: FONT })
          ]
        })]
      })
    },
    children: conteudo
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUT, buffer);
  const tamanho = (fs.statSync(OUT).size / 1024).toFixed(1);
  console.log(`OK -> ${OUT} (${tamanho} KB)`);
});
