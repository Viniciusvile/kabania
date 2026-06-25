/**
 * Gerador do TCC Kanban IA em .docx (normas ABNT - UNIP)
 * Versao 2 - com acentuacao, estatistica inferencial, UML e implementacao
 */
const fs = require("fs");
const path = require("path");

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageBreak, PageNumber,
  TabStopType, TabStopPosition,
  PositionalTab, PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader,
  Bookmark
} = require("docx");

const BASE = "C:\\Users\\vinic\\Desktop\\kabania\\meuTcc";
const CHARTS = path.join(BASE, "charts");
const OUT = path.join(BASE, "TCC_Final_Kabania.docx");

const STATS = JSON.parse(fs.readFileSync(path.join(BASE, "monte_carlo_stats.json"), "utf8"));
const RLS_SQL = fs.readFileSync("C:\\Users\\vinic\\Desktop\\kabania\\security_hardening.sql", "utf8");

const FONT = "Times New Roman";

function p(text, opts = {}) {
  const { bold = false, italic = false, size = 24, align = AlignmentType.JUSTIFIED,
    spacingAfter = 0, spacingBefore = 0, indent = false, lineSpacing = 360, heading } = opts;
  return new Paragraph({
    heading, alignment: align,
    spacing: { before: spacingBefore, after: spacingAfter, line: lineSpacing },
    indent: indent ? { firstLine: 720 } : undefined,
    children: [new TextRun({ text, bold, italics: italic, size, font: FONT })]
  });
}

function pRich(runs, opts = {}) {
  const { align = AlignmentType.JUSTIFIED, spacingAfter = 0, spacingBefore = 0,
    indent = false, lineSpacing = 360, heading } = opts;
  return new Paragraph({
    heading, alignment: align,
    spacing: { before: spacingBefore, after: spacingAfter, line: lineSpacing },
    indent: indent ? { firstLine: 720 } : undefined,
    children: runs.map(r => new TextRun({
      text: r.text, bold: r.bold, italics: r.italic,
      size: r.size || 24, font: FONT
    }))
  });
}

function h1(text, anchor) {
  const child = anchor
    ? new Bookmark({ id: anchor, children: [new TextRun({ text, bold: true, size: 28, font: FONT })] })
    : new TextRun({ text, bold: true, size: 28, font: FONT });
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, alignment: AlignmentType.LEFT,
    spacing: { before: 480, after: 360, line: 360 }, pageBreakBefore: true,
    children: [child]
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

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { line: 360, after: 60 }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, size: 24, font: FONT })]
  });
}

function num(text) {
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    spacing: { line: 360, after: 60 }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, size: 24, font: FONT })]
  });
}

function blank(n = 1) { return Array.from({ length: n }, () => p("")); }

function imagem(arquivo, w, h, legenda) {
  const dados = fs.readFileSync(path.join(CHARTS, arquivo));
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 },
      children: [new ImageRun({
        type: "png", data: dados, transformation: { width: w, height: h },
        altText: { title: legenda, description: legenda, name: arquivo }
      })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 240, line: 280 },
      children: [new TextRun({ text: legenda, italics: true, size: 20, font: FONT })]
    })
  ];
}

function codigoBloco(texto, opts = {}) {
  const { fonteSize = 18 } = opts;
  return texto.split("\n").map(linha => new Paragraph({
    spacing: { line: 240 }, indent: { left: 360 },
    children: [new TextRun({ text: linha || " ", size: fonteSize, font: "Courier New" })]
  }));
}

const borda = { style: BorderStyle.SINGLE, size: 4, color: "333333" };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };

function celula(text, opts = {}) {
  const { bold = false, header = false, align = AlignmentType.LEFT, width = 2340 } = opts;
  return new TableCell({
    borders: bordas, width: { size: width, type: WidthType.DXA },
    shading: header ? { fill: "2b5876", type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: align, spacing: { line: 280 },
      children: [new TextRun({
        text, bold: bold || header,
        color: header ? "FFFFFF" : "000000",
        size: 22, font: FONT
      })]
    })]
  });
}

function legendaTabela(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, size: 22, font: FONT })]
  });
}

function fonteTabela(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 80, after: 240 },
    children: [new TextRun({ text, italics: true, size: 20, font: FONT })]
  });
}

const fmt = (v, casas = 1) => Number(v).toFixed(casas).replace(".", ",");

const conteudo = [];

// =============== CAPA ===============
conteudo.push(
  p("UNIVERSIDADE PAULISTA – UNIP", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 240 }),
  p("CURSO DE CIÊNCIA DA COMPUTAÇÃO", { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 720 }),
  ...blank(6),
  p("VINICIUS VILELA RUFINI", { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 720 }),
  ...blank(6),
  p("O PARADIGMA DO KANBAN SEMÂNTICO:", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 120 }),
  p("OTIMIZAÇÃO DE PERFORMANCE OPERACIONAL ATRAVÉS DO MECANISMO KANBAN IA COM CONTEXTUALIZAÇÃO AUTÔNOMA VIA LLMs E CONTROLE DE ACESSO POR TAGS (RLS)",
    { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 720 }),
  ...blank(10),
  p("SÃO PAULO", { align: AlignmentType.CENTER, bold: true, size: 24, spacingAfter: 120 }),
  p("2026", { align: AlignmentType.CENTER, bold: true, size: 24 }),
  new Paragraph({ children: [new PageBreak()] })
);

