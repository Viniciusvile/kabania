/**
 * Etapas 2 e 3 - Capitulo 2 (Fundamentacao Teorica)
 * Mesma estrutura/tipografia do Capitulo 1 (build_etapa1.cjs)
 */
const fs = require("fs");
const path = require("path");

const {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, LevelFormat, HeadingLevel,
  PageBreak, PageNumber
} = require("docx");

const BASE = "C:\\Users\\vinic\\Desktop\\kabania\\meuTcc";
const OUT = path.join(BASE, "TCC_Etapa2e3_Capitulo2.docx");

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
  p("ETAPAS 2 E 3 – CAPÍTULO 2: FUNDAMENTAÇÃO TEÓRICA", { align: AlignmentType.CENTER, bold: true, italic: true, size: 24, spacingAfter: 480 }),
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
      text: "Etapas 2 e 3 – Capítulo 2 (Fundamentação Teórica) do Trabalho de Conclusão de Curso, apresentadas à Universidade Paulista – UNIP como requisito parcial para obtenção do título de Bacharel em Ciência da Computação. Documento submetido à apreciação do(a) orientador(a).",
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
  p("2 FUNDAMENTAÇÃO TEÓRICA ................................................................................ 4"),
  p("2.1 Kanban: Origem, Princípios e Métricas de Fluxo ............................................ 4"),
  p("2.1.1 Lead Time, Cycle Time e Throughput ............................................................ 5"),
  p("2.1.2 O Custo do Atraso (Cost of Delay) ................................................................ 6"),
  p("2.2 O Custo da Busca por Informação: o Gargalo Cognitivo ............................... 7"),
  p("2.3 Inteligência Artificial Generativa e Retrieval-Augmented Generation .......... 8"),
  p("2.3.1 Large Language Models (LLMs) ..................................................................... 8"),
  p("2.3.2 O Paradigma RAG ........................................................................................... 9"),
  p("2.3.3 Engenharia de Contexto e Delimitação Semântica ..................................... 10"),
  p("2.4 Row Level Security e Arquiteturas Multilocatário ........................................ 11"),
  p("2.5 Simulação Computacional de Eventos Discretos ........................................... 12"),
  p("REFERÊNCIAS .................................................................................................... 14"),
  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// CAPITULO 2
// ============================================================
conteudo.push(h1("2 FUNDAMENTAÇÃO TEÓRICA"));
conteudo.push(
  p("Este capítulo apresenta o arcabouço teórico que sustenta o desenvolvimento e a validação do Mecanismo Kanban IA. A revisão de literatura está organizada em cinco eixos complementares que, articulados, fundamentam a hipótese central da pesquisa. O primeiro eixo (Seção 2.1) recupera os fundamentos do método Kanban e suas métricas de fluxo, estabelecendo o vocabulário conceitual sobre o qual repousa toda a mensuração de desempenho. O segundo eixo (Seção 2.2) caracteriza o problema do custo da busca por informação no ambiente corporativo, fenômeno aqui denominado Gargalo Cognitivo. O terceiro eixo (Seção 2.3) discute a Inteligência Artificial Generativa e o paradigma de Retrieval-Augmented Generation, base tecnológica da injeção semântica proposta. O quarto eixo (Seção 2.4) trata da segurança em arquiteturas multilocatário por meio de Row Level Security. Por fim, o quinto eixo (Seção 2.5) fundamenta a escolha metodológica pela simulação computacional de eventos discretos como instrumento de validação científica.",
    { indent: true })
);

