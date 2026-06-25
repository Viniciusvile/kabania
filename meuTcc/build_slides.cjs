/**
 * Gerador dos slides de defesa de TCC - Mecanismo Kanban IA
 * Saida: TCC_Defesa_Slides.pptx
 */
const PptxGenJS = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const BASE = "C:\\Users\\vinic\\Desktop\\kabania\\meuTcc";
const CHARTS = path.join(BASE, "charts");
const OUT = path.join(BASE, "TCC_Defesa_Slides.pptx");

const STATS = JSON.parse(fs.readFileSync(path.join(BASE, "monte_carlo_stats.json"), "utf8"));

// Paleta "Midnight Executive" adaptada
const COR = {
  navy:    "1E2761",
  navyEsc: "0F1838",
  ice:     "CADCFC",
  white:   "FFFFFF",
  accent:  "FFB400",   // dourado
  ok:      "3FB950",
  alert:   "F85149",
  cinza:   "8B949E",
  cinzaCl: "EEF2F8",
};

const FT_HEAD = "Georgia";
const FT_BODY = "Calibri";

const fmt = v => Number(v).toFixed(1).replace(".", ",");

const pres = new PptxGenJS();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5"
pres.title = "TCC - Defesa - Mecanismo Kanban IA";
pres.author = "Vinicius Vilela Rufini";
pres.company = "UNIP";

// ============================================================
// Master: fundo escuro com cabecalho discreto
// ============================================================
function fundoLight(slide) {
  slide.background = { color: COR.white };
  // barra lateral fina navy
  slide.addShape("rect", { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: COR.navy }, line: { type: "none" } });
}

function fundoDark(slide) {
  slide.background = { color: COR.navy };
}

function rodape(slide, numero, total) {
  slide.addText(
    [
      { text: "Vinicius V. Rufini  •  UNIP - Ciência da Computação", options: { color: COR.cinza, fontSize: 9, italic: true } },
    ],
    { x: 0.4, y: 7.15, w: 8, h: 0.3, fontFace: FT_BODY }
  );
  slide.addText(`${numero} / ${total}`, {
    x: 12.3, y: 7.15, w: 0.8, h: 0.3,
    fontFace: FT_BODY, fontSize: 9, color: COR.cinza, align: "right"
  });
}

function tituloSlide(slide, num, titulo, subtitulo) {
  slide.addText(`${num}`, {
    x: 0.5, y: 0.35, w: 0.8, h: 0.6,
    fontFace: FT_HEAD, fontSize: 36, bold: true, color: COR.accent
  });
  slide.addText(titulo, {
    x: 1.2, y: 0.35, w: 11.5, h: 0.6,
    fontFace: FT_HEAD, fontSize: 28, bold: true, color: COR.navy
  });
  if (subtitulo) {
    slide.addText(subtitulo, {
      x: 1.2, y: 0.95, w: 11.5, h: 0.35,
      fontFace: FT_BODY, fontSize: 13, italic: true, color: COR.cinza
    });
  }
  // linha de acento - apenas vertical curta lateral, evita "linha sob titulo"
  slide.addShape("rect", { x: 0.5, y: 1.4, w: 0.4, h: 0.05, fill: { color: COR.accent }, line: { type: "none" } });
}

const TOTAL = 18;
let N = 0;

// ============================================================
// 1 - CAPA
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoDark(s);
  // motivo grafico
  s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.4, fill: { color: COR.accent }, line: { type: "none" } });
  s.addShape("rect", { x: 0, y: 7.1, w: 13.33, h: 0.4, fill: { color: COR.accent }, line: { type: "none" } });
  s.addText("UNIVERSIDADE PAULISTA — UNIP", {
    x: 0.5, y: 0.9, w: 12.3, h: 0.4,
    fontFace: FT_BODY, fontSize: 14, color: COR.ice, align: "center", italic: true
  });
  s.addText("Ciência da Computação", {
    x: 0.5, y: 1.3, w: 12.3, h: 0.4,
    fontFace: FT_BODY, fontSize: 12, color: COR.cinza, align: "center"
  });
  s.addText("O Paradigma do Kanban Semântico", {
    x: 0.5, y: 2.4, w: 12.3, h: 1.0,
    fontFace: FT_HEAD, fontSize: 44, bold: true, color: COR.white, align: "center"
  });
  s.addText("Otimização operacional através do Mecanismo Kanban IA\ncom contextualização autônoma via LLMs e controle de acesso por TAGS (RLS)", {
    x: 0.5, y: 3.6, w: 12.3, h: 0.9,
    fontFace: FT_BODY, fontSize: 16, color: COR.ice, align: "center", italic: true
  });
  // selos de tecnologia
  const selos = ["React + Vite", "Supabase / PostgreSQL", "Google Gemini", "RLS"];
  selos.forEach((t, i) => {
    const x = 2.3 + i * 2.3;
    s.addShape("roundRect", { x, y: 5.0, w: 2.0, h: 0.5, fill: { color: COR.navyEsc }, line: { color: COR.accent, width: 1 }, rectRadius: 0.1 });
    s.addText(t, { x, y: 5.0, w: 2.0, h: 0.5, fontFace: FT_BODY, fontSize: 11, color: COR.white, align: "center", bold: true });
  });
  s.addText("Vinicius Vilela Rufini", {
    x: 0.5, y: 5.9, w: 12.3, h: 0.4,
    fontFace: FT_HEAD, fontSize: 20, bold: true, color: COR.accent, align: "center"
  });
  s.addText("Orientador(a): Prof(a). [Nome do Orientador]   •   São Paulo, 2026", {
    x: 0.5, y: 6.35, w: 12.3, h: 0.4,
    fontFace: FT_BODY, fontSize: 13, color: COR.ice, align: "center"
  });
}