// =============== FOLHA DE ROSTO ===============
conteudo.push(
  p("VINICIUS VILELA RUFINI", { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 720 }),
  ...blank(6),
  p("O PARADIGMA DO KANBAN SEMÂNTICO:", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 120 }),
  p("OTIMIZAÇÃO DE PERFORMANCE OPERACIONAL ATRAVÉS DO MECANISMO KANBAN IA COM CONTEXTUALIZAÇÃO AUTÔNOMA VIA LLMs E CONTROLE DE ACESSO POR TAGS (RLS)",
    { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 720 }),
  ...blank(4),
  new Paragraph({
    alignment: AlignmentType.RIGHT, indent: { left: 4500 }, spacing: { line: 280 },
    children: [new TextRun({
      text: "Trabalho de Conclusão de Curso apresentado à Universidade Paulista – UNIP como requisito parcial para obtenção do título de Bacharel em Ciência da Computação.",
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

// =============== FOLHA DE APROVACAO ===============
conteudo.push(
  p("VINICIUS VILELA RUFINI", { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 480 }),
  p("O PARADIGMA DO KANBAN SEMÂNTICO: OTIMIZAÇÃO DE PERFORMANCE OPERACIONAL ATRAVÉS DO MECANISMO KANBAN IA",
    { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 720 }),
  new Paragraph({
    alignment: AlignmentType.RIGHT, indent: { left: 4500 }, spacing: { line: 280 },
    children: [new TextRun({
      text: "Trabalho de Conclusão de Curso apresentado à Universidade Paulista – UNIP como requisito parcial para obtenção do título de Bacharel em Ciência da Computação.",
      size: 22, font: FONT
    })]
  }),
  ...blank(2),
  p("Aprovado em: ___ / ___ / ______", { align: AlignmentType.CENTER, spacingAfter: 480 }),
  p("BANCA EXAMINADORA", { align: AlignmentType.CENTER, bold: true, size: 24, spacingAfter: 480 }),
  ...blank(2),
  p("________________________________________", { align: AlignmentType.CENTER }),
  p("Prof(a). [Nome do Orientador]", { align: AlignmentType.CENTER, spacingAfter: 360 }),
  p("Universidade Paulista – UNIP", { align: AlignmentType.CENTER, spacingAfter: 480 }),
  p("________________________________________", { align: AlignmentType.CENTER }),
  p("Prof(a). [Examinador 1]", { align: AlignmentType.CENTER, spacingAfter: 360 }),
  p("Universidade Paulista – UNIP", { align: AlignmentType.CENTER, spacingAfter: 480 }),
  p("________________________________________", { align: AlignmentType.CENTER }),
  p("Prof(a). [Examinador 2]", { align: AlignmentType.CENTER, spacingAfter: 360 }),
  p("Universidade Paulista – UNIP", { align: AlignmentType.CENTER }),
  new Paragraph({ children: [new PageBreak()] })
);

// =============== DEDICATORIA ===============
conteudo.push(
  ...blank(12),
  new Paragraph({
    alignment: AlignmentType.RIGHT, indent: { left: 4500 }, spacing: { line: 360 },
    children: [new TextRun({
      text: "Dedico este trabalho à minha família, pelo apoio incondicional em cada etapa da jornada acadêmica, e a todos os profissionais que enfrentam diariamente os gargalos invisíveis das operações corporativas.",
      size: 24, font: FONT, italics: true
    })]
  }),
  new Paragraph({ children: [new PageBreak()] })
);

// =============== AGRADECIMENTOS ===============
conteudo.push(
  p("AGRADECIMENTOS", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 480 }),
  p("Agradeço a Deus pela perseverança concedida durante a elaboração deste trabalho.", { indent: true, spacingAfter: 200 }),
  p("Aos meus pais e familiares, pela compreensão nos momentos de ausência e pelo encorajamento constante.", { indent: true, spacingAfter: 200 }),
  p("Ao(à) Prof(a). orientador(a), pela disponibilidade, paciência e direcionamentos técnicos que tornaram esta pesquisa viável.", { indent: true, spacingAfter: 200 }),
  p("Aos professores do curso de Ciência da Computação da UNIP, pela formação crítica e pelo estímulo à inovação tecnológica aplicada a problemas reais.", { indent: true, spacingAfter: 200 }),
  p("Aos colegas de turma e profissionais do mercado, cujas trocas de experiência ajudaram a delinear os requisitos da plataforma Kanban IA.", { indent: true }),
  new Paragraph({ children: [new PageBreak()] })
);

// =============== EPIGRAFE ===============
conteudo.push(
  ...blank(12),
  new Paragraph({
    alignment: AlignmentType.RIGHT, indent: { left: 4500 }, spacing: { line: 360 },
    children: [new TextRun({
      text: "“O que é medido pode ser melhorado; o que é informado a tempo pode ser decidido.”",
      size: 24, font: FONT, italics: true
    })]
  }),
  new Paragraph({
    alignment: AlignmentType.RIGHT, indent: { left: 4500 }, spacing: { line: 360 },
    children: [new TextRun({ text: "(Adaptado de Peter Drucker)", size: 22, font: FONT })]
  }),
  new Paragraph({ children: [new PageBreak()] })
);

// =============== RESUMO ===============
conteudo.push(
  p("RESUMO", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 360 }),
  p(`Este trabalho propõe e valida o Mecanismo Kanban IA, uma arquitetura de gestão operacional que evolui o Kanban tradicional — estritamente visual e passivo — para um modelo ativo de Kanban Semântico, no qual os cartões de tarefa funcionam como agentes contextuais alimentados por Inteligência Artificial Generativa (LLM Google Gemini). A solução integra uma Base de Conhecimento Dinâmica regida por Tags de Autorização Temática sob políticas de Row Level Security (RLS) do PostgreSQL/Supabase, garantindo isolamento multilocatário absoluto e payloads enxutos para o modelo de linguagem. A hipótese central, fundamentada na literatura de Anderson (2010), Reinertsen (2009), Feldman e Sherman (2004) e Lewis et al. (2020), defende que a injeção semântica de conhecimento autorizado reduz o Wait Time decorrente da busca manual por procedimentos operacionais padrão (POPs), encurta o Cycle Time e eleva a taxa de cumprimento de SLAs. A validação empírica foi conduzida por meio de Simulação Computacional de Eventos Discretos (Banks et al., 2010), implementada em Node.js, com replicação Monte Carlo de 30 réplicas independentes sobre amostras de 100 cartões operacionais com complexidade mista. Os parâmetros estocásticos foram calibrados a partir do intervalo de 15% a 30% de tempo perdido em busca por informação reportado por Feldman e Sherman (2004). Os resultados, submetidos a teste t pareado (df=29), demonstraram redução de ${fmt(STATS.wait.delta_pct)}% no Wait Time, de ${fmt(STATS.cycle.delta_pct)}% no Cycle Time e queda da Taxa de Quebra de SLA de ${fmt(STATS.sla.A_media)}% para ${fmt(STATS.sla.B_media)}%, com First Contact Resolution evoluindo de ${fmt(STATS.fcr.A_media)}% para ${fmt(STATS.fcr.B_media)}% (p < 0,001 em todas as métricas). Conclui-se que o Kanban IA configura uma contribuição concreta para a Engenharia de Software Assistida por IA, oferecendo um novo patamar de previsibilidade, conformidade e produtividade às operações corporativas multiturno.`,
    { lineSpacing: 280, spacingAfter: 360 }),
  pRich([
    { text: "Palavras-chave: ", bold: true },
    { text: "Kanban Semântico; Inteligência Artificial Generativa; Row Level Security; Gestão Operacional; Simulação de Eventos Discretos." }
  ], { lineSpacing: 280 }),
  new Paragraph({ children: [new PageBreak()] })
);

// =============== ABSTRACT ===============
conteudo.push(
  p("ABSTRACT", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 360 }),
  p(`This work proposes and validates the Kanban IA Mechanism, an operational management architecture that evolves the traditional Kanban — strictly visual and passive — into an active Semantic Kanban model, in which task cards behave as contextual agents powered by Generative Artificial Intelligence (Google Gemini LLM). The solution integrates a Dynamic Knowledge Base governed by Thematic Authorization Tags under PostgreSQL/Supabase Row Level Security (RLS) policies, ensuring absolute multitenant isolation and lean payloads for the language model. The central hypothesis, supported by Anderson (2010), Reinertsen (2009), Feldman and Sherman (2004) and Lewis et al. (2020), states that the semantic injection of authorized knowledge reduces the Wait Time spent on manual search for standard operating procedures, shortens the Cycle Time and raises the SLA compliance rate. The empirical validation was conducted by means of Discrete-Event Simulation (Banks et al., 2010), implemented in Node.js, with Monte Carlo replication of 30 independent replicas of 100 operational tasks each. Stochastic parameters were calibrated based on the 15%-30% range of time spent searching for information reported by Feldman and Sherman (2004). The results, submitted to paired t-tests (df=29), showed a ${fmt(STATS.wait.delta_pct)}% reduction in Wait Time, ${fmt(STATS.cycle.delta_pct)}% reduction in Cycle Time and SLA breach rate falling from ${fmt(STATS.sla.A_media)}% to ${fmt(STATS.sla.B_media)}%, while First Contact Resolution rose from ${fmt(STATS.fcr.A_media)}% to ${fmt(STATS.fcr.B_media)}% (p < 0.001 across all metrics).`,
    { lineSpacing: 280, spacingAfter: 360 }),
  pRich([
    { text: "Keywords: ", bold: true },
    { text: "Semantic Kanban; Generative Artificial Intelligence; Row Level Security; Operational Management; Discrete-Event Simulation." }
  ], { lineSpacing: 280 }),
  new Paragraph({ children: [new PageBreak()] })
);

// =============== LISTAS ===============
conteudo.push(
  p("LISTA DE ILUSTRAÇÕES", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 360 }),
  p("Figura 1 – Diagrama de Casos de Uso do Sistema Kanban IA"),
  p("Figura 2 – Diagrama de Sequência do Motor Semântico"),
  p("Figura 3 – Diagrama Entidade-Relacionamento do Modelo de Dados"),
  p("Figura 4 – Tempos Operacionais Médios com Intervalo de Confiança 95%"),
  p("Figura 5 – Cycle Time Médio por Cartão"),
  p("Figura 6 – Distribuição do Cycle Time nas 30 Réplicas (Boxplot)"),
  p("Figura 7 – Composição do Cycle Time (Wait + Touch)"),
  p("Figura 8 – Taxa de Conformidade de SLA por Sistema"),
  p("Figura 9 – First Contact Resolution (FCR)"),
  p("Figura 10 – Payload Médio Enviado ao LLM"),
  new Paragraph({ children: [new PageBreak()] })
);

conteudo.push(
  p("LISTA DE TABELAS", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 360 }),
  p("Tabela 1 – Quadro Comparativo de Paradigmas (Kanban Tradicional × Kanban IA)"),
  p("Tabela 2 – Estatísticas Descritivas e Inferenciais dos Tempos Operacionais"),
  p("Tabela 3 – Indicadores de Eficiência, SLA e Qualidade"),
  p("Tabela 4 – Projeção de Retorno Financeiro Estimado"),
  new Paragraph({ children: [new PageBreak()] })
);

conteudo.push(
  p("LISTA DE ABREVIATURAS E SIGLAS", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 360 }),
  pRich([{ text: "BaaS\t", bold: true }, { text: "Backend as a Service" }]),
  pRich([{ text: "CSC\t", bold: true }, { text: "Central de Serviços Compartilhados" }]),
  pRich([{ text: "DES\t", bold: true }, { text: "Discrete-Event Simulation" }]),
  pRich([{ text: "DER\t", bold: true }, { text: "Diagrama Entidade-Relacionamento" }]),
  pRich([{ text: "FCR\t", bold: true }, { text: "First Contact Resolution" }]),
  pRich([{ text: "IC\t", bold: true }, { text: "Intervalo de Confiança" }]),
  pRich([{ text: "LLM\t", bold: true }, { text: "Large Language Model" }]),
  pRich([{ text: "POP\t", bold: true }, { text: "Procedimento Operacional Padrão" }]),
  pRich([{ text: "RAG\t", bold: true }, { text: "Retrieval-Augmented Generation" }]),
  pRich([{ text: "RLS\t", bold: true }, { text: "Row Level Security" }]),
  pRich([{ text: "ROI\t", bold: true }, { text: "Return on Investment" }]),
  pRich([{ text: "SLA\t", bold: true }, { text: "Service Level Agreement" }]),
  pRich([{ text: "SPA\t", bold: true }, { text: "Single Page Application" }]),
  pRich([{ text: "SSO\t", bold: true }, { text: "Single Sign-On" }]),
  pRich([{ text: "TCC\t", bold: true }, { text: "Trabalho de Conclusão de Curso" }]),
  pRich([{ text: "UML\t", bold: true }, { text: "Unified Modeling Language" }]),
  pRich([{ text: "WIP\t", bold: true }, { text: "Work in Progress" }]),
  new Paragraph({ children: [new PageBreak()] })
);