// ===== 2.1 =====
conteudo.push(h2("2.1 Kanban: Origem, Princípios e Métricas de Fluxo"));
conteudo.push(
  p("O Kanban tem suas raízes no Sistema Toyota de Produção, concebido no Japão do pós-guerra sob a coordenação do engenheiro Taiichi Ohno. Em sua origem, o termo japonês kanban — que pode ser traduzido como “cartão” ou “sinal visual” — designava as fichas físicas utilizadas para sinalizar a necessidade de reposição de componentes ao longo da linha de montagem, implementando o conceito de produção puxada (pull) e just-in-time, em contraste com a lógica empurrada (push) de produção em massa que vigorava à época.",
    { indent: true, spacingAfter: 200 }),
  p("A transposição desse método da manufatura para o trabalho do conhecimento e, em particular, para o desenvolvimento de software e a gestão de serviços de tecnologia da informação, deve-se sobretudo a David J. Anderson. Em sua obra seminal Kanban: Successful Evolutionary Change for Your Technology Business, Anderson (2010) formaliza o que passou a ser denominado, com inicial maiúscula, o Método Kanban, definindo-o como uma abordagem de mudança evolutiva que respeita os papéis e processos existentes e introduz melhoria contínua de forma incremental.",
    { indent: true, spacingAfter: 200 }),
  p("Segundo Anderson (2010), o Método Kanban estrutura-se sobre seis práticas gerais, das quais quatro são consideradas fundamentais para os fins desta pesquisa:",
    { indent: true, spacingAfter: 120 }),
  bullet("Visualizar o fluxo de trabalho: tornar explícito, por meio de um quadro com colunas que representam os estágios do processo, o estado de cada item de trabalho (cartão)."),
  bullet("Limitar o trabalho em progresso (Work in Progress – WIP): estabelecer um teto máximo de itens em execução simultânea em cada estágio, forçando a conclusão antes do início de novas tarefas."),
  bullet("Gerenciar o fluxo: monitorar e otimizar a passagem dos itens pelo sistema, medindo o tempo que cada cartão leva para atravessar o quadro."),
  bullet("Tornar as políticas explícitas: documentar de forma clara e visível as regras que governam a movimentação dos cartões entre as colunas."),
  p("É precisamente na prática de gerenciar o fluxo que se concentra o aporte mensurável do presente trabalho. Conforme será detalhado, o Mecanismo Kanban IA preserva integralmente as quatro práticas fundamentais — não as substitui —, atuando sobre uma fragilidade estrutural não endereçada pelo Kanban tradicional: a ausência de conhecimento operacional embarcado no próprio cartão.",
    { indent: true })
);

conteudo.push(h3("2.1.1 Lead Time, Cycle Time e Throughput"));
conteudo.push(
  p("A gestão de fluxo no Kanban apoia-se em um conjunto de métricas temporais cuja precisão conceitual é indispensável para a presente pesquisa. Anderson (2010) distingue três indicadores centrais:",
    { indent: true, spacingAfter: 120 }),
  bullet("Lead Time: intervalo total decorrido desde o instante em que a demanda entra no sistema — tipicamente, quando o cartão é criado no backlog — até o momento de sua entrega efetiva ao solicitante. O Lead Time incorpora, portanto, tanto o tempo de execução quanto o tempo de espera em filas."),
  bullet("Cycle Time: subconjunto do Lead Time correspondente ao período em que o cartão permanece efetivamente em execução, isto é, na coluna “Em Progresso” (In Progress). É a métrica mais sensível às intervenções de eficiência operacional e, por essa razão, foi eleita como variável-resposta principal deste estudo."),
  bullet("Throughput: quantidade de cartões concluídos por unidade de tempo (por exemplo, cartões por dia ou por semana), métrica que expressa a vazão do sistema.")
);
conteudo.push(
  p("Para os fins analíticos deste trabalho, o Cycle Time é decomposto em dois constituintes: o Touch Time, correspondente ao tempo de execução técnica efetiva da tarefa — quando o operador está, de fato, trabalhando no item —, e o Wait Time, correspondente ao tempo de espera improdutiva, no qual o operador aguarda informações, aprovações ou esclarecimentos. Essa decomposição é fundamental porque a hipótese central da pesquisa sustenta que o ganho do Mecanismo Kanban IA concentra-se majoritariamente na eliminação do Wait Time, e não na aceleração do Touch Time.",
    { indent: true })
);