// ============================================================
// 2 - AGENDA
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoLight(s);
  tituloSlide(s, "01", "Agenda", "Roteiro da apresentação - 18 minutos");
  const itens = [
    { t: "Problema", d: "O Gargalo Cognitivo nas operações multiturno" },
    { t: "Hipótese", d: "Kanban Semântico como evolução do paradigma" },
    { t: "Arquitetura", d: "Pilha tecnológica e mecanismo de Scoping" },
    { t: "Segurança", d: "RLS no PostgreSQL — isolamento multilocatário" },
    { t: "Metodologia", d: "Simulação DES com replicação Monte Carlo" },
    { t: "Resultados", d: "Dados estatísticos validados (p < 0,001)" },
    { t: "Conclusões", d: "Contribuição e trabalhos futuros" },
  ];
  itens.forEach((it, i) => {
    const col = i < 4 ? 0 : 1;
    const row = i < 4 ? i : i - 4;
    const x = 0.7 + col * 6.2;
    const y = 1.85 + row * 1.2;
    // circulo numerado
    s.addShape("ellipse", { x, y, w: 0.7, h: 0.7, fill: { color: COR.navy }, line: { type: "none" } });
    s.addText(`${i + 1}`, { x, y, w: 0.7, h: 0.7, fontFace: FT_HEAD, fontSize: 22, bold: true, color: COR.accent, align: "center", valign: "middle" });
    s.addText(it.t, { x: x + 0.9, y, w: 5.2, h: 0.4, fontFace: FT_HEAD, fontSize: 18, bold: true, color: COR.navy });
    s.addText(it.d, { x: x + 0.9, y: y + 0.4, w: 5.2, h: 0.4, fontFace: FT_BODY, fontSize: 12, color: COR.cinza, italic: true });
  });
  rodape(s, N, TOTAL);
}

// ============================================================
// 3 - PROBLEMA
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoLight(s);
  tituloSlide(s, "02", "O Problema", "Por que o Kanban Tradicional já não basta");

  // Card grande do problema
  s.addShape("roundRect", { x: 0.7, y: 1.85, w: 7.5, h: 5.0, fill: { color: COR.cinzaCl }, line: { color: COR.navy, width: 1 }, rectRadius: 0.15 });
  s.addText("GARGALO COGNITIVO", { x: 0.9, y: 2.05, w: 7.1, h: 0.45, fontFace: FT_HEAD, fontSize: 22, bold: true, color: COR.navy });
  s.addText("Tempo invisível gasto pelo operador na busca por POPs, manuais e regras de negócio durante a execução do cartão.", {
    x: 0.9, y: 2.55, w: 7.1, h: 1.0, fontFace: FT_BODY, fontSize: 14, color: "333333"
  });
  const sintomas = [
    { i: "○", t: "Wait Time alto", d: "Espera oculta enquanto o operador procura informação" },
    { i: "○", t: "Quebra de SLA", d: "Tarefas estourando o tempo contratado de 4 horas" },
    { i: "○", t: "FCR baixo", d: "Escalonamentos repetidos para níveis hierárquicos superiores" },
    { i: "○", t: "Turnover", d: "Curva de onboarding longa, custo de capacitação alto" },
  ];
  sintomas.forEach((sm, i) => {
    const y = 3.7 + i * 0.7;
    s.addShape("ellipse", { x: 0.95, y: y + 0.08, w: 0.25, h: 0.25, fill: { color: COR.alert }, line: { type: "none" } });
    s.addText(sm.t, { x: 1.35, y, w: 2.4, h: 0.4, fontFace: FT_BODY, fontSize: 14, bold: true, color: COR.navy });
    s.addText(sm.d, { x: 3.85, y, w: 4.2, h: 0.4, fontFace: FT_BODY, fontSize: 12, color: "333333" });
  });

  // Stat callout
  s.addShape("roundRect", { x: 8.5, y: 1.85, w: 4.3, h: 5.0, fill: { color: COR.navy }, line: { type: "none" }, rectRadius: 0.15 });
  s.addText("15% a 30%", { x: 8.5, y: 2.4, w: 4.3, h: 1.5, fontFace: FT_HEAD, fontSize: 60, bold: true, color: COR.accent, align: "center" });
  s.addText("da jornada do trabalhador do conhecimento é gasta apenas procurando informação", {
    x: 8.7, y: 4.1, w: 4.0, h: 1.5, fontFace: FT_BODY, fontSize: 14, color: COR.ice, align: "center", italic: true
  });
  s.addText("— Feldman & Sherman (IDC, 2004)", { x: 8.7, y: 6.3, w: 4.0, h: 0.4, fontFace: FT_BODY, fontSize: 11, color: COR.cinza, align: "center" });

  rodape(s, N, TOTAL);
}