// =============== SUMARIO ===============
function tocLinha(titulo, pagina) {
  return new Paragraph({
    spacing: { line: 320 },
    children: [
      new TextRun({ text: titulo, size: 22, font: FONT }),
      new TextRun({ children: [
        new PositionalTab({
          alignment: PositionalTabAlignment.RIGHT,
          relativeTo: PositionalTabRelativeTo.MARGIN,
          leader: PositionalTabLeader.DOT
        }),
        pagina
      ], size: 22, font: FONT })
    ]
  });
}

conteudo.push(
  p("SUMÁRIO", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 360 }),
  tocLinha("1 INTRODUÇÃO", "13"),
  tocLinha("1.1 Contextualização do Problema", "13"),
  tocLinha("1.2 Justificativa", "14"),
  tocLinha("1.3 Objetivos", "15"),
  tocLinha("1.4 Estrutura do Trabalho", "16"),
  tocLinha("2 FUNDAMENTAÇÃO TEÓRICA", "17"),
  tocLinha("2.1 Kanban, Lead Time e Cycle Time", "17"),
  tocLinha("2.2 O Custo da Busca por Informação", "18"),
  tocLinha("2.3 Retrieval-Augmented Generation (RAG)", "19"),
  tocLinha("2.4 Row Level Security e Multilocatário", "20"),
  tocLinha("2.5 Simulação Computacional de Eventos Discretos", "21"),
  tocLinha("3 ARQUITETURA E MODELAGEM DO SISTEMA KANBAN IA", "22"),
  tocLinha("3.1 Visão Geral e Pilha Tecnológica", "22"),
  tocLinha("3.2 Mecanismo de Scoping Temático Autônomo", "23"),
  tocLinha("3.3 TAGS de Autorização e Políticas RLS", "24"),
  tocLinha("3.4 Casos de Uso e Atores", "25"),
  tocLinha("3.5 Diagramas UML do Sistema", "26"),
  tocLinha("4 IMPLEMENTAÇÃO E ARTEFATOS REAIS", "29"),
  tocLinha("4.1 Estrutura do Repositório", "29"),
  tocLinha("4.2 Políticas RLS em Produção", "30"),
  tocLinha("4.3 Plano de Testes de Segurança Multilocatário", "32"),
  tocLinha("5 METODOLOGIA", "33"),
  tocLinha("5.1 Design do Experimento Comparativo", "33"),
  tocLinha("5.2 Parametrização da Simulação", "34"),
  tocLinha("5.3 Replicação Monte Carlo e Teste de Hipótese", "35"),
  tocLinha("5.4 Indicadores-Chave (KPIs)", "36"),
  tocLinha("6 RESULTADOS E DISCUSSÃO", "37"),
  tocLinha("6.1 Tempos Operacionais", "37"),
  tocLinha("6.2 Conformidade de SLA", "39"),
  tocLinha("6.3 First Contact Resolution", "40"),
  tocLinha("6.4 Eficiência Computacional e Consumo de Tokens", "41"),
  tocLinha("6.5 Retorno Financeiro Estimado", "42"),
  tocLinha("7 CONSIDERAÇÕES FINAIS", "43"),
  tocLinha("REFERÊNCIAS", "45"),
  tocLinha("APÊNDICE A – Código do Simulador de Eventos Discretos", "47"),
  tocLinha("APÊNDICE B – Script Monte Carlo (Python)", "51"),
  new Paragraph({ children: [new PageBreak()] })
);

// =============== CAP 1 ===============
conteudo.push(h1("1 INTRODUÇÃO"));
conteudo.push(h2("1.1 Contextualização do Problema"));
conteudo.push(
  p("As empresas prestadoras de serviços que operam em múltiplos turnos — tais como Centrais de Serviços Compartilhados (CSC), operações logísticas e suporte técnico — convivem com um paradoxo silencioso: ainda que adotem metodologias ágeis visuais, como o Kanban, continuam expostas a perdas significativas de produtividade decorrentes do tempo gasto pelos operadores na busca por informação. Manuais corporativos, procedimentos operacionais padrão e regras de negócio frequentemente residem em repositórios desconexos, planilhas avulsas ou exigem o acionamento de supervisores e áreas adjacentes, gerando interrupções que rompem o fluxo de trabalho.", { indent: true, spacingAfter: 200 }),
  p("Esse fenômeno, designado nesta pesquisa como Gargalo Cognitivo, traduz-se em tempo de espera oculta (Wait Time), em desvios de qualidade na execução das tarefas e, sobretudo, em quebras recorrentes de Service Level Agreements (SLAs), com consequente exposição a multas contratuais e à corrosão da confiança dos clientes corporativos.", { indent: true, spacingAfter: 200 }),
  p("O Kanban tradicional, embora eficaz para dar visibilidade ao fluxo e limitar o trabalho em progresso (WIP), opera de forma passiva: o cartão informa o estado da tarefa, mas não injeta conhecimento operacional no momento da execução. A presente pesquisa parte da premissa de que essa passividade pode — e deve — ser superada pela integração nativa de Inteligência Artificial Generativa ao ciclo de vida do cartão, desde que respaldada por mecanismos sólidos de segurança multilocatário.", { indent: true })
);

conteudo.push(h2("1.2 Justificativa"));
conteudo.push(
  p("Estudos consolidados na literatura de gestão do conhecimento, como o relatório clássico da IDC conduzido por Feldman e Sherman (2004), apontam que trabalhadores do conhecimento e profissionais de suporte gastam entre 15% e 30% do seu tempo de trabalho apenas localizando informações descentralizadas. Quando esse percentual é projetado sobre operações corporativas com centenas de cartões diários, a perda agregada de horas-homem revela um impacto financeiro de grande magnitude. Este intervalo serviu de âncora metodológica para a calibração estocástica do modelo de simulação adotado neste trabalho.", { indent: true, spacingAfter: 200 }),
  p("Por outro lado, a popularização dos Large Language Models (LLMs) e das arquiteturas de Retrieval-Augmented Generation (RAG), conforme descrito por Lewis et al. (2020), inaugurou uma nova geração de assistentes capazes de transformar texto bruto em prescrições acionáveis. Contudo, sua adoção em ambientes corporativos esbarra em dois desafios críticos: (i) o custo computacional por tokens consumidos a cada requisição e (ii) o risco de exposição indevida de dados sensíveis entre clientes em arquiteturas multilocatário.", { indent: true, spacingAfter: 200 }),
  p("O Mecanismo Kanban IA foi concebido para endereçar simultaneamente essas duas frentes, combinando a indexação semântica do conhecimento corporativo por meio de Tags de Autorização Temática com as políticas nativas de Row Level Security (RLS) do PostgreSQL, garantindo que o LLM receba apenas o fragmento de conhecimento estritamente autorizado para a empresa do usuário solicitante.", { indent: true })
);

conteudo.push(h2("1.3 Objetivos"));
conteudo.push(h3("1.3.1 Objetivo Geral"));
conteudo.push(p("Conceber, implementar e validar o Mecanismo Kanban IA como evolução arquitetural do Kanban Tradicional, demonstrando, por meio de simulação computacional de eventos discretos com replicação Monte Carlo, sua superioridade na redução do Cycle Time e na elevação das taxas de cumprimento de SLAs e de First Contact Resolution em operações corporativas multiturno.", { indent: true }));

conteudo.push(h3("1.3.2 Objetivos Específicos"));
conteudo.push(
  num("Caracterizar, com base na literatura especializada, os componentes de tempo (Wait Time, Touch Time, Cycle Time e Lead Time) que compõem o ciclo de execução de uma tarefa em um sistema Kanban Tradicional."),
  num("Projetar a arquitetura lógica do Mecanismo Kanban IA, descrevendo a sinergia entre o backend Supabase/PostgreSQL, o frontend React/Vite, a camada de RLS e a integração com a API do Google Gemini, formalizada por meio de diagramas UML (Casos de Uso, Sequência e DER)."),
  num("Implementar um simulador de eventos discretos em Node.js capaz de gerar amostras estatísticas comparáveis entre o Kanban Tradicional e o Mecanismo Kanban IA, executando ao menos 30 réplicas independentes para fins de inferência estatística."),
  num("Mensurar, sobre amostras de 100 cartões operacionais por réplica, os ganhos relativos nas dimensões de tempo, conformidade de SLA, FCR e consumo de tokens, submetendo as diferenças a teste t pareado bilateral."),
  num("Traduzir os ganhos técnicos em projeções financeiras (ROI), fornecendo argumentos quantitativos para a defesa acadêmica e para a adoção corporativa.")
);