conteudo.push(h3("2.1.2 O Custo do Atraso (Cost of Delay)"));
conteudo.push(
  p("A relevância econômica das métricas temporais é aprofundada por Reinertsen (2009) em The Principles of Product Development Flow. O autor introduz e formaliza o conceito de Cost of Delay (custo do atraso), demonstrando matematicamente que a latência na conclusão de tarefas — em especial aquela decorrente de filas invisíveis de informação e de decisões postergadas — produz impactos econômicos desproporcionalmente superiores aos custos diretos de execução.",
    { indent: true, spacingAfter: 200 }),
  p("Reinertsen (2009) argumenta que a maioria das organizações subdimensiona sistematicamente o custo do atraso porque ele não aparece de forma direta nos demonstrativos financeiros: trata-se de um custo de oportunidade difuso, manifestado em multas contratuais por descumprimento de prazos, em retrabalho, em insatisfação de clientes e na imobilização de capital intelectual. Essa perspectiva é nuclear para a presente pesquisa, pois sustenta teoricamente a tese de que reduzir o Wait Time — ainda que o Touch Time permaneça constante — gera valor econômico mensurável. O Mecanismo Kanban IA, ao atacar diretamente o tempo de espera por informação, atua exatamente sobre a fonte de custo de atraso que Reinertsen (2009) identifica como a mais onerosa e, simultaneamente, a mais negligenciada.",
    { indent: true })
);

// ===== 2.2 =====
conteudo.push(h2("2.2 O Custo da Busca por Informação: o Gargalo Cognitivo"));
conteudo.push(
  p("Se o Cost of Delay estabelece o custo econômico do atraso, resta caracterizar, de forma empírica, a principal fonte de atraso no contexto de operações de serviços: o tempo despendido pelos colaboradores na busca por informação. Este trabalho denomina Gargalo Cognitivo o fenômeno pelo qual o operador, ao deparar-se com uma tarefa que exige conhecimento procedimental não disponível em sua interface imediata, interrompe o fluxo de execução para consultar manuais, procedimentos operacionais padrão (POPs), planilhas dispersas ou acionar colegas e supervisores.",
    { indent: true, spacingAfter: 200 }),
  p("A magnitude desse fenômeno é documentada em estudos clássicos de gestão da informação. O relatório The High Cost of Not Finding Information, conduzido por Feldman e Sherman (2004) para a consultoria International Data Corporation (IDC), tornou-se referência obrigatória ao demonstrar que trabalhadores do conhecimento despendem, em média, entre 15% e 30% de sua jornada de trabalho apenas localizando informações descentralizadas. O estudo evidencia, ainda, que parcela significativa desse tempo é desperdiçada em buscas malsucedidas, que culminam na recriação de informações já existentes ou na tomada de decisões com base em dados incompletos.",
    { indent: true, spacingAfter: 200 }),
  p("Esse intervalo empírico de 15% a 30% reveste-se de importância metodológica direta para a presente pesquisa, pois constitui a âncora a partir da qual foram calibrados os parâmetros estocásticos do Wait Time no modelo de simulação descrito no Capítulo 5. A adoção de um dado consolidado na literatura, em substituição a estimativas arbitrárias, confere lastro científico à parametrização do cenário de controle (Kanban tradicional).",
    { indent: true, spacingAfter: 200 }),
  p("A dimensão qualitativa do problema é complementada por Choo (2003) em A organização do conhecimento. O autor analisa como as organizações constroem significado, criam conhecimento e tomam decisões a partir da informação, sustentando que a entrega oportuna e contextualizada do conhecimento no exato ponto de necessidade — e não a mera existência de repositórios documentais — é o fator determinante da qualidade da decisão operacional. Essa proposição teórica antecipa, no plano conceitual, exatamente aquilo que o Mecanismo Kanban IA realiza no plano técnico: a entrega ativa do conhecimento autorizado na interface de trabalho, no instante em que ele é requerido.",
    { indent: true })
);

// ===== 2.3 =====
conteudo.push(h2("2.3 Inteligência Artificial Generativa e Retrieval-Augmented Generation"));
conteudo.push(
  p("A viabilidade técnica de entregar conhecimento contextualizado de forma automática, e em escala, tornou-se realidade com a maturação da Inteligência Artificial Generativa. Esta seção apresenta os fundamentos dos Large Language Models e do paradigma de Retrieval-Augmented Generation, que constituem o substrato tecnológico da injeção semântica proposta neste trabalho.",
    { indent: true })
);