// ============================================================
// 4 - HIPOTESE
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoLight(s);
  tituloSlide(s, "03", "Hipótese Central", "Kanban passivo → Kanban semântico");

  // Comparativo Antes/Depois
  s.addShape("roundRect", { x: 0.7, y: 1.85, w: 6.0, h: 4.9, fill: { color: COR.cinzaCl }, line: { color: COR.alert, width: 2 }, rectRadius: 0.15 });
  s.addText("KANBAN TRADICIONAL", { x: 0.9, y: 2.0, w: 5.6, h: 0.5, fontFace: FT_HEAD, fontSize: 18, bold: true, color: COR.alert });
  s.addText("Cartão estático, passivo, descritivo", { x: 0.9, y: 2.5, w: 5.6, h: 0.35, fontFace: FT_BODY, fontSize: 12, color: COR.cinza, italic: true });
  const itensA = [
    "• O usuário SAI da tela para pesquisar",
    "• Manuais em planilhas e wikis dispersas",
    "• Depende de supervisor / mensageria",
    "• Onboarding longo e custoso",
    "• Sem segurança no nível da tarefa",
  ];
  s.addText(itensA.join("\n"), { x: 0.9, y: 3.0, w: 5.6, h: 3.5, fontFace: FT_BODY, fontSize: 14, color: "333333", paraSpaceBefore: 8 });

  s.addShape("roundRect", { x: 6.95, y: 1.85, w: 6.0, h: 4.9, fill: { color: COR.navy }, line: { color: COR.ok, width: 2 }, rectRadius: 0.15 });
  s.addText("MECANISMO KANBAN IA", { x: 7.15, y: 2.0, w: 5.6, h: 0.5, fontFace: FT_HEAD, fontSize: 18, bold: true, color: COR.ok });
  s.addText("Cartão como agente contextual", { x: 7.15, y: 2.5, w: 5.6, h: 0.35, fontFace: FT_BODY, fontSize: 12, color: COR.ice, italic: true });
  const itensB = [
    "• A IA INJETA o checklist na própria interface",
    "• Conhecimento filtrado por TAGS temáticas",
    "• Resposta determinística em < 1,5 s",
    "• Onboarding instantâneo",
    "• Isolamento granular por RLS do PostgreSQL",
  ];
  s.addText(itensB.join("\n"), { x: 7.15, y: 3.0, w: 5.6, h: 3.5, fontFace: FT_BODY, fontSize: 14, color: COR.ice, paraSpaceBefore: 8 });

  rodape(s, N, TOTAL);
}