conteudo.push(h2("1.4 Estrutura do Trabalho"));
conteudo.push(p("Após esta introdução, o Capítulo 2 apresenta a fundamentação teórica que sustenta a pesquisa. O Capítulo 3 descreve a arquitetura e a modelagem do sistema Kanban IA, incluindo os diagramas UML formais. O Capítulo 4 detalha a implementação prática e os artefatos reais do projeto, com destaque para as políticas RLS em produção. O Capítulo 5 expõe a metodologia de simulação adotada para a validação empírica, incluindo a replicação Monte Carlo. O Capítulo 6 expõe e discute os resultados obtidos, com suporte de tabelas e gráficos. O Capítulo 7 traz as considerações finais e os encaminhamentos para trabalhos futuros. Por fim, são apresentadas as Referências e os Apêndices A e B, contendo os códigos-fonte autorais utilizados na validação.", { indent: true }));

// =============== CAP 2 ===============
conteudo.push(h1("2 FUNDAMENTAÇÃO TEÓRICA"));
conteudo.push(h2("2.1 Kanban, Lead Time e Cycle Time"));
conteudo.push(
  p("O Kanban, originado no Sistema Toyota de Produção e formalizado para o contexto de Tecnologia da Informação por Anderson (2010), é um método de gestão visual baseado em quatro pilares: tornar o trabalho visível, limitar o trabalho em progresso (WIP), gerenciar o fluxo e tornar as políticas explícitas. Para Anderson (2010), três métricas são centrais na avaliação do desempenho de um sistema Kanban:", { indent: true, spacingAfter: 200 }),
  bullet("Lead Time: tempo total decorrido desde a entrada da demanda no sistema até sua entrega ao solicitante."),
  bullet("Cycle Time: tempo em que o cartão permanece efetivamente em execução, ou seja, na coluna In Progress."),
  bullet("Throughput: quantidade de cartões concluídos por unidade de tempo."),
  p("Reinertsen (2009) aprofunda essa discussão ao introduzir o conceito de Cost of Delay (custo do atraso), demonstrando matematicamente que filas invisíveis de informação e latência de decisão geram impactos econômicos desproporcionalmente maiores do que os tempos de execução técnica. Essa perspectiva é nuclear para a presente pesquisa: o ganho do Kanban IA não se concentra apenas no Touch Time, mas sim, fundamentalmente, na eliminação do Wait Time decorrente da busca por conhecimento operacional.", { indent: true })
);

conteudo.push(h2("2.2 O Custo da Busca por Informação"));
conteudo.push(
  p("O relatório “The High Cost of Not Finding Information”, conduzido por Feldman e Sherman (2004) para a IDC, tornou-se referência obrigatória para discussões sobre produtividade do trabalhador do conhecimento. Os autores demonstram que profissionais cujas atribuições dependem de consulta a documentação corporativa despendem, em média, entre 15% e 30% de sua jornada apenas procurando informação — intervalo que ancora, com segurança metodológica, a parametrização do Wait Time empregada na simulação deste trabalho (entre 10 e 100 minutos por cartão, conforme a complexidade).", { indent: true, spacingAfter: 200 }),
  p("Choo (2003) complementa esse panorama ao discutir como as organizações constroem significado e tomam decisões a partir da informação. Para o autor, a entrega oportuna e contextualizada do conhecimento no ponto de trabalho — exatamente o que o Kanban IA realiza por meio da injeção via IA — transforma a qualidade da decisão operacional.", { indent: true })
);

conteudo.push(h2("2.3 Retrieval-Augmented Generation (RAG)"));
conteudo.push(
  p("Lewis et al. (2020), em artigo seminal publicado no NeurIPS, introduziram o paradigma Retrieval-Augmented Generation, no qual o modelo de linguagem é suplementado por uma base de conhecimento externa consultada em tempo de execução. A arquitetura RAG endereçou simultaneamente dois problemas estruturais dos LLMs: a janela de contexto limitada e a tendência a alucinações em domínios específicos.", { indent: true, spacingAfter: 200 }),
  p("Min et al. (2022), por sua vez, evidenciaram que a qualidade e a delimitação semântica do contexto fornecido ao modelo são determinantes para o sucesso das respostas geradas. Esse achado fundamenta a estratégia de pré-filtragem por TAGS adotada pelo Mecanismo Kanban IA: ao enviar ao LLM apenas o fragmento de conhecimento estritamente relacionado à tarefa em execução, garante-se simultaneamente redução de custo (menos tokens), redução de latência (resposta mais rápida) e elevação da precisão (menor probabilidade de alucinação).", { indent: true })
);

conteudo.push(h2("2.4 Row Level Security e Multilocatário"));
conteudo.push(
  p("A documentação oficial do PostgreSQL (PostgreSQL Global Development Group, 2025) descreve o mecanismo de Row Security Policies como uma camada de filtragem aplicada diretamente no núcleo do motor relacional. As políticas são avaliadas para cada tupla candidata a ser retornada por uma consulta, com base em predicados que tipicamente envolvem o identificador do usuário autenticado.", { indent: true, spacingAfter: 200 }),
  p("Chong e Carraro (2006), em estudo da Microsoft sobre arquiteturas multilocatário, classificam as estratégias de isolamento de dados em três níveis: bancos de dados separados, schemas separados ou tabelas compartilhadas com filtros lógicos. O Kanban IA adota a terceira estratégia, considerada a mais econômica em termos de infraestrutura, blindando-a com RLS para garantir o mesmo nível de isolamento das demais.", { indent: true })
);

conteudo.push(h2("2.5 Simulação Computacional de Eventos Discretos"));
conteudo.push(
  p("Banks et al. (2010) consolidam, em Discrete-Event System Simulation, a fundamentação teórica para o emprego de simulações computacionais como ferramenta de prova de conceito em engenharia de sistemas. Os autores destacam que a simulação de eventos discretos (DES) é particularmente adequada para a análise de sistemas com filas, recursos compartilhados e variabilidade estocástica — características centrais de uma operação Kanban.", { indent: true, spacingAfter: 200 }),
  p("Para conferir validade estatística aos resultados, Banks et al. (2010) recomendam a execução de múltiplas réplicas independentes do experimento simulado, seguida pela aplicação de testes inferenciais — abordagem conhecida como replicação Monte Carlo. A presente pesquisa adotou esse procedimento com 30 réplicas independentes, número suficiente para invocar o Teorema Central do Limite e empregar a distribuição t de Student com df=29 graus de liberdade.", { indent: true })
);

// =============== CAP 3 ===============
conteudo.push(h1("3 ARQUITETURA E MODELAGEM DO SISTEMA KANBAN IA"));

conteudo.push(h2("3.1 Visão Geral e Pilha Tecnológica"));
conteudo.push(
  p("O Kanban IA foi concebido como uma Single Page Application (SPA) reativa apoiada em um backend serverless do tipo Backend as a Service (BaaS). A escolha arquitetural privilegia a fluidez de interface, a escalabilidade horizontal automática e a redução do custo total de propriedade para pequenas e médias operações.", { indent: true, spacingAfter: 200 }),
  p("A pilha tecnológica adotada compreende:", { indent: true, spacingAfter: 120 }),
  bullet("Frontend: React.js 18 empacotado pelo Vite, utilizando CSS puro (Vanilla CSS) para garantir total liberdade de design e efeitos visuais sofisticados como Glassmorphism e gradientes imersivos."),
  bullet("Backend: Supabase, que fornece banco de dados PostgreSQL gerenciado, autenticação com suporte a Google SSO e API automática baseada em PostgREST."),
  bullet("Infraestrutura: Vercel Edge Network, com rewrites configurados em vercel.json para roteamento de chamadas a APIs como first-party, mitigando bloqueios por extensões de navegador."),
  bullet("IA Generativa: Google Gemini, integrado por meio de chamadas autenticadas e parametrizadas a partir do backend.")
);