conteudo.push(h3("2.3.1 Large Language Models (LLMs)"));
conteudo.push(
  p("Os Large Language Models (LLMs), ou modelos de linguagem de grande escala, são redes neurais profundas, tipicamente baseadas na arquitetura Transformer, treinadas sobre vastos corpora textuais para predizer a sequência de tokens mais provável dada uma entrada (prompt). Modelos como o Google Gemini — adotado neste trabalho —, além dos amplamente conhecidos GPT e Claude, demonstram capacidade notável de compreender instruções em linguagem natural e produzir respostas coerentes e contextualmente pertinentes.",
    { indent: true, spacingAfter: 200 }),
  p("Apesar de seu poder, os LLMs apresentam duas limitações estruturais relevantes para aplicações corporativas. A primeira é a janela de contexto limitada: há um teto máximo de tokens que o modelo pode processar em uma única requisição, o que inviabiliza o envio integral de bases de conhecimento volumosas. A segunda é a propensão à alucinação, isto é, à geração de afirmações factualmente incorretas, porém apresentadas com aparente segurança, especialmente quando o modelo é interrogado sobre domínios específicos ausentes de seu treinamento. Ambas as limitações são diretamente endereçadas pelo paradigma de Retrieval-Augmented Generation.",
    { indent: true })
);

conteudo.push(h3("2.3.2 O Paradigma RAG"));
conteudo.push(
  p("O paradigma Retrieval-Augmented Generation (RAG) foi formalmente introduzido por Lewis et al. (2020) em artigo seminal apresentado na conferência Neural Information Processing Systems (NeurIPS). A proposta central do RAG consiste em desacoplar o conhecimento do modelo de seus parâmetros internos: em vez de depender exclusivamente daquilo que foi aprendido durante o treinamento, o sistema recupera, em tempo de execução, fragmentos relevantes de uma base de conhecimento externa e os injeta no prompt antes da geração da resposta.",
    { indent: true, spacingAfter: 200 }),
  p("Esse mecanismo de duas etapas — recuperação seguida de geração — resolve simultaneamente as duas limitações mencionadas: contorna a janela de contexto, pois apenas o fragmento pertinente é enviado, e mitiga drasticamente a alucinação, uma vez que a resposta passa a ser ancorada em fontes verificáveis e atualizáveis. Lewis et al. (2020) demonstram que sistemas RAG superam modelos puramente paramétricos em tarefas intensivas em conhecimento, produzindo respostas mais específicas, factuais e auditáveis.",
    { indent: true, spacingAfter: 200 }),
  p("O Mecanismo Kanban IA inscreve-se nessa tradição, mas introduz uma variação arquitetural significativa. Enquanto o RAG genérico realiza a recuperação por similaridade vetorial — convertendo documentos em embeddings e buscando os mais próximos da consulta —, o sistema proposto adota uma recuperação dirigida por taxonomia, na qual o casamento entre as Tags de Autorização Temática do cartão e as do conhecimento corporativo determina, de forma determinística, qual fragmento será injetado. Essa abordagem reduz a ambiguidade da busca vetorial e diminui substancialmente o volume de tokens transmitidos, conforme discutido na Seção 2.3.3.",
    { indent: true })
);

conteudo.push(h3("2.3.3 Engenharia de Contexto e Delimitação Semântica"));
conteudo.push(
  p("A qualidade da resposta de um LLM não depende apenas do modelo, mas, em grau decisivo, da qualidade do contexto que lhe é fornecido. Min et al. (2022), em estudo apresentado na conferência Empirical Methods in Natural Language Processing (EMNLP), investigam os fatores que tornam eficaz o aprendizado em contexto (in-context learning) e evidenciam que a delimitação semântica precisa do contexto fornecido ao modelo é determinante para o sucesso das respostas geradas.",
    { indent: true, spacingAfter: 200 }),
  p("Esse achado fundamenta cientificamente a estratégia de pré-filtragem por Tags de Autorização Temática adotada no Mecanismo Kanban IA. Ao enviar ao modelo de linguagem unicamente o fragmento de conhecimento estritamente relacionado à tarefa em execução, obtêm-se três benefícios simultâneos e mensuráveis: redução de custo, pela diminuição do número de tokens processados a cada requisição; redução de latência, pela menor carga de processamento; e elevação da precisão, pela menor probabilidade de alucinação decorrente de um contexto enxuto e cirurgicamente delimitado. Tal eficiência será quantificada no Capítulo 6, que documenta uma redução estimada de 87,5% no volume de tokens transmitidos em comparação com uma abordagem RAG genérica.",
    { indent: true })
);