// ============================================================
// 5 - ARQUITETURA
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoLight(s);
  tituloSlide(s, "04", "Arquitetura e Pilha Tecnológica", "SPA + BaaS + LLM");

  const camadas = [
    { t: "Frontend",      d: "React 18 + Vite + CSS puro",           cor: COR.navy,    y: 1.85 },
    { t: "Infraestrutura", d: "Vercel Edge Network + rewrites",      cor: COR.accent,  y: 2.85 },
    { t: "Backend / BaaS", d: "Supabase (PostgreSQL + Auth + API)",  cor: COR.navyEsc, y: 3.85 },
    { t: "Segurança",      d: "Row Level Security por company_id",   cor: COR.alert,   y: 4.85 },
    { t: "IA Generativa",  d: "Google Gemini API (LLM)",             cor: COR.ok,      y: 5.85 },
  ];
  camadas.forEach(c => {
    s.addShape("roundRect", { x: 0.7, y: c.y, w: 7.0, h: 0.9, fill: { color: c.cor }, line: { type: "none" }, rectRadius: 0.1 });
    s.addText(c.t, { x: 0.9, y: c.y + 0.08, w: 6.6, h: 0.4, fontFace: FT_HEAD, fontSize: 17, bold: true, color: COR.white });
    s.addText(c.d, { x: 0.9, y: c.y + 0.45, w: 6.6, h: 0.4, fontFace: FT_BODY, fontSize: 13, color: COR.ice, italic: true });
  });

  // Caixa lateral - destaques
  s.addShape("roundRect", { x: 8.2, y: 1.85, w: 4.6, h: 4.9, fill: { color: COR.cinzaCl }, line: { color: COR.navy, width: 1 }, rectRadius: 0.15 });
  s.addText("DIFERENCIAIS TÉCNICOS", { x: 8.4, y: 2.0, w: 4.2, h: 0.4, fontFace: FT_HEAD, fontSize: 14, bold: true, color: COR.navy });
  const dif = [
    { n: "1.5 s",    d: "latência média da resposta da IA" },
    { n: "−87,5%",   d: "no consumo de tokens do LLM" },
    { n: "100%",     d: "isolamento multilocatário via RLS" },
    { n: "0 KB",     d: "código de filtro extra na aplicação" },
  ];
  dif.forEach((it, i) => {
    const y = 2.55 + i * 1.0;
    s.addText(it.n, { x: 8.4, y, w: 1.6, h: 0.6, fontFace: FT_HEAD, fontSize: 22, bold: true, color: COR.accent, align: "left" });
    s.addText(it.d, { x: 9.95, y: y + 0.1, w: 2.7, h: 0.6, fontFace: FT_BODY, fontSize: 11, color: "333333" });
  });

  rodape(s, N, TOTAL);
}

// ============================================================
// 6 - UML CASOS DE USO
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoLight(s);
  tituloSlide(s, "05", "Casos de Uso (UML)", "Atores e funcionalidades centrais");
  s.addImage({ path: path.join(CHARTS, "uml1_casos_de_uso.png"), x: 1.6, y: 1.85, w: 10.0, h: 5.0 });
  rodape(s, N, TOTAL);
}

// ============================================================
// 7 - UML SEQUENCIA
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoLight(s);
  tituloSlide(s, "06", "Sequência — Motor Semântico", "Da solicitação à prescrição em < 1,5 s");
  s.addImage({ path: path.join(CHARTS, "uml2_sequencia.png"), x: 1.2, y: 1.85, w: 10.9, h: 5.0 });
  rodape(s, N, TOTAL);
}

// ============================================================
// 8 - RLS SQL
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoDark(s);
  // titulo dark
  s.addText("07", { x: 0.5, y: 0.35, w: 0.8, h: 0.6, fontFace: FT_HEAD, fontSize: 36, bold: true, color: COR.accent });
  s.addText("Segurança: Row Level Security em produção", { x: 1.2, y: 0.35, w: 11.5, h: 0.6, fontFace: FT_HEAD, fontSize: 26, bold: true, color: COR.white });
  s.addText("security_hardening.sql — aplicado no Supabase", { x: 1.2, y: 0.95, w: 11.5, h: 0.35, fontFace: FT_BODY, fontSize: 13, italic: true, color: COR.cinza });
  s.addShape("rect", { x: 0.5, y: 1.4, w: 0.4, h: 0.05, fill: { color: COR.accent }, line: { type: "none" } });

  const sql = `-- Knowledge Base: isolamento estrito por empresa
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Knowledge base company isolation"
  ON knowledge_base
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles
       WHERE email = auth.jwt()->>'email'
    )
  );`;
  s.addShape("roundRect", { x: 0.7, y: 1.85, w: 8.5, h: 4.8, fill: { color: COR.navyEsc }, line: { color: COR.accent, width: 1 }, rectRadius: 0.1 });
  s.addText(sql, {
    x: 0.95, y: 2.05, w: 8.1, h: 4.5,
    fontFace: "Consolas", fontSize: 15, color: COR.ice, paraSpaceBefore: 4
  });

  // Painel lateral - garantias
  s.addText("GARANTIAS", { x: 9.5, y: 1.95, w: 3.4, h: 0.4, fontFace: FT_HEAD, fontSize: 14, bold: true, color: COR.accent });
  const garantias = [
    "Aplicado pelo planejador do PostgreSQL ANTES do WHERE explícito",
    "Cobre SELECT, INSERT, UPDATE e DELETE simultaneamente",
    "Impossível romper o isolamento por falha lógica da aplicação",
    "Zero impacto na ergonomia do código da camada de serviço",
  ];
  garantias.forEach((g, i) => {
    const y = 2.5 + i * 1.0;
    s.addText("●", { x: 9.5, y, w: 0.3, h: 0.3, fontFace: FT_BODY, fontSize: 14, color: COR.ok });
    s.addText(g, { x: 9.8, y, w: 3.2, h: 1.0, fontFace: FT_BODY, fontSize: 11, color: COR.ice });
  });
  rodape(s, N, TOTAL);
}