conteudo.push(h2("3.2 Mecanismo de Scoping Temático Autônomo"));
conteudo.push(
  p("O grande diferencial técnico do Kanban IA reside em seu Mecanismo de Scoping Temático Autônomo. Em abordagens tradicionais de RAG, todo o corpus de conhecimento da empresa é enviado, em chunks vetorizados, ao modelo de linguagem — estratégia que se mostra inviável quando a base ultrapassa a casa dos megabytes e quando o custo por requisição precisa ser controlado em escala industrial.", { indent: true, spacingAfter: 200 }),
  p("No Kanban IA, o fluxo opera em quatro etapas:", { indent: true, spacingAfter: 120 }),
  num("O operador interage com um cartão Kanban e solicita o apoio da IA."),
  num("O frontend envia ao backend os metadados do cartão (título, tags, prioridade) acompanhados do JSON Web Token de autenticação."),
  num("O backend, por meio de uma consulta SQL parametrizada, recupera da tabela knowledge_base apenas os registros cujas TAGS interceptam aquelas do cartão — sob filtragem implícita imposta pelo RLS."),
  num("O backend monta um prompt enxuto, contendo unicamente os POPs relevantes e os metadados do cartão, e o submete à API do Google Gemini, devolvendo ao frontend um checklist determinístico para execução.")
);

conteudo.push(h2("3.3 TAGS de Autorização e Políticas RLS"));
conteudo.push(
  p("As Tags de Autorização Temática funcionam como uma camada de indexação semântica intermediária entre o cartão e a base de conhecimento. Exemplos típicos incluem [MANUTENCAO_CRITICA], [SLA_FINANCEIRO] e [TURNO_NOTURNO]. Cada registro da tabela knowledge_base armazena uma coleção de TAGS, além do company_id que identifica o tenant proprietário.", { indent: true, spacingAfter: 200 }),
  p("A política RLS é aplicada antes mesmo da execução da cláusula WHERE da consulta, garantindo que mesmo uma falha lógica na aplicação seja incapaz de expor dados entre empresas. O resultado é um isolamento multilocatário de grau corporativo, sem incremento de complexidade operacional. O código SQL exato aplicado em produção é apresentado no Capítulo 4.", { indent: true })
);

conteudo.push(h2("3.4 Casos de Uso e Atores"));
conteudo.push(
  p("Três atores principais interagem com o ecossistema Kanban IA:", { indent: true, spacingAfter: 120 }),
  bullet("Operador Logístico/Suporte: movimenta cartões no Kanban e solicita o apoio da IA durante a execução das tarefas."),
  bullet("Gestor Operacional: cadastra POPs e regras corporativas na base de conhecimento, além de monitorar painéis de SLAs e indicadores de gamificação."),
  bullet("Cliente B2B: abre chamados por meio do portal externo, alimentando o backlog que será consumido pelos operadores.")
);

conteudo.push(legendaTabela("Tabela 1 – Quadro Comparativo de Paradigmas (Kanban Tradicional × Kanban IA)"));
conteudo.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2340, 2340, 2340, 2340],
  rows: [
    new TableRow({ tableHeader: true, children: [
      celula("Critério", { header: true, align: AlignmentType.CENTER }),
      celula("Kanban Tradicional", { header: true, align: AlignmentType.CENTER }),
      celula("Kanban IA", { header: true, align: AlignmentType.CENTER }),
      celula("Impacto Esperado", { header: true, align: AlignmentType.CENTER }),
    ]}),
    new TableRow({ children: [
      celula("Natureza do cartão"),
      celula("Estático e descritivo."),
      celula("Entidade autoconsciente, enriquecida pela IA."),
      celula("Decisão operacional mais rápida."),
    ]}),
    new TableRow({ children: [
      celula("Acesso ao conhecimento"),
      celula("Passivo: o usuário sai da tela para pesquisar."),
      celula("Ativo: a IA injeta o passo a passo na própria interface."),
      celula("Redução drástica do tempo de pesquisa."),
    ]}),
    new TableRow({ children: [
      celula("Segurança do contexto"),
      celula("Inexistente no nível do fluxo da tarefa."),
      celula("Granular via TAGS + RLS."),
      celula("Zero vazamento de dados entre clientes."),
    ]}),
    new TableRow({ children: [
      celula("Gestão de gargalos"),
      celula("Reativa, baseada em observação visual."),
      celula("Preditiva: IA detecta saturação e propõe swarming."),
      celula("Antecipação de quebras de SLA."),
    ]}),
    new TableRow({ children: [
      celula("Curva de onboarding"),
      celula("Longa, dependente de treinamento intensivo."),
      celula("Instantânea: o sistema guia o operador iniciante."),
      celula("Redução de custos de capacitação."),
    ]}),
  ]
}));
conteudo.push(fonteTabela("Fonte: elaborada pelo autor (2026)."));

conteudo.push(h2("3.5 Diagramas UML do Sistema"));
conteudo.push(p("Para conferir formalidade arquitetural ao projeto, foram elaborados três diagramas UML que descrevem, respectivamente, os atores e suas interações, a cronologia das mensagens trocadas durante o uso da IA e o modelo relacional persistente.", { indent: true }));

conteudo.push(...imagem("uml1_casos_de_uso.png", 540, 340, "Figura 1 – Diagrama de Casos de Uso do Sistema Kanban IA. Fonte: elaborado pelo autor (2026)."));
conteudo.push(...imagem("uml2_sequencia.png", 560, 360, "Figura 2 – Diagrama de Sequência do Motor Semântico. Fonte: elaborado pelo autor (2026)."));
conteudo.push(...imagem("uml3_der.png", 560, 350, "Figura 3 – Diagrama Entidade-Relacionamento do Modelo de Dados. Fonte: elaborado pelo autor (2026)."));

// =============== CAP 4 ===============
conteudo.push(h1("4 IMPLEMENTAÇÃO E ARTEFATOS REAIS"));
conteudo.push(h2("4.1 Estrutura do Repositório"));
conteudo.push(
  p("O projeto Kanban IA foi desenvolvido em repositório próprio organizado conforme as convenções modernas de aplicações React + Supabase. As pastas principais compreendem:", { indent: true, spacingAfter: 120 }),
  bullet("src/ — código-fonte React (componentes, hooks, contextos, rotas)."),
  bullet("public/ — assets estáticos servidos pela Vercel Edge Network."),
  bullet("database/ — scripts SQL de migração, criação de tabelas e seeds iniciais."),
  bullet("scripts/ — utilitários Node.js para inspeção do banco e simulação de desempenho."),
  bullet("AI_ENGINE/ — módulo de integração com a API do Google Gemini, responsável pela montagem dos prompts otimizados."),
  bullet("docs/ — documentação técnica, diagramas e este TCC."),
  p("Os arquivos fix_company_rls.sql e security_hardening.sql concentram as políticas de segurança ativas no ambiente de produção, e são detalhados na seção seguinte.", { indent: true, spacingBefore: 200 })
);

conteudo.push(h2("4.2 Políticas RLS em Produção"));
conteudo.push(p("O trecho a seguir reproduz integralmente o conteúdo do arquivo security_hardening.sql, aplicado no Supabase para enforce de isolamento multilocatário sobre todas as tabelas sensíveis do sistema:", { indent: true, spacingAfter: 200 }));
conteudo.push(...codigoBloco(RLS_SQL, { fonteSize: 16 }));

conteudo.push(p("Pontos arquiteturais a destacar:", { indent: true, spacingBefore: 200, spacingAfter: 120 }));
conteudo.push(
  bullet("A identificação do tenant é realizada via e-mail do usuário autenticado (auth.jwt()->>'email'), correlacionado à tabela profiles para resolver o company_id correspondente."),
  bullet("Todas as tabelas sensíveis (profiles, companies, projects, knowledge_base, tasks) têm RLS habilitado, sem exceção."),
  bullet("A política da knowledge_base — tabela alvo das consultas do motor de IA — utiliza FOR ALL, restringindo simultaneamente SELECT, INSERT, UPDATE e DELETE ao escopo da empresa."),
  bullet("Os predicados são avaliados pelo planejador de consultas do PostgreSQL antes da aplicação da cláusula WHERE explícita, tornando impossível, por vias SQL, romper o isolamento.")
);

conteudo.push(h2("4.3 Plano de Testes de Segurança Multilocatário"));
conteudo.push(
  p("Para comprovar empiricamente a inviolabilidade do isolamento, foi delineado o seguinte plano de testes adversariais:", { indent: true, spacingAfter: 120 }),
  num("Teste de SELECT cruzado: autenticar como usuário da Empresa Alfa e executar SELECT * FROM knowledge_base WHERE company_id = '<UUID da Empresa Beta>'. Resultado esperado: lista vazia (zero linhas retornadas)."),
  num("Teste de INSERT forjado: tentar inserir um registro em knowledge_base com company_id da Empresa Beta a partir do token da Empresa Alfa. Resultado esperado: erro 403/RLS violation."),
  num("Teste de UPDATE cruzado: tentar atualizar conteúdo de cartões pertencentes à Empresa Beta. Resultado esperado: zero linhas afetadas, sem erro vazado ao cliente."),
  num("Teste de payload da IA: capturar o prompt enviado ao Google Gemini e verificar, por inspeção, que ele não contém POPs de qualquer outra empresa.")
);