// ===== 2.4 =====
conteudo.push(h2("2.4 Row Level Security e Arquiteturas Multilocatário"));
conteudo.push(
  p("A aplicação de Inteligência Artificial sobre bases de conhecimento corporativas em um produto ofertado como serviço (Software as a Service – SaaS) impõe um requisito inegociável: o isolamento absoluto dos dados entre os diferentes clientes que compartilham a mesma infraestrutura. Esse requisito, próprio das arquiteturas multilocatário (multi-tenant), é o objeto desta seção.",
    { indent: true, spacingAfter: 200 }),
  p("Chong e Carraro (2006), em estudo conduzido pela Microsoft, sistematizam as estratégias de isolamento de dados em arquiteturas SaaS, classificando-as em três níveis de compartilhamento: bancos de dados separados por cliente, esquemas (schemas) separados dentro de um mesmo banco, e tabelas compartilhadas com discriminação lógica por identificador de locatário. A terceira estratégia é a mais econômica em termos de infraestrutura e a que melhor escala para grandes volumes de pequenos clientes, mas é também a que historicamente apresenta maior risco de vazamento de dados, caso a discriminação lógica dependa exclusivamente da disciplina do desenvolvedor em incluir filtros corretos em cada consulta.",
    { indent: true, spacingAfter: 200 }),
  p("É nesse ponto que se revela a contribuição do mecanismo de Row Level Security (RLS). Conforme a documentação oficial do PostgreSQL (POSTGRESQL GLOBAL DEVELOPMENT GROUP, 2025), o RLS consiste em políticas de segurança avaliadas diretamente pelo núcleo do sistema gerenciador de banco de dados, no nível de cada linha (tupla). Tais políticas são aplicadas antes mesmo da execução da cláusula WHERE explícita de uma consulta, de modo que uma linha não autorizada jamais é retornada — independentemente de o desenvolvedor ter ou não incluído o filtro correto em sua consulta.",
    { indent: true, spacingAfter: 200 }),
  p("A consequência arquitetural é decisiva: o isolamento multilocatário deixa de ser uma questão de convenção de programação — sujeita a falhas humanas — e passa a ser uma garantia por construção, imposta pelo motor relacional. No Mecanismo Kanban IA, cada registro da base de conhecimento é vinculado a um identificador de empresa (company_id), e a política RLS assegura que o modelo de linguagem receba, no momento da montagem do prompt, exclusivamente os procedimentos autorizados para a organização do usuário autenticado. Elimina-se, assim, qualquer possibilidade de que o conhecimento de uma empresa seja exposto a outra, requisito crítico para a viabilidade comercial de um produto B2B.",
    { indent: true })
);