// ============================================================
// 9 - METODOLOGIA
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoLight(s);
  tituloSlide(s, "08", "Metodologia", "Simulação Computacional de Eventos Discretos");

  // 3 cards horizontais com etapas
  const etapas = [
    { n: "1", t: "Modelagem DES", d: "Banks et al. (2010) — variáveis aleatórias uniformes condicionadas à complexidade", cor: COR.navy },
    { n: "2", t: "Calibração", d: "Wait Time ancorado em 15-30% reportado por Feldman & Sherman (2004)", cor: COR.accent },
    { n: "3", t: "Inferência", d: "30 réplicas Monte Carlo, teste t pareado bilateral, df=29, α=0,001", cor: COR.ok },
  ];
  etapas.forEach((e, i) => {
    const x = 0.7 + i * 4.2;
    s.addShape("roundRect", { x, y: 1.85, w: 3.9, h: 3.0, fill: { color: COR.cinzaCl }, line: { color: e.cor, width: 2 }, rectRadius: 0.15 });
    s.addShape("ellipse", { x: x + 0.3, y: 2.05, w: 0.9, h: 0.9, fill: { color: e.cor }, line: { type: "none" } });
    s.addText(e.n, { x: x + 0.3, y: 2.05, w: 0.9, h: 0.9, fontFace: FT_HEAD, fontSize: 32, bold: true, color: COR.white, align: "center", valign: "middle" });
    s.addText(e.t, { x: x + 1.3, y: 2.15, w: 2.5, h: 0.5, fontFace: FT_HEAD, fontSize: 18, bold: true, color: e.cor });
    s.addText(e.d, { x: x + 0.3, y: 3.1, w: 3.4, h: 1.6, fontFace: FT_BODY, fontSize: 12, color: "333333" });
  });

  // Stat de baixo
  s.addShape("roundRect", { x: 0.7, y: 5.1, w: 12.1, h: 1.6, fill: { color: COR.navy }, line: { type: "none" }, rectRadius: 0.15 });
  s.addText("3.000", { x: 0.9, y: 5.25, w: 2.5, h: 1.3, fontFace: FT_HEAD, fontSize: 48, bold: true, color: COR.accent, align: "center", valign: "middle" });
  s.addText("execuções simuladas totais (30 réplicas × 100 cartões cada)", { x: 3.4, y: 5.25, w: 9.2, h: 0.5, fontFace: FT_HEAD, fontSize: 16, color: COR.white, italic: true });
  s.addText("Seed fixado em 42 — totalmente reprodutível", { x: 3.4, y: 5.85, w: 9.2, h: 0.5, fontFace: FT_BODY, fontSize: 12, color: COR.ice });

  rodape(s, N, TOTAL);
}

// ============================================================
// 10 - SIMULADOR NODE RODANDO
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoLight(s);
  tituloSlide(s, "09", "Demonstração 1 — Simulador Node.js", "Execução ao vivo do simulador_performance_tcc.js");
  s.addImage({ path: path.join(CHARTS, "terminal_node.png"), x: 0.7, y: 1.7, w: 12.0, h: 5.2 });
  rodape(s, N, TOTAL);
}

// ============================================================
// 11 - MONTE CARLO RODANDO
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoLight(s);
  tituloSlide(s, "10", "Demonstração 2 — Monte Carlo Python", "Replicação estatística e teste t pareado");
  s.addImage({ path: path.join(CHARTS, "terminal_python.png"), x: 0.7, y: 1.7, w: 12.0, h: 5.2 });
  rodape(s, N, TOTAL);
}