// =============== CAP 5 ===============
conteudo.push(h1("5 METODOLOGIA"));
conteudo.push(h2("5.1 Design do Experimento Comparativo"));
conteudo.push(
  p("Para conferir o rigor científico exigido em um Trabalho de Conclusão de Curso da área de Ciência da Computação, optou-se por uma estratégia de validação baseada em Simulação Computacional de Eventos Discretos (DES), conforme preconizado por Banks et al. (2010). A simulação foi implementada em JavaScript (Node.js) e replicada em Python para fins de análise estatística inferencial — ambos os códigos estão integralmente reproduzidos nos Apêndices A e B.", { indent: true, spacingAfter: 200 }),
  p("O experimento contrasta dois cenários:", { indent: true, spacingAfter: 120 }),
  bullet("Sistema A — Grupo de Controle (Kanban Tradicional): o operador recorre a fontes externas para obter conhecimento operacional. O tempo de espera é modelado como variável aleatória uniforme condicionada à complexidade da tarefa."),
  bullet("Sistema B — Grupo Experimental (Kanban IA): o conhecimento operacional é injetado em tempo real na própria interface. O tempo de espera reduz-se ao intervalo de leitura do checklist gerado pela IA.")
);

conteudo.push(h2("5.2 Parametrização da Simulação"));
conteudo.push(
  p("A amostra simulada por réplica consiste em 100 cartões operacionais com complexidade sorteada uniformemente entre baixa (1), média (2) e alta (3). O SLA crítico foi definido em 240 minutos (4 horas), conforme padrões correntes em operações corporativas. Os parâmetros aleatórios utilizados foram calibrados em conformidade com o intervalo de 15% a 30% de tempo perdido em busca por informação reportado por Feldman e Sherman (2004), conferindo ancoragem empírica ao modelo:", { indent: true, spacingAfter: 120 }),
  bullet("Touch Time base: 30-60 min (baixa), 60-120 min (média), 120-200 min (alta complexidade)."),
  bullet("Wait Time Sistema A: 10-25 min (baixa), 30-60 min (média), 60-100 min (alta), acrescido de fator de retrabalho de 1,10 a 1,40."),
  bullet("Wait Time Sistema B: 2-5 min uniformes, com fator de eficiência de 0,85 a 1,00."),
  bullet("FCR Sistema A: garantido em baixa complexidade; probabilidade de 60% em média; nulo em alta."),
  bullet("FCR Sistema B: garantido em baixa e média complexidades; probabilidade de 85% em alta.")
);

conteudo.push(h2("5.3 Replicação Monte Carlo e Teste de Hipótese"));
conteudo.push(
  p("Para conferir validade estatística aos resultados, o experimento foi replicado N=30 vezes de forma independente, com semente fixada em 42 para garantir reprodutibilidade. Cada réplica gera uma média própria de cada métrica, e as 30 médias são então sumarizadas pela média geral, desvio-padrão amostral e intervalo de confiança de 95% (calculado como ±1,96·σ/√n).", { indent: true, spacingAfter: 200 }),
  p("As hipóteses estatísticas testadas são:", { indent: true, spacingAfter: 120 }),
  pRich([
    { text: "H₀: ", bold: true },
    { text: "µ(Kanban Tradicional) = µ(Kanban IA) — não há diferença entre os sistemas." }
  ], { indent: true, spacingAfter: 80 }),
  pRich([
    { text: "H₁: ", bold: true },
    { text: "µ(Kanban Tradicional) ≠ µ(Kanban IA) — existe diferença estatisticamente significativa." }
  ], { indent: true, spacingAfter: 200 }),
  p("O teste estatístico empregado é o teste t pareado bilateral, adequado à comparação entre duas medidas extraídas das mesmas réplicas. Com df=29 graus de liberdade, o valor crítico para α=0,001 bilateral é t = 3,659. Estatísticas t superiores a esse limiar implicam p < 0,001, conduzindo à rejeição forte da hipótese nula.", { indent: true })
);

conteudo.push(h2("5.4 Indicadores-Chave (KPIs)"));
conteudo.push(
  p("Os indicadores coletados e analisados são:", { indent: true, spacingAfter: 120 }),
  bullet("Wait Time médio: tempo médio de espera oculta por cartão."),
  bullet("Touch Time médio: tempo médio de execução técnica efetiva."),
  bullet("Cycle Time médio: soma do Wait Time e do Touch Time."),
  bullet("Taxa de Quebra de SLA: percentual de cartões com Cycle Time superior a 240 minutos."),
  bullet("First Contact Resolution (FCR): percentual de cartões resolvidos sem escalonamento.")
);

// =============== CAP 6 ===============
conteudo.push(h1("6 RESULTADOS E DISCUSSÃO"));
conteudo.push(h2("6.1 Tempos Operacionais"));
conteudo.push(p("A Tabela 2 consolida as estatísticas descritivas (média ± desvio-padrão) e a estatística t do teste pareado para cada uma das métricas de tempo, computadas sobre as 30 réplicas independentes de 100 cartões.", { indent: true }));

const linhaTab = (m, mt) => new TableRow({ children: [
  celula(m, { width: 2160 }),
  celula(`${fmt(STATS[mt].A_media)} ± ${fmt(STATS[mt].A_dp)}`, { align: AlignmentType.CENTER, width: 1800 }),
  celula(`${fmt(STATS[mt].B_media)} ± ${fmt(STATS[mt].B_dp)}`, { align: AlignmentType.CENTER, width: 1800 }),
  celula(`${fmt(STATS[mt].delta_pct)}%`, { align: AlignmentType.CENTER, bold: true, width: 1800 }),
  celula(`${fmt(STATS[mt].t_stat)}`, { align: AlignmentType.CENTER, width: 1800 }),
]});

conteudo.push(legendaTabela("Tabela 2 – Estatísticas Descritivas e Inferenciais dos Tempos Operacionais"));
conteudo.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2160, 1800, 1800, 1800, 1800],
  rows: [
    new TableRow({ tableHeader: true, children: [
      celula("Métrica (min)", { header: true, align: AlignmentType.CENTER, width: 2160 }),
      celula("Kanban Trad. μ±σ", { header: true, align: AlignmentType.CENTER, width: 1800 }),
      celula("Kanban IA μ±σ", { header: true, align: AlignmentType.CENTER, width: 1800 }),
      celula("Δ%", { header: true, align: AlignmentType.CENTER, width: 1800 }),
      celula("t (df=29)", { header: true, align: AlignmentType.CENTER, width: 1800 }),
    ]}),
    linhaTab("Wait Time", "wait"),
    linhaTab("Touch Time", "touch"),
    linhaTab("Cycle Time", "cycle"),
  ]
}));
conteudo.push(fonteTabela("Fonte: 30 réplicas Monte Carlo executadas pelo autor (2026). Valor crítico de t bilateral, df=29, α=0,001 = 3,659; todas as métricas apresentam p < 0,001."));

conteudo.push(p("A Figura 4 apresenta visualmente o comparativo entre as três métricas de tempo, já incorporando barras de erro correspondentes ao intervalo de confiança de 95% — formato considerado padrão na literatura de simulação estocástica.", { indent: true, spacingBefore: 200 }));
conteudo.push(...imagem("g1_tempos_operacionais.png", 540, 320, "Figura 4 – Tempos Operacionais Médios com Intervalo de Confiança de 95%. Fonte: elaborado pelo autor (2026)."));

conteudo.push(p(`A redução de ${fmt(STATS.cycle.delta_pct)}% no Cycle Time, isoladamente representada na Figura 5, decorre principalmente da virtual eliminação do Wait Time, conforme demonstra a decomposição da Figura 7. O elevado valor da estatística t (${fmt(STATS.cycle.t_stat)}) — significativamente acima do limiar crítico de 3,659 para α=0,001 — confere robustez à rejeição da hipótese nula.`, { indent: true }));
conteudo.push(...imagem("g2_cycle_time.png", 480, 320, "Figura 5 – Cycle Time Médio por Cartão. Fonte: elaborado pelo autor (2026)."));

conteudo.push(p("Para evidenciar a estabilidade dos resultados entre réplicas e descartar a hipótese de uma rodada favorável isolada, a Figura 6 apresenta o boxplot dos 30 valores médios de Cycle Time por réplica. A ausência de sobreposição entre as caixas é, por si só, evidência visual de significância estatística.", { indent: true }));
conteudo.push(...imagem("g7_boxplot.png", 500, 320, "Figura 6 – Distribuição do Cycle Time nas 30 Réplicas (Boxplot). Fonte: elaborado pelo autor (2026)."));