// ===== 2.5 =====
conteudo.push(h2("2.5 Simulação Computacional de Eventos Discretos"));
conteudo.push(
  p("A validação empírica da hipótese central deste trabalho exigiu a escolha de um método capaz de comparar, de forma controlada e estatisticamente fundamentada, o desempenho do Kanban tradicional e do Mecanismo Kanban IA, antes de sua implantação em ambiente produtivo real. Optou-se pela Simulação Computacional de Eventos Discretos (Discrete-Event Simulation – DES).",
    { indent: true, spacingAfter: 200 }),
  p("Banks et al. (2010), em Discrete-Event System Simulation, obra de referência na área, definem a simulação de eventos discretos como a modelagem de um sistema cujo estado se altera em pontos discretos no tempo, em resposta à ocorrência de eventos. Os autores destacam que a DES é particularmente adequada para a análise de sistemas que envolvem filas, recursos compartilhados e variabilidade estocástica — características que descrevem com precisão uma operação Kanban, na qual cartões (entidades) competem por operadores (recursos) e cujos tempos de processamento são intrinsecamente variáveis.",
    { indent: true, spacingAfter: 200 }),
  p("Uma única execução de um modelo estocástico, contudo, é insuficiente para sustentar conclusões científicas, pois reflete apenas uma realização particular do acaso. Para superar essa limitação, Banks et al. (2010) recomendam a execução de múltiplas réplicas independentes do experimento simulado, procedimento conhecido como replicação Monte Carlo, seguido da aplicação de testes de inferência estatística sobre o conjunto de resultados. A presente pesquisa adota esse protocolo com trinta réplicas independentes — número suficiente para invocar o Teorema Central do Limite, segundo o qual a distribuição das médias amostrais tende à normalidade a partir de aproximadamente trinta observações, viabilizando o uso de testes paramétricos.",
    { indent: true, spacingAfter: 200 }),
  p("Sobre o conjunto das trinta réplicas é aplicado o teste t de Student pareado bilateral, com vinte e nove graus de liberdade, adequado à comparação de duas medidas extraídas das mesmas condições experimentais. A adoção da DES, conforme fundamentada por Banks et al. (2010), permite gerar evidência quantitativa robusta sem a necessidade de realocar operadores reais em um ambiente de produção — abordagem reconhecidamente onerosa, eticamente sensível e de difícil controle experimental. Reconhece-se, todavia, que a simulação constitui uma prova de conceito quantitativa, e não uma substituição definitiva da validação em campo, limitação explicitamente assumida e discutida no capítulo de considerações finais.",
    { indent: true })
);

// ============================================================
// REFERENCIAS
// ============================================================
conteudo.push(h1("REFERÊNCIAS"));
const refs = [
  "ANDERSON, David J. Kanban: Successful Evolutionary Change for Your Technology Business. Sequim: Blue Hole Press, 2010. 261 p.",
  "BANKS, Jerry; CARSON II, John S.; NELSON, Barry L.; NICOL, David M. Discrete-Event System Simulation. 5. ed. Upper Saddle River: Pearson, 2010. 622 p.",
  "CHONG, Frederick; CARRARO, Gianpaolo. Architecture Strategies for Catching the Long Tail: Multi-Tenant SaaS Architecture. Redmond: Microsoft Corporation, 2006. Disponível em: https://learn.microsoft.com/en-us/previous-versions/dotnet/articles/aa479069(v=msdn.10). Acesso em: 13 mai. 2026.",
  "CHOO, Chun Wei. A organização do conhecimento: como as organizações usam a informação para criar significado, construir conhecimento e tomar decisões. São Paulo: Senac, 2003. 425 p.",
  "FELDMAN, Susan; SHERMAN, Chris. The High Cost of Not Finding Information. IDC White Paper #29127. Framingham: International Data Corporation, 2004.",
  "LEWIS, Patrick et al. Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. In: Advances in Neural Information Processing Systems (NeurIPS), v. 33, p. 9459-9474, 2020. Disponível em: https://arxiv.org/abs/2005.11401. Acesso em: 13 mai. 2026.",
  "MIN, Sewon et al. Rethinking the Role of Demonstrations: What Makes In-Context Learning Work? In: Proceedings of the 2022 Conference on Empirical Methods in Natural Language Processing (EMNLP), Abu Dhabi, 2022. Disponível em: https://arxiv.org/abs/2202.12837. Acesso em: 13 mai. 2026.",
  "POSTGRESQL GLOBAL DEVELOPMENT GROUP. PostgreSQL 16 Documentation: Row Security Policies. 2025. Disponível em: https://www.postgresql.org/docs/16/ddl-rowsecurity.html. Acesso em: 13 mai. 2026.",
  "REINERTSEN, Donald G. The Principles of Product Development Flow: Second Generation Lean Product Development. Redondo Beach: Celeritas Publishing, 2009. 294 p."
];
refs.forEach(r => conteudo.push(ref(r)));

// ============ DOCUMENTO ============
const doc = new Document({
  creator: "Vinicius Vilela Rufini",
  title: "TCC - Etapas 2 e 3 - Capitulo 2 (Fundamentacao Teorica)",
  description: "Etapas 2 e 3 do TCC para envio ao orientador - UNIP Ciencia da Computacao",
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
          children: [new TextRun({
            text: "TCC – Etapas 2 e 3 – Mecanismo Kanban IA",
            size: 18, font: FONT, italics: true
          })]
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