// ============================================================
// 12 - RESULTADOS NUMERICOS
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoLight(s);
  tituloSlide(s, "11", "Resultados — Números-chave", "Médias ± desvio-padrão sobre 30 réplicas");

  const dados = [
    { m: "Wait Time",  a: `${fmt(STATS.wait.A_media)} ± ${fmt(STATS.wait.A_dp)} min`, b: `${fmt(STATS.wait.B_media)} ± ${fmt(STATS.wait.B_dp)} min`, d: `−${fmt(STATS.wait.delta_pct)}%`, t: fmt(STATS.wait.t_stat) },
    { m: "Touch Time", a: `${fmt(STATS.touch.A_media)} ± ${fmt(STATS.touch.A_dp)} min`, b: `${fmt(STATS.touch.B_media)} ± ${fmt(STATS.touch.B_dp)} min`, d: `−${fmt(STATS.touch.delta_pct)}%`, t: fmt(STATS.touch.t_stat) },
    { m: "Cycle Time", a: `${fmt(STATS.cycle.A_media)} ± ${fmt(STATS.cycle.A_dp)} min`, b: `${fmt(STATS.cycle.B_media)} ± ${fmt(STATS.cycle.B_dp)} min`, d: `−${fmt(STATS.cycle.delta_pct)}%`, t: fmt(STATS.cycle.t_stat) },
    { m: "Quebra SLA", a: `${fmt(STATS.sla.A_media)}%`, b: `${fmt(STATS.sla.B_media)}%`, d: "−100%", t: fmt(STATS.sla.t_stat) },
    { m: "FCR",        a: `${fmt(STATS.fcr.A_media)}%`, b: `${fmt(STATS.fcr.B_media)}%`, d: `+${fmt(STATS.fcr.B_media - STATS.fcr.A_media)} p.p.`, t: fmt(Math.abs(STATS.fcr.t_stat)) },
  ];

  // Header
  const headerY = 1.85;
  const rowH = 0.85;
  const startX = 0.7;
  const colW = [2.2, 3.2, 3.2, 1.8, 1.7];
  let x = startX;
  ["Métrica", "Kanban Tradicional", "Kanban IA", "Δ%", "t (df=29)"].forEach((h, i) => {
    s.addShape("rect", { x, y: headerY, w: colW[i], h: 0.55, fill: { color: COR.navy }, line: { type: "none" } });
    s.addText(h, { x, y: headerY, w: colW[i], h: 0.55, fontFace: FT_HEAD, fontSize: 14, bold: true, color: COR.white, align: "center", valign: "middle" });
    x += colW[i];
  });

  dados.forEach((d, i) => {
    const y = headerY + 0.55 + i * rowH;
    const bg = i % 2 === 0 ? COR.cinzaCl : COR.white;
    let x = startX;
    [d.m, d.a, d.b, d.d, d.t].forEach((v, j) => {
      s.addShape("rect", { x, y, w: colW[j], h: rowH, fill: { color: bg }, line: { color: COR.cinza, width: 0.5 } });
      const isAccent = j === 3 || j === 4;
      const isMetrica = j === 0;
      s.addText(v, {
        x: x + 0.1, y, w: colW[j] - 0.2, h: rowH,
        fontFace: isMetrica ? FT_HEAD : FT_BODY,
        fontSize: isMetrica ? 14 : 13,
        bold: isAccent || isMetrica,
        color: isAccent ? COR.accent : COR.navy,
        align: j === 0 ? "left" : "center", valign: "middle"
      });
      x += colW[j];
    });
  });

  // Footer da tabela - significancia
  s.addShape("roundRect", { x: 0.7, y: 6.55, w: 12.1, h: 0.5, fill: { color: COR.ok }, line: { type: "none" }, rectRadius: 0.05 });
  s.addText("Valor crítico para df=29, α=0,001 = 3,659  →  todos os t-stats acima implicam p < 0,001 (rejeição forte de H₀)", {
    x: 0.7, y: 6.55, w: 12.1, h: 0.5, fontFace: FT_BODY, fontSize: 12, italic: true, color: COR.white, align: "center", valign: "middle", bold: true
  });
  rodape(s, N, TOTAL);
}

// ============================================================
// 13 - GRAFICO TEMPOS
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoLight(s);
  tituloSlide(s, "12", "Resultados — Tempos Operacionais", "Barras de erro = IC 95% (30 réplicas)");
  s.addImage({ path: path.join(CHARTS, "g1_tempos_operacionais.png"), x: 0.7, y: 1.85, w: 8.3, h: 5.0 });
  // Big stat lateral
  s.addShape("roundRect", { x: 9.2, y: 1.85, w: 3.6, h: 5.0, fill: { color: COR.navy }, line: { type: "none" }, rectRadius: 0.15 });
  s.addText("CICLO TOTAL", { x: 9.2, y: 2.05, w: 3.6, h: 0.4, fontFace: FT_BODY, fontSize: 13, color: COR.cinza, align: "center" });
  s.addText(`−${fmt(STATS.cycle.delta_pct)}%`, { x: 9.2, y: 2.5, w: 3.6, h: 1.5, fontFace: FT_HEAD, fontSize: 64, bold: true, color: COR.accent, align: "center" });
  s.addText("Redução do Cycle Time médio", { x: 9.4, y: 4.2, w: 3.2, h: 0.5, fontFace: FT_BODY, fontSize: 13, color: COR.ice, align: "center", italic: true });
  s.addText(`170,6 → 94,5 min`, { x: 9.4, y: 4.7, w: 3.2, h: 0.5, fontFace: FT_HEAD, fontSize: 16, bold: true, color: COR.white, align: "center" });
  s.addText(`t = ${fmt(STATS.cycle.t_stat)}`, { x: 9.4, y: 5.4, w: 3.2, h: 0.5, fontFace: FT_BODY, fontSize: 14, color: COR.ok, align: "center", bold: true });
  s.addText("p < 0,001", { x: 9.4, y: 5.85, w: 3.2, h: 0.5, fontFace: FT_BODY, fontSize: 13, color: COR.ice, align: "center" });
  rodape(s, N, TOTAL);
}

