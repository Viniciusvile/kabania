/**
 * Etapa 1 - Capitulo 1 (versao parcial) para envio ao orientador
 * Contem: Objetivos (geral + especificos), Justificativa, Metodologia e Estrutura do Trabalho
 * Alvo: ~4 paginas de conteudo
 */
const fs = require("fs");
const path = require("path");

const {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, LevelFormat, HeadingLevel,
  PageBreak, PageNumber
} = require("docx");

const BASE = "C:\\Users\\vinic\\Desktop\\kabania\\meuTcc";
const OUT = path.join(BASE, "TCC_Etapa1_Capitulo1.docx");

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
  p("ETAPA 1 – CAPÍTULO 1 (VERSÃO PARCIAL)", { align: AlignmentType.CENTER, bold: true, italic: true, size: 24, spacingAfter: 480 }),
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
      text: "Etapa 1 – Capítulo 1 (versão parcial) do Trabalho de Conclusão de Curso, apresentada à Universidade Paulista – UNIP como requisito parcial para obtenção do título de Bacharel em Ciência da Computação. Documento submetido à apreciação do(a) orientador(a).",
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

// ============ SUMARIO SIMPLES ============
conteudo.push(
  p("SUMÁRIO", { align: AlignmentType.CENTER, bold: true, size: 28, spacingAfter: 360 }),
  p("1 INTRODUÇÃO ......................................................................................................... 4"),
  p("1.1 Contextualização do Problema ........................................................................... 4"),
  p("1.2 Objetivos ............................................................................................................. 5"),
  p("1.2.1 Objetivo Geral ................................................................................................... 5"),
  p("1.2.2 Objetivos Específicos ........................................................................................ 5"),
  p("1.3 Justificativa .......................................................................................................... 6"),
  p("1.4 Metodologia ......................................................................................................... 6"),
  p("1.5 Estrutura do Trabalho .......................................................................................... 7"),
  new Paragraph({ children: [new PageBreak()] })
);

// ============ CAPITULO 1 ============
conteudo.push(h1("1 INTRODUÇÃO"));