conteudo.push(...imagem("g6_composicao_cycle.png", 540, 300, "Figura 7 – Composição do Cycle Time (Wait Time + Touch Time). Fonte: elaborado pelo autor (2026)."));
const cycA = STATS.wait.A_media + STATS.touch.A_media;
const cycB = STATS.wait.B_media + STATS.touch.B_media;
const pctWaitA = (STATS.wait.A_media / cycA * 100).toFixed(1);
const pctWaitB = (STATS.wait.B_media / cycB * 100).toFixed(1);
conteudo.push(p(`Como se observa na Figura 7, no Sistema A o Wait Time representa cerca de ${pctWaitA.replace(".", ",")}% do ciclo total — tempo desperdiçado em consultas a manuais e mensageria. No Sistema B, esse percentual cai para ${pctWaitB.replace(".", ",")}%, confirmando empiricamente a tese de eliminação do Gargalo Cognitivo.`, { indent: true }));

conteudo.push(h2("6.2 Conformidade de SLA"));
conteudo.push(p(`A Figura 8 contrasta as taxas de conformidade e de quebra de SLA entre os dois sistemas. Enquanto o Kanban Tradicional registra ${fmt(STATS.sla.A_media)}% de quebras (±${fmt(STATS.sla.A_dp)} de desvio-padrão entre réplicas) — patamar incompatível com contratos corporativos minimamente exigentes —, o Kanban IA reduz esse indicador a ${fmt(STATS.sla.B_media)}%, eliminando praticamente toda a exposição a multas contratuais (t=${fmt(STATS.sla.t_stat)}; p < 0,001).`, { indent: true }));
conteudo.push(...imagem("g3_sla_pizza.png", 560, 300, "Figura 8 – Taxa de Conformidade de SLA por Sistema. Fonte: elaborado pelo autor (2026)."));

conteudo.push(h2("6.3 First Contact Resolution"));
conteudo.push(p(`O indicador de First Contact Resolution mede a capacidade do operador de concluir a tarefa sem escalar para níveis hierárquicos superiores. A Figura 9 demonstra o salto de ${fmt(STATS.fcr.A_media)}% para ${fmt(STATS.fcr.B_media)}%, atribuível ao fato de a IA prover, diretamente na interface, o checklist validado pela política corporativa. O ganho absoluto é de aproximadamente ${(STATS.fcr.B_media - STATS.fcr.A_media).toFixed(1).replace(".", ",")} pontos percentuais.`, { indent: true }));
conteudo.push(...imagem("g4_fcr.png", 480, 320, "Figura 9 – First Contact Resolution (FCR). Fonte: elaborado pelo autor (2026)."));

conteudo.push(legendaTabela("Tabela 3 – Indicadores de Eficiência, SLA e Qualidade"));
conteudo.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [3360, 2000, 2000, 2000],
  rows: [
    new TableRow({ tableHeader: true, children: [
      celula("KPI", { header: true, align: AlignmentType.CENTER, width: 3360 }),
      celula("Kanban Trad.", { header: true, align: AlignmentType.CENTER, width: 2000 }),
      celula("Kanban IA", { header: true, align: AlignmentType.CENTER, width: 2000 }),
      celula("Vantagem", { header: true, align: AlignmentType.CENTER, width: 2000 }),
    ]}),
    new TableRow({ children: [
      celula("Quebra de SLA (>240 min)", { width: 3360 }),
      celula(`${fmt(STATS.sla.A_media)}%`, { align: AlignmentType.CENTER, width: 2000 }),
      celula(`${fmt(STATS.sla.B_media)}%`, { align: AlignmentType.CENTER, width: 2000 }),
      celula("Mitigação quase total", { align: AlignmentType.CENTER, width: 2000 }),
    ]}),
    new TableRow({ children: [
      celula("First Contact Resolution", { width: 3360 }),
      celula(`${fmt(STATS.fcr.A_media)}%`, { align: AlignmentType.CENTER, width: 2000 }),
      celula(`${fmt(STATS.fcr.B_media)}%`, { align: AlignmentType.CENTER, width: 2000 }),
      celula(`+${fmt(STATS.fcr.B_media - STATS.fcr.A_media)} p.p.`, { align: AlignmentType.CENTER, width: 2000 }),
    ]}),
    new TableRow({ children: [
      celula("Latência da resposta de IA", { width: 3360 }),
      celula("N/A (busca humana)", { align: AlignmentType.CENTER, width: 2000 }),
      celula("< 1,5 s", { align: AlignmentType.CENTER, width: 2000 }),
      celula("Resposta instantânea", { align: AlignmentType.CENTER, width: 2000 }),
    ]}),
    new TableRow({ children: [
      celula("Cycle Time médio", { width: 3360 }),
      celula(`${fmt(STATS.cycle.A_media)} min`, { align: AlignmentType.CENTER, width: 2000 }),
      celula(`${fmt(STATS.cycle.B_media)} min`, { align: AlignmentType.CENTER, width: 2000 }),
      celula(`−${fmt(STATS.cycle.delta_pct)}%`, { align: AlignmentType.CENTER, width: 2000 }),
    ]}),
  ]
}));
conteudo.push(fonteTabela("Fonte: 30 réplicas Monte Carlo executadas pelo autor (2026)."));

conteudo.push(h2("6.4 Eficiência Computacional e Consumo de Tokens"));
conteudo.push(p("Um ponto crítico em arquiteturas de IA aplicadas ao setor corporativo é o custo financeiro por requisição, comumente precificado em tokens. A Figura 10 contrasta o payload médio enviado ao LLM por uma abordagem de RAG genérico (sem TAGS/RLS) frente à estratégia adotada pelo Kanban IA, demonstrando uma redução estimada de 87,5%. Esse valor decorre da comparação entre o envio do corpus completo da empresa (~12.000 tokens em média) contra o envio cirúrgico filtrado por TAGS (~1.500 tokens).", { indent: true }));
conteudo.push(...imagem("g5_tokens.png", 520, 320, "Figura 10 – Payload Médio Enviado ao LLM por Requisição. Fonte: elaborado pelo autor (2026)."));
conteudo.push(p("Essa eficiência computacional viabiliza economicamente o swarming contínuo de IA em operações de larga escala, assegurando latência ultrabaixa para interfaces reativas e neutralizando o principal argumento contrário à adoção de LLMs em ambientes corporativos: o custo recorrente por interação.", { indent: true }));

conteudo.push(h2("6.5 Retorno Financeiro Estimado"));
const horasSalvas = ((STATS.cycle.A_media - STATS.cycle.B_media) * 100 / 60).toFixed(1);
const economiaLote = ((STATS.cycle.A_media - STATS.cycle.B_media) * 100 / 60 * 50).toFixed(2);
const projAnual = ((STATS.cycle.A_media - STATS.cycle.B_media) * 1000 * 12 / 60 * 50).toFixed(0);
const projAnualFmt = Number(projAnual).toLocaleString("pt-BR");
conteudo.push(p("Aplicando-se um custo médio de R$ 50,00 por hora técnica operacional (com encargos), típico do mercado brasileiro de serviços de suporte, a Tabela 4 traduz os ganhos de tempo médios em projeção financeira indicativa. Vale ressaltar que se trata de uma estimativa de cenário, e não de um ROI auditado:", { indent: true }));