// ============================================================
// 14 - BOXPLOT
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoLight(s);
  tituloSlide(s, "13", "Estabilidade entre réplicas", "Boxplot do Cycle Time nas 30 simulações");
  s.addImage({ path: path.join(CHARTS, "g7_boxplot.png"), x: 0.7, y: 1.85, w: 7.5, h: 5.0 });
  s.addShape("roundRect", { x: 8.4, y: 1.85, w: 4.4, h: 5.0, fill: { color: COR.cinzaCl }, line: { color: COR.navy, width: 1 }, rectRadius: 0.15 });
  s.addText("Por que isso importa?", { x: 8.6, y: 2.0, w: 4.0, h: 0.5, fontFace: FT_HEAD, fontSize: 16, bold: true, color: COR.navy });
  s.addText("A ausência de sobreposição entre as caixas é, por si só, evidência visual de significância estatística.\n\nMesmo a réplica MAIS LENTA do Kanban IA é mais rápida que a réplica MAIS RÁPIDA do Kanban Tradicional.\n\nNão há sorte estatística: o ganho é estrutural.", {
    x: 8.6, y: 2.5, w: 4.0, h: 4.3, fontFace: FT_BODY, fontSize: 13, color: "333333", italic: false
  });
  rodape(s, N, TOTAL);
}

// ============================================================
// 15 - SLA + FCR
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoLight(s);
  tituloSlide(s, "14", "SLA e FCR", "Os indicadores que o cliente B2B realmente vê");
  s.addImage({ path: path.join(CHARTS, "g3_sla_pizza.png"), x: 0.4, y: 1.85, w: 6.5, h: 4.2 });
  s.addImage({ path: path.join(CHARTS, "g4_fcr.png"), x: 7.0, y: 1.85, w: 6.0, h: 4.2 });

  // Faixa inferior
  s.addShape("roundRect", { x: 0.7, y: 6.2, w: 12.1, h: 0.7, fill: { color: COR.navy }, line: { type: "none" }, rectRadius: 0.1 });
  s.addText("Quebra de SLA: 28,3% → 0%   •   FCR: 53,4% → 95,3%   •   Latência IA: < 1,5 s", {
    x: 0.7, y: 6.2, w: 12.1, h: 0.7, fontFace: FT_HEAD, fontSize: 16, bold: true, color: COR.white, align: "center", valign: "middle"
  });
  rodape(s, N, TOTAL);
}

// ============================================================
// 16 - TOKENS / ROI
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoLight(s);
  tituloSlide(s, "15", "Eficiência Computacional & ROI", "Por que o Kanban IA é financeiramente viável");

  s.addImage({ path: path.join(CHARTS, "g5_tokens.png"), x: 0.4, y: 1.85, w: 7.0, h: 4.4 });

  // Painel ROI
  s.addShape("roundRect", { x: 7.6, y: 1.85, w: 5.2, h: 4.4, fill: { color: COR.navy }, line: { type: "none" }, rectRadius: 0.15 });
  s.addText("PROJEÇÃO ANUAL", { x: 7.6, y: 2.0, w: 5.2, h: 0.4, fontFace: FT_BODY, fontSize: 12, color: COR.cinza, align: "center", italic: true });
  s.addText("R$ 1,5 mi", { x: 7.6, y: 2.4, w: 5.2, h: 1.2, fontFace: FT_HEAD, fontSize: 60, bold: true, color: COR.accent, align: "center" });
  s.addText("de economia direta para uma operação de 1.000 chamados/mês", { x: 7.8, y: 3.7, w: 4.8, h: 1.0, fontFace: FT_BODY, fontSize: 13, color: COR.ice, italic: true, align: "center" });
  s.addText("Base: R$ 50/h • horas salvas Monte Carlo", { x: 7.8, y: 5.5, w: 4.8, h: 0.4, fontFace: FT_BODY, fontSize: 11, color: COR.cinza, align: "center" });

  // Faixa custo tokens
  s.addShape("roundRect", { x: 0.7, y: 6.4, w: 12.1, h: 0.5, fill: { color: COR.ok }, line: { type: "none" }, rectRadius: 0.05 });
  s.addText("−87,5% no payload do LLM (12.000 → 1.500 tokens por requisição)  •  viabiliza swarming contínuo de IA", {
    x: 0.7, y: 6.4, w: 12.1, h: 0.5, fontFace: FT_BODY, fontSize: 13, bold: true, color: COR.white, align: "center", valign: "middle"
  });
  rodape(s, N, TOTAL);
}