conteudo.push(h2("1.1 Contextualização do Problema"));
conteudo.push(
  p("As empresas prestadoras de serviços que operam em múltiplos turnos — tais como Centrais de Serviços Compartilhados (CSC), operações logísticas e suporte técnico — convivem com um paradoxo silencioso: ainda que adotem metodologias ágeis visuais, como o Kanban, continuam expostas a perdas significativas de produtividade decorrentes do tempo gasto pelos operadores na busca por informação. Manuais corporativos, procedimentos operacionais padrão (POPs) e regras de negócio frequentemente residem em repositórios desconexos, planilhas avulsas ou exigem o acionamento de supervisores e áreas adjacentes, gerando interrupções que rompem o fluxo de trabalho.",
    { indent: true, spacingAfter: 200 }),
  p("Esse fenômeno, designado nesta pesquisa como Gargalo Cognitivo, traduz-se em tempo de espera oculta (Wait Time), em desvios de qualidade na execução das tarefas e, sobretudo, em quebras recorrentes de Service Level Agreements (SLAs), com consequente exposição a multas contratuais e à corrosão da confiança dos clientes corporativos. Estudos consolidados, como o relatório clássico da IDC conduzido por Feldman e Sherman (2004), apontam que trabalhadores do conhecimento despendem entre 15% e 30% de sua jornada apenas localizando informações descentralizadas — um patamar inaceitável quando projetado em escala operacional.",
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
  num("Projetar a arquitetura lógica do Mecanismo Kanban IA, descrevendo a sinergia entre o backend Supabase/PostgreSQL, o frontend React/Vite, a camada de Row Level Security (RLS) e a integração com a API do Google Gemini, formalizada por meio de diagramas UML (Casos de Uso, Sequência e DER)."),
  num("Implementar um simulador de eventos discretos em Node.js capaz de gerar amostras estatísticas comparáveis entre o Kanban Tradicional e o Mecanismo Kanban IA, executando ao menos 30 réplicas independentes para fins de inferência estatística com base na distribuição t de Student."),
  num("Mensurar, sobre amostras de 100 cartões operacionais por réplica, os ganhos relativos nas dimensões de tempo (Wait Time, Touch Time, Cycle Time), conformidade de SLA, FCR e consumo de tokens, submetendo as diferenças a teste t pareado bilateral."),
  num("Traduzir os ganhos técnicos em projeções financeiras de Return on Investment (ROI), fornecendo argumentos quantitativos para a defesa acadêmica e para a adoção corporativa do produto.")
);

conteudo.push(h2("1.3 Justificativa"));
conteudo.push(
  p("A presente pesquisa justifica-se sob três dimensões complementares: acadêmica, tecnológica e socioeconômica.",
    { indent: true, spacingAfter: 200 }),
  p("Do ponto de vista acadêmico, há uma escassez de trabalhos brasileiros que conjuguem, em um mesmo artefato, métodos ágeis de gestão visual (Kanban), arquiteturas de Inteligência Artificial generativa (Large Language Models) e mecanismos de segurança relacional em nível de linha (Row Level Security). A literatura nacional tende a tratar esses temas de forma isolada, deixando lacunas na compreensão de como suas sinergias se traduzem em ganho operacional mensurável.",
    { indent: true, spacingAfter: 200 }),
  p("Do ponto de vista tecnológico, a popularização dos Large Language Models (LLMs) e das arquiteturas de Retrieval-Augmented Generation (RAG), conforme descrito por Lewis et al. (2020), inaugurou uma nova geração de assistentes capazes de transformar texto bruto em prescrições acionáveis. Contudo, sua adoção em ambientes corporativos esbarra em dois desafios críticos: (i) o custo computacional por tokens consumidos a cada requisição e (ii) o risco de exposição indevida de dados sensíveis entre clientes em arquiteturas multilocatário. O Mecanismo Kanban IA propõe endereçar simultaneamente essas duas frentes, combinando a indexação semântica do conhecimento corporativo por meio de Tags de Autorização Temática com as políticas nativas de RLS do PostgreSQL.",
    { indent: true, spacingAfter: 200 }),
  p("Do ponto de vista socioeconômico, dados preliminares da modelagem indicam economia potencial superior a R$ 1 milhão anuais para uma empresa de médio porte que processe mil chamados mensais. Trata-se, portanto, de uma contribuição com potencial de aplicação direta no tecido produtivo brasileiro, especialmente em segmentos intensivos em atendimento e suporte técnico — área em franca expansão com a digitalização das relações B2B.",
    { indent: true })
);

conteudo.push(h2("1.4 Metodologia"));
conteudo.push(
  p("A presente pesquisa adota, do ponto de vista metodológico, uma abordagem mista que combina pesquisa bibliográfica, pesquisa-ação na construção do artefato de software e validação empírica por meio de simulação computacional.",
    { indent: true, spacingAfter: 200 }),
  p("A pesquisa bibliográfica é realizada sobre cinco eixos temáticos: (i) métodos ágeis e métricas Kanban, com base em Anderson (2010) e Reinertsen (2009); (ii) custo organizacional da busca por informação, lastreado em Feldman e Sherman (2004) e Choo (2003); (iii) arquiteturas de IA Generativa com recuperação aumentada, com referência ao artigo seminal de Lewis et al. (2020); (iv) segurança em bancos de dados relacionais multilocatário, fundamentada em Chong e Carraro (2006) e na documentação oficial do PostgreSQL; e (v) simulação computacional de eventos discretos, conforme Banks et al. (2010).",
    { indent: true, spacingAfter: 200 }),
  p("A construção do artefato segue o modelo de pesquisa-ação aplicada ao desenvolvimento de software, partindo da identificação do problema real (Gargalo Cognitivo), passando pela especificação arquitetural (formalizada em diagramas UML de Casos de Uso, Sequência e Entidade-Relacionamento) e culminando na implementação do produto em pilha tecnológica moderna: React.js com Vite no frontend, Supabase/PostgreSQL no backend, hospedagem na Vercel Edge Network e integração com a API do Google Gemini para geração de prescrições contextuais.",
    { indent: true, spacingAfter: 200 }),
  p("A validação empírica é conduzida por Simulação Computacional de Eventos Discretos (DES), conforme preconizado por Banks et al. (2010). O experimento é replicado segundo o protocolo Monte Carlo, com trinta réplicas independentes de cem cartões operacionais cada (totalizando três mil execuções simuladas), e os parâmetros estocásticos são calibrados a partir do intervalo de 15% a 30% de tempo perdido em busca por informação reportado por Feldman e Sherman (2004). Para conferir significância estatística aos resultados, aplica-se o teste t pareado bilateral com vinte e nove graus de liberdade, considerando-se α = 0,001 como nível de significância crítico — patamar mais conservador do que o usual α = 0,05.",
    { indent: true, spacingAfter: 200 }),
  p("Os indicadores-chave coletados são: Wait Time médio, Touch Time médio, Cycle Time médio, Taxa de Quebra de SLA e First Contact Resolution. Esses indicadores cobrem, simultaneamente, as dimensões de eficiência operacional, conformidade contratual e qualidade do atendimento — tríade reconhecida na literatura como suficiente para caracterizar a saúde de uma operação de serviços.",
    { indent: true })
);

conteudo.push(h2("1.5 Estrutura do Trabalho"));
conteudo.push(
  p("Além desta introdução, o presente Trabalho de Conclusão de Curso encontra-se organizado em mais seis capítulos, complementados por referências bibliográficas e apêndices, conforme descrito a seguir:",
    { indent: true, spacingAfter: 200 }),
  p("O Capítulo 2 — Fundamentação Teórica — apresenta a revisão de literatura que sustenta a pesquisa, organizada em cinco seções temáticas: (2.1) Kanban, Lead Time e Cycle Time; (2.2) o custo da busca por informação no ambiente corporativo; (2.3) o paradigma de Retrieval-Augmented Generation; (2.4) Row Level Security e arquiteturas multilocatário; e (2.5) simulação computacional de eventos discretos como ferramenta de validação científica.",
    { indent: true, spacingAfter: 200 }),
  p("O Capítulo 3 — Arquitetura e Modelagem do Sistema Kanban IA — descreve a pilha tecnológica adotada, detalha o Mecanismo de Scoping Temático Autônomo, apresenta o esquema de TAGS de Autorização aliado às políticas de RLS, define os atores e casos de uso e formaliza a arquitetura por meio de três diagramas UML.",
    { indent: true, spacingAfter: 200 }),
  p("O Capítulo 4 — Implementação e Artefatos Reais — descreve a estrutura do repositório de código, reproduz as políticas RLS efetivamente aplicadas em produção no Supabase e formaliza o plano de testes adversariais de segurança multilocatário, comprovando empiricamente a inviolabilidade do isolamento entre tenants.",
    { indent: true, spacingAfter: 200 }),
  p("O Capítulo 5 — Metodologia — formaliza o design do experimento comparativo, detalha a parametrização da simulação, explicita o protocolo de replicação Monte Carlo e o teste estatístico empregado, e elenca os indicadores-chave (KPIs) coletados.",
    { indent: true, spacingAfter: 200 }),
  p("O Capítulo 6 — Resultados e Discussão — apresenta os achados quantitativos da simulação, organizados em cinco subseções (tempos operacionais, conformidade de SLA, First Contact Resolution, eficiência computacional em consumo de tokens e retorno financeiro estimado), apoiados por tabelas estatísticas e gráficos com intervalos de confiança de 95%.",
    { indent: true, spacingAfter: 200 }),
  p("O Capítulo 7 — Considerações Finais — sintetiza os achados, reconhece as limitações do estudo e propõe trabalhos futuros, com destaque para a condução de estudos de caso longitudinais em operações reais, a integração com agentes de voz e a aplicação de técnicas de aprendizado por reforço.",
    { indent: true, spacingAfter: 200 }),
  p("Por fim, são apresentadas as Referências Bibliográficas em conformidade com a norma ABNT NBR 6023, seguidas pelos Apêndices A e B, que reproduzem, respectivamente, o código-fonte do simulador de eventos discretos em Node.js e o script Monte Carlo em Python utilizado para a inferência estatística — ambos artefatos autorais desenvolvidos no âmbito desta pesquisa.",
    { indent: true })
);

// ============ DOCUMENTO ============
const doc = new Document({
  creator: "Vinicius Vilela Rufini",
  title: "TCC - Etapa 1 - Capitulo 1 (versao parcial)",
  description: "Etapa 1 do TCC para envio ao orientador - UNIP Ciencia da Computacao",
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
            text: "TCC – Etapa 1 – Mecanismo Kanban IA",
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