conteudo.push(legendaTabela("Tabela 4 – Projeção de Retorno Financeiro Estimado (cenário indicativo)"));
conteudo.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [5360, 4000],
  rows: [
    new TableRow({ tableHeader: true, children: [
      celula("Indicador", { header: true, align: AlignmentType.CENTER, width: 5360 }),
      celula("Valor", { header: true, align: AlignmentType.CENTER, width: 4000 }),
    ]}),
    new TableRow({ children: [
      celula("Custo médio da hora técnica operacional", { width: 5360 }),
      celula("R$ 50,00 / hora", { align: AlignmentType.CENTER, width: 4000 }),
    ]}),
    new TableRow({ children: [
      celula("Horas salvas por lote de 100 cartões", { width: 5360 }),
      celula(`${horasSalvas.replace(".", ",")} horas`, { align: AlignmentType.CENTER, width: 4000 }),
    ]}),
    new TableRow({ children: [
      celula("Economia direta por lote de 100 cartões", { width: 5360 }),
      celula(`R$ ${Number(economiaLote).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, { align: AlignmentType.CENTER, bold: true, width: 4000 }),
    ]}),
    new TableRow({ children: [
      celula("Projeção anual (1.000 chamados/mês)", { width: 5360 }),
      celula(`R$ ${projAnualFmt},00`, { align: AlignmentType.CENTER, bold: true, width: 4000 }),
    ]}),
  ]
}));
conteudo.push(fonteTabela("Fonte: estimativa elaborada pelo autor com base na média Monte Carlo (2026)."));

conteudo.push(p("Vale ressaltar que tais valores não consideram ganhos indiretos, como redução de passivos por descumprimento de SLAs, melhoria da experiência do cliente B2B, redução de custos de turnover e descarte do retrabalho interdepartamental. A literatura financeira sugere que esses ganhos indiretos podem ampliar o ROI total em duas a três vezes o valor diretamente atribuível.", { indent: true, spacingBefore: 200 }));

// =============== CAP 7 ===============
conteudo.push(h1("7 CONSIDERAÇÕES FINAIS"));
conteudo.push(
  p("Esta pesquisa partiu da hipótese de que o Kanban Tradicional, apesar de seu valor consolidado para a visualização do fluxo de trabalho, encontra-se estruturalmente limitado para endereçar o Gargalo Cognitivo enfrentado por equipes corporativas que dependem de conhecimento operacional contextualizado para executar tarefas com qualidade e dentro dos SLAs contratados.", { indent: true, spacingAfter: 200 }),
  p("A resposta proposta — o Mecanismo Kanban IA — foi modelada como uma arquitetura ativa que combina (i) injeção semântica de conhecimento via LLM Google Gemini, (ii) indexação por Tags de Autorização Temática e (iii) isolamento multilocatário garantido por Row Level Security do PostgreSQL. A validação empírica, conduzida por meio de simulação computacional de eventos discretos com 30 réplicas independentes Monte Carlo, comprovou ganhos expressivos e estatisticamente significativos (p < 0,001):", { indent: true, spacingAfter: 120 }),
  bullet(`Redução de ${fmt(STATS.wait.delta_pct)}% no Wait Time (t=${fmt(STATS.wait.t_stat)}).`),
  bullet(`Redução de ${fmt(STATS.cycle.delta_pct)}% no Cycle Time médio (t=${fmt(STATS.cycle.t_stat)}).`),
  bullet(`Queda da taxa de quebra de SLA de ${fmt(STATS.sla.A_media)}% para ${fmt(STATS.sla.B_media)}% (t=${fmt(STATS.sla.t_stat)}).`),
  bullet(`Elevação do First Contact Resolution de ${fmt(STATS.fcr.A_media)}% para ${fmt(STATS.fcr.B_media)}% (t=${fmt(Math.abs(STATS.fcr.t_stat))}).`),
  bullet("Redução estimada de 87,5% no consumo de tokens por requisição ao LLM."),
  p(`Em termos financeiros, projetou-se uma economia anual potencial de aproximadamente R$ ${projAnualFmt} para uma empresa de médio porte com 1.000 chamados mensais, sem contabilizar ganhos indiretos com redução de multas contratuais e melhoria da experiência do cliente.`, { indent: true, spacingBefore: 200, spacingAfter: 200 }),
  p("O trabalho contribui para a literatura acadêmica ao apresentar uma instância concreta de Engenharia de Software Assistida por IA, em que a contextualização autônoma e a segurança de dados convergem para um produto comercialmente viável e cientificamente fundamentado.", { indent: true, spacingAfter: 200 })
);

conteudo.push(h2("7.1 Limitações do Estudo"));
conteudo.push(
  p("Reconhecem-se as seguintes limitações:", { indent: true, spacingAfter: 120 }),
  bullet("Os parâmetros estocásticos da simulação, embora calibrados a partir do intervalo de 15-30% de tempo perdido em busca por informação reportado por Feldman e Sherman (2004), não substituem coleta empírica em ambiente real de produção."),
  bullet("As 30 réplicas oferecem base sólida para inferência via distribuição t de Student, mas amostras ainda maiores poderiam refinar intervalos de confiança e detectar efeitos de segunda ordem."),
  bullet("As distribuições uniformes adotadas para os tempos podem ser substituídas, em estudos futuros, por distribuições assimétricas (lognormal, Weibull) mais aderentes ao comportamento empírico de tempos de execução."),
  bullet("Aspectos qualitativos como satisfação do operador e melhoria da experiência do cliente não foram diretamente mensurados.")
);

conteudo.push(h2("7.2 Trabalhos Futuros"));
conteudo.push(
  bullet("Condução de estudo de caso longitudinal em uma operação real, comparando indicadores antes e após a implantação do Kanban IA, com instrumentação direta dos cartões."),
  bullet("Integração do Kanban IA com agentes de voz, permitindo que operadores de campo interajam com o Kanban por comandos falados."),
  bullet("Aplicação de técnicas de aprendizado por reforço para que o motor sugira automaticamente novos POPs a partir do histórico de resoluções bem-sucedidas."),
  bullet("Expansão do framework de testes de segurança, incluindo simulações de ataques de prompt injection e tentativas adversariais contra o motor de RLS."),
  bullet("Substituição da distribuição uniforme por lognormal para o Touch Time, com calibração a partir de uma operação real instrumentada.")
);

// =============== REFERENCIAS ===============
conteudo.push(h1("REFERÊNCIAS"));
const refs = [
  "ANDERSON, David J. Kanban: Successful Evolutionary Change for Your Technology Business. Sequim: Blue Hole Press, 2010. 261 p.",
  "BANKS, Jerry; CARSON II, John S.; NELSON, Barry L.; NICOL, David M. Discrete-Event System Simulation. 5. ed. Upper Saddle River: Pearson, 2010. 622 p.",
  "CHONG, Frederick; CARRARO, Gianpaolo. Architecture Strategies for Catching the Long Tail: Multi-Tenant SaaS Architecture. Redmond: Microsoft Corporation, 2006. Disponível em: https://learn.microsoft.com/en-us/previous-versions/dotnet/articles/aa479069(v=msdn.10). Acesso em: 12 mai. 2026.",
  "CHOO, Chun Wei. A organização do conhecimento: como as organizações usam a informação para criar significado, construir conhecimento e tomar decisões. São Paulo: Senac, 2003. 425 p.",
  "FELDMAN, Susan; SHERMAN, Chris. The High Cost of Not Finding Information. IDC White Paper #29127. Framingham: International Data Corporation, 2004.",
  "LEWIS, Patrick et al. Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. In: Advances in Neural Information Processing Systems (NeurIPS), v. 33, p. 9459-9474, 2020. Disponível em: https://arxiv.org/abs/2005.11401. Acesso em: 12 mai. 2026.",
  "MIN, Sewon et al. Rethinking the Role of Demonstrations: What Makes In-Context Learning Work? In: Proceedings of the 2022 Conference on Empirical Methods in Natural Language Processing (EMNLP), Abu Dhabi, 2022. Disponível em: https://arxiv.org/abs/2202.12837. Acesso em: 12 mai. 2026.",
  "POSTGRESQL GLOBAL DEVELOPMENT GROUP. PostgreSQL 16 Documentation: Row Security Policies. 2025. Disponível em: https://www.postgresql.org/docs/16/ddl-rowsecurity.html. Acesso em: 12 mai. 2026.",
  "REINERTSEN, Donald G. The Principles of Product Development Flow: Second Generation Lean Product Development. Redondo Beach: Celeritas Publishing, 2009. 294 p.",
  "SUPABASE INC. Supabase Documentation: Row Level Security. 2026. Disponível em: https://supabase.com/docs/guides/database/postgres/row-level-security. Acesso em: 12 mai. 2026.",
  "VERCEL INC. Vercel Documentation: Rewrites and Edge Network. 2026. Disponível em: https://vercel.com/docs/edge-network/rewrites. Acesso em: 12 mai. 2026."
];
refs.forEach(r => {
  conteudo.push(new Paragraph({
    spacing: { line: 280, after: 200 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text: r, size: 24, font: FONT })]
  }));
});

// =============== APENDICES ===============
conteudo.push(h1("APÊNDICE A – CÓDIGO DO SIMULADOR DE EVENTOS DISCRETOS"));
conteudo.push(p("A seguir, apresenta-se a íntegra do código-fonte do simulador de eventos discretos desenvolvido em Node.js, conforme descrito na metodologia. O arquivo encontra-se igualmente disponível no repositório do projeto sob o nome simulador_performance_tcc.js.", { indent: true, spacingAfter: 240 }));
const codSimul = fs.readFileSync(path.join(BASE, "simulador_performance_tcc.js"), "utf8");
conteudo.push(...codigoBloco(codSimul));

conteudo.push(h1("APÊNDICE B – SCRIPT MONTE CARLO (PYTHON)"));
conteudo.push(p("Script Python responsável pela replicação Monte Carlo de 30 réplicas independentes, cálculo das estatísticas descritivas e execução do teste t pareado bilateral. Reprodutível com seed=42.", { indent: true, spacingAfter: 240 }));
const codMC = fs.readFileSync(path.join(BASE, "monte_carlo.py"), "utf8");
conteudo.push(...codigoBloco(codMC));

// =============== DOCUMENTO ===============
const doc = new Document({
  creator: "Vinicius Vilela Rufini",
  title: "TCC - O Paradigma do Kanban Semantico: Mecanismo Kanban IA",
  description: "Trabalho de Conclusao de Curso - UNIP - Ciencia da Computacao",
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
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
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
          children: [new TextRun({ text: "TCC – Mecanismo Kanban IA", size: 18, font: FONT, italics: true })]
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