// ============================================================
// 17 - CONCLUSOES & TRABALHOS FUTUROS
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoLight(s);
  tituloSlide(s, "16", "Conclusões & Trabalhos Futuros", "Síntese do que foi entregue e do que vem a seguir");

  // Conclusoes
  s.addShape("roundRect", { x: 0.7, y: 1.85, w: 6.0, h: 5.0, fill: { color: COR.cinzaCl }, line: { color: COR.ok, width: 2 }, rectRadius: 0.15 });
  s.addText("✔ ENTREGUE", { x: 0.9, y: 2.0, w: 5.6, h: 0.4, fontFace: FT_HEAD, fontSize: 16, bold: true, color: COR.ok });
  const concl = [
    "• Arquitetura formal em UML (Casos de Uso, Sequência, DER)",
    "• Implementação completa em React + Supabase + Gemini",
    "• Políticas RLS em produção e plano adversarial",
    "• Simulador DES autoral em Node.js (Apêndice A)",
    "• Replicação Monte Carlo em Python (Apêndice B)",
    "• Teste t pareado, p < 0,001 em todas as métricas",
    "• Cycle Time: −44,6% comprovado estatisticamente",
  ];
  s.addText(concl.join("\n"), { x: 0.9, y: 2.5, w: 5.6, h: 4.2, fontFace: FT_BODY, fontSize: 13, color: "333333", paraSpaceBefore: 6 });

  // Trabalhos futuros
  s.addShape("roundRect", { x: 6.95, y: 1.85, w: 6.0, h: 5.0, fill: { color: COR.navy }, line: { color: COR.accent, width: 2 }, rectRadius: 0.15 });
  s.addText("→ PRÓXIMOS PASSOS", { x: 7.15, y: 2.0, w: 5.6, h: 0.4, fontFace: FT_HEAD, fontSize: 16, bold: true, color: COR.accent });
  const futuros = [
    "• Estudo de caso longitudinal em operação real",
    "• Distribuições lognormal/Weibull no Touch Time",
    "• Agentes de voz para operadores de campo",
    "• Aprendizado por reforço para sugestão de POPs",
    "• Testes adversariais de prompt injection",
    "• Métricas qualitativas: satisfação do operador",
    "• Auditoria de ROI em ambiente controlado",
  ];
  s.addText(futuros.join("\n"), { x: 7.15, y: 2.5, w: 5.6, h: 4.2, fontFace: FT_BODY, fontSize: 13, color: COR.ice, paraSpaceBefore: 6 });

  rodape(s, N, TOTAL);
}

// ============================================================
// 18 - OBRIGADO
// ============================================================
{
  N++;
  const s = pres.addSlide();
  fundoDark(s);
  s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.4, fill: { color: COR.accent }, line: { type: "none" } });
  s.addShape("rect", { x: 0, y: 7.1, w: 13.33, h: 0.4, fill: { color: COR.accent }, line: { type: "none" } });

  s.addText("Obrigado.", {
    x: 0.5, y: 1.8, w: 12.3, h: 1.5,
    fontFace: FT_HEAD, fontSize: 90, bold: true, color: COR.white, align: "center"
  });
  s.addText("Perguntas, observações e contribuições da banca", {
    x: 0.5, y: 3.5, w: 12.3, h: 0.6,
    fontFace: FT_HEAD, fontSize: 22, italic: true, color: COR.accent, align: "center"
  });

  // Trio de slogans
  const slogans = [
    "Kanban Semântico",
    "RLS Multilocatário",
    "Validação Estatística",
  ];
  slogans.forEach((sl, i) => {
    const x = 1.0 + i * 4.0;
    s.addShape("roundRect", { x, y: 4.8, w: 3.3, h: 0.8, fill: { color: COR.navyEsc }, line: { color: COR.accent, width: 1 }, rectRadius: 0.1 });
    s.addText(sl, { x, y: 4.8, w: 3.3, h: 0.8, fontFace: FT_HEAD, fontSize: 15, bold: true, color: COR.white, align: "center", valign: "middle" });
  });

  s.addText("Vinicius Vilela Rufini  •  vinicius@unip.br  •  TCC 2026", {
    x: 0.5, y: 6.3, w: 12.3, h: 0.4,
    fontFace: FT_BODY, fontSize: 13, color: COR.ice, align: "center"
  });
}

// ============================================================
pres.writeFile({ fileName: OUT }).then(name => {
  const size = (fs.statSync(name).size / 1024).toFixed(1);
  console.log(`OK -> ${name} (${size} KB)`);
});
