/**
 * Extrai Capitulo 1 e Capitulo 2 do TCC COMPLETO como documentos separados.
 * Texto VERBATIM do build_tcc.cjs (fonte da verdade).
 * Gera: TCC_Capitulo1_Introducao.docx e TCC_Capitulo2_FundamentacaoTeorica.docx
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, LevelFormat, HeadingLevel, PageBreak, PageNumber
} = require("docx");

const BASE = "C:\\Users\\vinic\\Desktop\\kabania\\meuTcc";
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
  return new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.LEFT,
    spacing: { before: 480, after: 360, line: 360 }, pageBreakBefore: true,
    children: [new TextRun({ text, bold: true, size: 28, font: FONT })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, alignment: AlignmentType.LEFT,
    spacing: { before: 360, after: 240, line: 360 },
    children: [new TextRun({ text, bold: true, size: 26, font: FONT })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, alignment: AlignmentType.LEFT,
    spacing: { before: 280, after: 180, line: 360 },
    children: [new TextRun({ text, bold: true, italics: true, size: 24, font: FONT })] });
}
function num(text) {
  return new Paragraph({ numbering: { reference: "numbers", level: 0 },
    spacing: { line: 360, after: 60 }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, size: 24, font: FONT })] });
}
function bullet(text) {
  return new Paragraph({ numbering: { reference: "bullets", level: 0 },
    spacing: { line: 360, after: 60 }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, size: 24, font: FONT })] });
}
function ref(text) {
  return new Paragraph({ spacing: { line: 280, after: 200 }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, size: 24, font: FONT })] });
}
function blank(n = 1) { return Array.from({ length: n }, () => p("")); }

// ---- Pre-textuais reutilizaveis ----
function capa(rotuloCap) {
  return [
    p("UNIVERSIDADE PAULISTA – UNIP", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 240 }),
    p("CURSO DE CIÊNCIA DA COMPUTAÇÃO", { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 720 }),
    ...blank(6),
    p("VINICIUS VILELA RUFINI", { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 720 }),
    ...blank(5),
    p("O PARADIGMA DO KANBAN SEMÂNTICO:", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 120 }),
    p("OTIMIZAÇÃO DE PERFORMANCE OPERACIONAL ATRAVÉS DO MECANISMO KANBAN IA COM CONTEXTUALIZAÇÃO AUTÔNOMA VIA LLMs E CONTROLE DE ACESSO POR TAGS (RLS)",
      { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 480 }),
    ...blank(2),
    p(rotuloCap, { align: AlignmentType.CENTER, bold: true, italic: true, size: 24, spacingAfter: 480 }),
    ...blank(6),
    p("SÃO PAULO", { align: AlignmentType.CENTER, bold: true, size: 24, spacingAfter: 120 }),
    p("2026", { align: AlignmentType.CENTER, bold: true, size: 24 }),
    new Paragraph({ children: [new PageBreak()] })
  ];
}
function folhaRosto(descricao) {
  return [
    p("VINICIUS VILELA RUFINI", { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 720 }),
    ...blank(5),
    p("O PARADIGMA DO KANBAN SEMÂNTICO:", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 120 }),
    p("OTIMIZAÇÃO DE PERFORMANCE OPERACIONAL ATRAVÉS DO MECANISMO KANBAN IA COM CONTEXTUALIZAÇÃO AUTÔNOMA VIA LLMs E CONTROLE DE ACESSO POR TAGS (RLS)",
      { align: AlignmentType.CENTER, bold: true, size: 26, spacingAfter: 720 }),
    ...blank(4),
    new Paragraph({ alignment: AlignmentType.RIGHT, indent: { left: 4500 }, spacing: { line: 280 },
      children: [new TextRun({ text: descricao, size: 22, font: FONT })] }),
    blank(1)[0],
    new Paragraph({ alignment: AlignmentType.RIGHT, indent: { left: 4500 }, spacing: { line: 280 },
      children: [new TextRun({ text: "Orientador(a): Prof(a). [Nome do Orientador]", size: 22, font: FONT })] }),
    ...blank(10),
    p("SÃO PAULO", { align: AlignmentType.CENTER, bold: true, size: 24, spacingAfter: 120 }),
    p("2026", { align: AlignmentType.CENTER, bold: true, size: 24 }),
    new Paragraph({ children: [new PageBreak()] })
  ];
}

const REFS_TODAS = {
  ANDERSON: "ANDERSON, David J. Kanban: Successful Evolutionary Change for Your Technology Business. Sequim: Blue Hole Press, 2010. 261 p.",
  BANKS: "BANKS, Jerry; CARSON II, John S.; NELSON, Barry L.; NICOL, David M. Discrete-Event System Simulation. 5. ed. Upper Saddle River: Pearson, 2010. 622 p.",
  CHONG: "CHONG, Frederick; CARRARO, Gianpaolo. Architecture Strategies for Catching the Long Tail: Multi-Tenant SaaS Architecture. Redmond: Microsoft Corporation, 2006. Disponível em: https://learn.microsoft.com/en-us/previous-versions/dotnet/articles/aa479069(v=msdn.10). Acesso em: 13 mai. 2026.",
  CHOO: "CHOO, Chun Wei. A organização do conhecimento: como as organizações usam a informação para criar significado, construir conhecimento e tomar decisões. São Paulo: Senac, 2003. 425 p.",
  FELDMAN: "FELDMAN, Susan; SHERMAN, Chris. The High Cost of Not Finding Information. IDC White Paper #29127. Framingham: International Data Corporation, 2004.",
  LEWIS: "LEWIS, Patrick et al. Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. In: Advances in Neural Information Processing Systems (NeurIPS), v. 33, p. 9459-9474, 2020. Disponível em: https://arxiv.org/abs/2005.11401. Acesso em: 13 mai. 2026.",
  MIN: "MIN, Sewon et al. Rethinking the Role of Demonstrations: What Makes In-Context Learning Work? In: Proceedings of the 2022 Conference on Empirical Methods in Natural Language Processing (EMNLP), Abu Dhabi, 2022. Disponível em: https://arxiv.org/abs/2202.12837. Acesso em: 13 mai. 2026.",
  POSTGRESQL: "POSTGRESQL GLOBAL DEVELOPMENT GROUP. PostgreSQL 16 Documentation: Row Security Policies. 2025. Disponível em: https://www.postgresql.org/docs/16/ddl-rowsecurity.html. Acesso em: 13 mai. 2026.",
  REINERTSEN: "REINERTSEN, Donald G. The Principles of Product Development Flow: Second Generation Lean Product Development. Redondo Beach: Celeritas Publishing, 2009. 294 p."
};

function montarDoc(titulo, headerTxt, conteudo) {
  return new Document({
    creator: "Vinicius Vilela Rufini", title: titulo,
    description: "Extraido do TCC completo - UNIP Ciencia da Computacao",
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
    numbering: { config: [
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "%1)", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]},
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 },
        margin: { top: 1701, right: 1134, bottom: 1134, left: 1701 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: headerTxt, size: 18, font: FONT, italics: true })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Página ", size: 18, font: FONT }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, font: FONT })] })] }) },
      children: conteudo
    }]
  });
}

// ============================================================
// CAPITULO 1 (verbatim do TCC completo)
// ============================================================
const c1 = [];
c1.push(...capa("CAPÍTULO 1 – INTRODUÇÃO"));
c1.push(...folhaRosto("Capítulo 1 (Introdução) do Trabalho de Conclusão de Curso, apresentado à Universidade Paulista – UNIP como requisito parcial para obtenção do título de Bacharel em Ciência da Computação. Documento submetido à apreciação do(a) orientador(a)."));
// Sumario
c1.push(
  p("SUMÁRIO", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 360 }),
  p("1 INTRODUÇÃO ......................................................................................................... 4"),
  p("1.1 Contextualização do Problema ........................................................................... 4"),
  p("1.2 Justificativa .......................................................................................................... 5"),
  p("1.3 Objetivos ............................................................................................................. 5"),
  p("1.3.1 Objetivo Geral ................................................................................................... 5"),
  p("1.3.2 Objetivos Específicos ........................................................................................ 6"),
  p("1.4 Estrutura do Trabalho .......................................................................................... 6"),
  p("REFERÊNCIAS ........................................................................................................ 7"),
  new Paragraph({ children: [new PageBreak()] })
);
// Conteudo verbatim
c1.push(h1("1 INTRODUÇÃO"));
c1.push(h2("1.1 Contextualização do Problema"));
c1.push(
  p("As empresas prestadoras de serviços que operam em múltiplos turnos — tais como Centrais de Serviços Compartilhados (CSC), operações logísticas e suporte técnico — convivem com um paradoxo silencioso: ainda que adotem metodologias ágeis visuais, como o Kanban, continuam expostas a perdas significativas de produtividade decorrentes do tempo gasto pelos operadores na busca por informação. Manuais corporativos, procedimentos operacionais padrão e regras de negócio frequentemente residem em repositórios desconexos, planilhas avulsas ou exigem o acionamento de supervisores e áreas adjacentes, gerando interrupções que rompem o fluxo de trabalho.", { indent: true, spacingAfter: 200 }),
  p("Esse fenômeno, designado nesta pesquisa como Gargalo Cognitivo, traduz-se em tempo de espera oculta (Wait Time), em desvios de qualidade na execução das tarefas e, sobretudo, em quebras recorrentes de Service Level Agreements (SLAs), com consequente exposição a multas contratuais e à corrosão da confiança dos clientes corporativos.", { indent: true, spacingAfter: 200 }),
  p("O Kanban tradicional, embora eficaz para dar visibilidade ao fluxo e limitar o trabalho em progresso (WIP), opera de forma passiva: o cartão informa o estado da tarefa, mas não injeta conhecimento operacional no momento da execução. A presente pesquisa parte da premissa de que essa passividade pode — e deve — ser superada pela integração nativa de Inteligência Artificial Generativa ao ciclo de vida do cartão, desde que respaldada por mecanismos sólidos de segurança multilocatário.", { indent: true })
);
c1.push(h2("1.2 Justificativa"));
c1.push(
  p("Estudos consolidados na literatura de gestão do conhecimento, como o relatório clássico da IDC conduzido por Feldman e Sherman (2004), apontam que trabalhadores do conhecimento e profissionais de suporte gastam entre 15% e 30% do seu tempo de trabalho apenas localizando informações descentralizadas. Quando esse percentual é projetado sobre operações corporativas com centenas de cartões diários, a perda agregada de horas-homem revela um impacto financeiro de grande magnitude. Este intervalo serviu de âncora metodológica para a calibração estocástica do modelo de simulação adotado neste trabalho.", { indent: true, spacingAfter: 200 }),
  p("Por outro lado, a popularização dos Large Language Models (LLMs) e das arquiteturas de Retrieval-Augmented Generation (RAG), conforme descrito por Lewis et al. (2020), inaugurou uma nova geração de assistentes capazes de transformar texto bruto em prescrições acionáveis. Contudo, sua adoção em ambientes corporativos esbarra em dois desafios críticos: (i) o custo computacional por tokens consumidos a cada requisição e (ii) o risco de exposição indevida de dados sensíveis entre clientes em arquiteturas multilocatário.", { indent: true, spacingAfter: 200 }),
  p("O Mecanismo Kanban IA foi concebido para endereçar simultaneamente essas duas frentes, combinando a indexação semântica do conhecimento corporativo por meio de Tags de Autorização Temática com as políticas nativas de Row Level Security (RLS) do PostgreSQL, garantindo que o LLM receba apenas o fragmento de conhecimento estritamente autorizado para a empresa do usuário solicitante.", { indent: true })
);
c1.push(h2("1.3 Objetivos"));
c1.push(h3("1.3.1 Objetivo Geral"));
c1.push(p("Conceber, implementar e validar o Mecanismo Kanban IA como evolução arquitetural do Kanban Tradicional, demonstrando, por meio de simulação computacional de eventos discretos com replicação Monte Carlo, sua superioridade na redução do Cycle Time e na elevação das taxas de cumprimento de SLAs e de First Contact Resolution em operações corporativas multiturno.", { indent: true }));
c1.push(h3("1.3.2 Objetivos Específicos"));
c1.push(
  num("Caracterizar, com base na literatura especializada, os componentes de tempo (Wait Time, Touch Time, Cycle Time e Lead Time) que compõem o ciclo de execução de uma tarefa em um sistema Kanban Tradicional."),
  num("Projetar a arquitetura lógica do Mecanismo Kanban IA, descrevendo a sinergia entre o backend Supabase/PostgreSQL, o frontend React/Vite, a camada de RLS e a integração com a API do Google Gemini, formalizada por meio de diagramas UML (Casos de Uso, Sequência e DER)."),
  num("Implementar um simulador de eventos discretos em Node.js capaz de gerar amostras estatísticas comparáveis entre o Kanban Tradicional e o Mecanismo Kanban IA, executando ao menos 30 réplicas independentes para fins de inferência estatística."),
  num("Mensurar, sobre amostras de 100 cartões operacionais por réplica, os ganhos relativos nas dimensões de tempo, conformidade de SLA, FCR e consumo de tokens, submetendo as diferenças a teste t pareado bilateral."),
  num("Traduzir os ganhos técnicos em projeções financeiras (ROI), fornecendo argumentos quantitativos para a defesa acadêmica e para a adoção corporativa.")
);
c1.push(h2("1.4 Estrutura do Trabalho"));
c1.push(p("Após esta introdução, o Capítulo 2 apresenta a fundamentação teórica que sustenta a pesquisa. O Capítulo 3 descreve a arquitetura e a modelagem do sistema Kanban IA, incluindo os diagramas UML formais. O Capítulo 4 detalha a implementação prática e os artefatos reais do projeto, com destaque para as políticas RLS em produção. O Capítulo 5 expõe a metodologia de simulação adotada para a validação empírica, incluindo a replicação Monte Carlo. O Capítulo 6 expõe e discute os resultados obtidos, com suporte de tabelas e gráficos. O Capítulo 7 traz as considerações finais e os encaminhamentos para trabalhos futuros. Por fim, são apresentadas as Referências e os Apêndices A e B, contendo os códigos-fonte autorais utilizados na validação.", { indent: true }));
// Referencias do Cap 1 (apenas as citadas)
c1.push(h1("REFERÊNCIAS"));
[REFS_TODAS.FELDMAN, REFS_TODAS.LEWIS].forEach(r => c1.push(ref(r)));

// ============================================================
// CAPITULO 2 (verbatim do TCC completo)
// ============================================================
const c2 = [];
c2.push(...capa("CAPÍTULO 2 – FUNDAMENTAÇÃO TEÓRICA"));
c2.push(...folhaRosto("Capítulo 2 (Fundamentação Teórica) do Trabalho de Conclusão de Curso, apresentado à Universidade Paulista – UNIP como requisito parcial para obtenção do título de Bacharel em Ciência da Computação. Documento submetido à apreciação do(a) orientador(a)."));
c2.push(
  p("SUMÁRIO", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 360 }),
  p("2 FUNDAMENTAÇÃO TEÓRICA ................................................................................ 4"),
  p("2.1 Kanban, Lead Time e Cycle Time ....................................................................... 4"),
  p("2.2 O Custo da Busca por Informação ...................................................................... 5"),
  p("2.3 Retrieval-Augmented Generation (RAG) ........................................................... 6"),
  p("2.4 Row Level Security e Multilocatário .................................................................. 7"),
  p("2.5 Simulação Computacional de Eventos Discretos ................................................ 8"),
  p("REFERÊNCIAS ........................................................................................................ 9"),
  new Paragraph({ children: [new PageBreak()] })
);
c2.push(h1("2 FUNDAMENTAÇÃO TEÓRICA"));
c2.push(h2("2.1 Kanban, Lead Time e Cycle Time"));
c2.push(
  p("O Kanban, originado no Sistema Toyota de Produção e formalizado para o contexto de Tecnologia da Informação por Anderson (2010), é um método de gestão visual baseado em quatro pilares: tornar o trabalho visível, limitar o trabalho em progresso (WIP), gerenciar o fluxo e tornar as políticas explícitas. Para Anderson (2010), três métricas são centrais na avaliação do desempenho de um sistema Kanban:", { indent: true, spacingAfter: 200 }),
  bullet("Lead Time: tempo total decorrido desde a entrada da demanda no sistema até sua entrega ao solicitante."),
  bullet("Cycle Time: tempo em que o cartão permanece efetivamente em execução, ou seja, na coluna In Progress."),
  bullet("Throughput: quantidade de cartões concluídos por unidade de tempo."),
  p("Reinertsen (2009) aprofunda essa discussão ao introduzir o conceito de Cost of Delay (custo do atraso), demonstrando matematicamente que filas invisíveis de informação e latência de decisão geram impactos econômicos desproporcionalmente maiores do que os tempos de execução técnica. Essa perspectiva é nuclear para a presente pesquisa: o ganho do Kanban IA não se concentra apenas no Touch Time, mas sim, fundamentalmente, na eliminação do Wait Time decorrente da busca por conhecimento operacional.", { indent: true })
);
c2.push(h2("2.2 O Custo da Busca por Informação"));
c2.push(
  p("O relatório “The High Cost of Not Finding Information”, conduzido por Feldman e Sherman (2004) para a IDC, tornou-se referência obrigatória para discussões sobre produtividade do trabalhador do conhecimento. Os autores demonstram que profissionais cujas atribuições dependem de consulta a documentação corporativa despendem, em média, entre 15% e 30% de sua jornada apenas procurando informação — intervalo que ancora, com segurança metodológica, a parametrização do Wait Time empregada na simulação deste trabalho (entre 10 e 100 minutos por cartão, conforme a complexidade).", { indent: true, spacingAfter: 200 }),
  p("Choo (2003) complementa esse panorama ao discutir como as organizações constroem significado e tomam decisões a partir da informação. Para o autor, a entrega oportuna e contextualizada do conhecimento no ponto de trabalho — exatamente o que o Kanban IA realiza por meio da injeção via IA — transforma a qualidade da decisão operacional.", { indent: true })
);
c2.push(h2("2.3 Retrieval-Augmented Generation (RAG)"));
c2.push(
  p("Lewis et al. (2020), em artigo seminal publicado no NeurIPS, introduziram o paradigma Retrieval-Augmented Generation, no qual o modelo de linguagem é suplementado por uma base de conhecimento externa consultada em tempo de execução. A arquitetura RAG endereçou simultaneamente dois problemas estruturais dos LLMs: a janela de contexto limitada e a tendência a alucinações em domínios específicos.", { indent: true, spacingAfter: 200 }),
  p("Min et al. (2022), por sua vez, evidenciaram que a qualidade e a delimitação semântica do contexto fornecido ao modelo são determinantes para o sucesso das respostas geradas. Esse achado fundamenta a estratégia de pré-filtragem por TAGS adotada pelo Mecanismo Kanban IA: ao enviar ao LLM apenas o fragmento de conhecimento estritamente relacionado à tarefa em execução, garante-se simultaneamente redução de custo (menos tokens), redução de latência (resposta mais rápida) e elevação da precisão (menor probabilidade de alucinação).", { indent: true })
);
c2.push(h2("2.4 Row Level Security e Multilocatário"));
c2.push(
  p("A documentação oficial do PostgreSQL (PostgreSQL Global Development Group, 2025) descreve o mecanismo de Row Security Policies como uma camada de filtragem aplicada diretamente no núcleo do motor relacional. As políticas são avaliadas para cada tupla candidata a ser retornada por uma consulta, com base em predicados que tipicamente envolvem o identificador do usuário autenticado.", { indent: true, spacingAfter: 200 }),
  p("Chong e Carraro (2006), em estudo da Microsoft sobre arquiteturas multilocatário, classificam as estratégias de isolamento de dados em três níveis: bancos de dados separados, schemas separados ou tabelas compartilhadas com filtros lógicos. O Kanban IA adota a terceira estratégia, considerada a mais econômica em termos de infraestrutura, blindando-a com RLS para garantir o mesmo nível de isolamento das demais.", { indent: true })
);
c2.push(h2("2.5 Simulação Computacional de Eventos Discretos"));
c2.push(
  p("Banks et al. (2010) consolidam, em Discrete-Event System Simulation, a fundamentação teórica para o emprego de simulações computacionais como ferramenta de prova de conceito em engenharia de sistemas. Os autores destacam que a simulação de eventos discretos (DES) é particularmente adequada para a análise de sistemas com filas, recursos compartilhados e variabilidade estocástica — características centrais de uma operação Kanban.", { indent: true, spacingAfter: 200 }),
  p("Para conferir validade estatística aos resultados, Banks et al. (2010) recomendam a execução de múltiplas réplicas independentes do experimento simulado, seguida pela aplicação de testes inferenciais — abordagem conhecida como replicação Monte Carlo. A presente pesquisa adotou esse procedimento com 30 réplicas independentes, número suficiente para invocar o Teorema Central do Limite e empregar a distribuição t de Student com df=29 graus de liberdade.", { indent: true })
);
// Referencias do Cap 2 (todas as citadas, ordem alfabetica)
c2.push(h1("REFERÊNCIAS"));
[REFS_TODAS.ANDERSON, REFS_TODAS.BANKS, REFS_TODAS.CHONG, REFS_TODAS.CHOO, REFS_TODAS.FELDMAN,
 REFS_TODAS.LEWIS, REFS_TODAS.MIN, REFS_TODAS.POSTGRESQL, REFS_TODAS.REINERTSEN].forEach(r => c2.push(ref(r)));

// ============================================================
// Gerar os dois arquivos
// ============================================================
const docs = [
  { doc: montarDoc("TCC - Capitulo 1 - Introducao", "TCC – Capítulo 1 – Mecanismo Kanban IA", c1),
    out: path.join(BASE, "TCC_Capitulo1_Introducao.docx") },
  { doc: montarDoc("TCC - Capitulo 2 - Fundamentacao Teorica", "TCC – Capítulo 2 – Mecanismo Kanban IA", c2),
    out: path.join(BASE, "TCC_Capitulo2_FundamentacaoTeorica.docx") },
];

(async () => {
  for (const { doc, out } of docs) {
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(out, buffer);
    console.log(`OK -> ${out} (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
  }
})();
