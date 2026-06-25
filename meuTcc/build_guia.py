# -*- coding: utf-8 -*-
"""
Guia de Mestria do TCC - Mecanismo Kanban IA
Conteudo para dominar o tema antes da defesa.
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, PageBreak,
                                 Table, TableStyle, KeepTogether, Image, ListFlowable, ListItem,
                                 HRFlowable)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

OUT = r"C:\Users\vinic\Desktop\kabania\meuTcc\TCC_Guia_Mestria_Banca.pdf"

# Cores
NAVY = colors.HexColor("#1E2761")
NAVY2 = colors.HexColor("#0F1838")
OURO = colors.HexColor("#FFB400")
OK = colors.HexColor("#2e8b57")
ALERTA = colors.HexColor("#c0392b")
CINZA = colors.HexColor("#555555")
CINZA_CL = colors.HexColor("#EEF2F8")

estilos = getSampleStyleSheet()

est_titulo = ParagraphStyle("TituloCapa", parent=estilos["Title"],
    fontName="Helvetica-Bold", fontSize=24, textColor=NAVY,
    alignment=TA_CENTER, spaceAfter=18, leading=30)

est_h1 = ParagraphStyle("h1", parent=estilos["Heading1"],
    fontName="Helvetica-Bold", fontSize=18, textColor=NAVY,
    spaceBefore=18, spaceAfter=10, leading=22, keepWithNext=True)

est_h2 = ParagraphStyle("h2", parent=estilos["Heading2"],
    fontName="Helvetica-Bold", fontSize=13, textColor=NAVY2,
    spaceBefore=12, spaceAfter=6, leading=16, keepWithNext=True)

est_h3 = ParagraphStyle("h3", parent=estilos["Heading3"],
    fontName="Helvetica-BoldOblique", fontSize=11, textColor=OK,
    spaceBefore=8, spaceAfter=4, leading=14, keepWithNext=True)

est_body = ParagraphStyle("body", parent=estilos["BodyText"],
    fontName="Helvetica", fontSize=10.5, textColor=colors.black,
    alignment=TA_JUSTIFY, spaceAfter=6, leading=14)

est_quote = ParagraphStyle("quote", parent=est_body,
    fontName="Helvetica-Oblique", fontSize=10.5, textColor=NAVY,
    leftIndent=18, rightIndent=10, spaceBefore=4, spaceAfter=8)

est_pergunta = ParagraphStyle("Q", parent=est_body,
    fontName="Helvetica-Bold", fontSize=10.5, textColor=NAVY,
    spaceBefore=8, spaceAfter=4)

est_resposta = ParagraphStyle("R", parent=est_body,
    fontName="Helvetica", fontSize=10.5, textColor=colors.black,
    leftIndent=14, spaceAfter=6, leading=14)

est_aviso = ParagraphStyle("aviso", parent=est_body,
    fontName="Helvetica-Bold", fontSize=10.5, textColor=ALERTA,
    spaceBefore=4, spaceAfter=4)

est_code = ParagraphStyle("code", parent=estilos["Code"],
    fontName="Courier", fontSize=9, textColor=NAVY,
    leftIndent=12, leading=12, spaceBefore=4, spaceAfter=6,
    backColor=CINZA_CL)

est_legenda = ParagraphStyle("legenda", parent=est_body,
    fontName="Helvetica-Oblique", fontSize=9, textColor=CINZA,
    alignment=TA_CENTER, spaceAfter=10)

est_capa_sub = ParagraphStyle("CapaSub", parent=estilos["BodyText"],
    fontName="Helvetica-Oblique", fontSize=14, textColor=CINZA,
    alignment=TA_CENTER, spaceAfter=10, leading=18)


def caixa(texto, cor_fundo=CINZA_CL, cor_borda=NAVY, padding=8):
    """Cria uma caixa colorida com texto."""
    tab = Table([[Paragraph(texto, est_body)]], colWidths=[16*cm])
    tab.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), cor_fundo),
        ("BOX", (0,0), (-1,-1), 1, cor_borda),
        ("LEFTPADDING", (0,0), (-1,-1), padding),
        ("RIGHTPADDING", (0,0), (-1,-1), padding),
        ("TOPPADDING", (0,0), (-1,-1), padding),
        ("BOTTOMPADDING", (0,0), (-1,-1), padding),
    ]))
    return tab


def pergunta_resposta(q, r):
    """Bloco pergunta-resposta."""
    return [
        Paragraph(f"<b>Q.</b> {q}", est_pergunta),
        Paragraph(f"<b>R.</b> {r}", est_resposta),
    ]


# ======================================================================
# Cabecalho e rodape
# ======================================================================
def cabecalho_rodape(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica-Oblique", 8.5)
    canvas.setFillColor(CINZA)
    if doc.page > 1:
        canvas.drawString(2*cm, 28*cm, "TCC - Guia de Mestria para a Defesa - Mecanismo Kanban IA")
        canvas.drawRightString(19*cm, 28*cm, f"Página {doc.page}")
        canvas.setStrokeColor(NAVY)
        canvas.setLineWidth(0.5)
        canvas.line(2*cm, 27.85*cm, 19*cm, 27.85*cm)
    canvas.restoreState()


# ======================================================================
# Conteudo
# ======================================================================
def construir():
    doc = SimpleDocTemplate(OUT, pagesize=A4,
                             leftMargin=2*cm, rightMargin=2*cm,
                             topMargin=2.3*cm, bottomMargin=1.8*cm,
                             title="Guia de Mestria - TCC Kanban IA",
                             author="Vinicius Vilela Rufini")

    f = []

    # ========== CAPA ==========
    f.append(Spacer(1, 3*cm))
    f.append(Paragraph("GUIA DE MESTRIA<br/>PARA A DEFESA DE TCC", est_titulo))
    f.append(Spacer(1, 0.5*cm))
    f.append(HRFlowable(width="60%", thickness=2, color=OURO, hAlign="CENTER"))
    f.append(Spacer(1, 1*cm))
    f.append(Paragraph("Mecanismo Kanban IA", est_capa_sub))
    f.append(Paragraph("Otimização operacional via injeção semântica de IA<br/>e controle de acesso por TAGS (RLS)", est_capa_sub))
    f.append(Spacer(1, 2*cm))
    f.append(caixa(
        "<b>Como usar este documento:</b><br/><br/>"
        "Leia os capítulos 1 a 4 nos dias <b>D-7 a D-3</b> antes da banca.<br/>"
        "Decore os números do <b>cartão de bolso</b> (cap. 8) na <b>véspera</b>.<br/>"
        "Releia o cap. 6 (perguntas) e o cap. 7 (armadilhas) <b>na manhã</b> da defesa.<br/><br/>"
        "<b>Objetivo:</b> chegar na banca podendo defender qualquer ponto do trabalho sem consulta.",
        cor_fundo=CINZA_CL, cor_borda=NAVY))
    f.append(Spacer(1, 2.5*cm))
    f.append(Paragraph("Vinicius Vilela Rufini", est_capa_sub))
    f.append(Paragraph("UNIP - Ciência da Computação - 2026", est_capa_sub))
    f.append(PageBreak())

    # ========== SUMARIO ==========
    f.append(Paragraph("Sumário", est_h1))
    sumario = [
        ("1. Resumo executivo (sua tese em 60 segundos)", "3"),
        ("2. Glossário técnico — todos os termos que você cita", "4"),
        ("3. Os 5 conceitos que você TEM que dominar", "6"),
        ("4. Arquitetura do sistema explicada em camadas", "10"),
        ("5. Roteiro narrativo da defesa (fala slide a slide)", "12"),
        ("6. 30 perguntas prováveis da banca + respostas modelo", "15"),
        ("7. Armadilhas da banca e como escapar delas", "21"),
        ("8. Cartão de bolso — números e fatos para decorar", "23"),
        ("9. Checklist do dia D", "24"),
    ]
    tab = Table([[s, p] for s, p in sumario], colWidths=[14*cm, 2*cm])
    tab.setStyle(TableStyle([
        ("FONT", (0,0), (-1,-1), "Helvetica", 11),
        ("LEFTPADDING", (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("TEXTCOLOR", (0,0), (-1,-1), NAVY),
        ("ALIGN", (1,0), (1,-1), "RIGHT"),
    ]))
    f.append(tab)
    f.append(PageBreak())

    # ========== 1. RESUMO EXECUTIVO ==========
    f.append(Paragraph("1. Resumo executivo — sua tese em 60 segundos", est_h1))
    f.append(Paragraph(
        "Se a banca te perguntar logo de cara <i>“em poucas palavras, o que é o seu trabalho?”</i>, "
        "esta é a resposta que você deve ter memorizada — e que cabe em <b>1 minuto</b> de fala.", est_body))
    f.append(Spacer(1, 6))
    f.append(caixa(
        "<b>Problema:</b> Equipes corporativas que usam Kanban tradicional perdem entre 15% e 30% do tempo procurando "
        "POPs e regras de negócio — o <i>Gargalo Cognitivo</i> — o que gera quebras de SLA e baixa resolução no primeiro contato.<br/><br/>"
        "<b>Hipótese:</b> Se um LLM puder injetar, dentro do próprio cartão Kanban, um checklist filtrado por "
        "TAGS temáticas autorizadas via Row Level Security, então o Wait Time despenca e o Cycle Time cai junto.<br/><br/>"
        "<b>Método:</b> Simulação Computacional de Eventos Discretos em Node.js, replicada 30 vezes via Monte Carlo "
        "em Python, com teste t pareado bilateral (df=29, α=0,001).<br/><br/>"
        "<b>Resultados:</b> Cycle Time -44,6% (p&lt;0,001), Quebra de SLA cai de 28,3% para 0%, FCR sobe de 53,4% para 95,3%, "
        "consumo de tokens do LLM -87,5%.<br/><br/>"
        "<b>Contribuição:</b> Não é mais um chatbot lateral — é a transformação do cartão Kanban em um <i>agente "
        "contextual semântico</i>, com isolamento multilocatário garantido pelo núcleo do PostgreSQL.",
        cor_fundo=colors.HexColor("#FFF8E1"), cor_borda=OURO, padding=10))
    f.append(Spacer(1, 14))
    f.append(Paragraph("Frase de impacto para abrir a defesa", est_h2))
    f.append(Paragraph(
        "<i>“O Kanban tradicional dá visibilidade ao fluxo. O Kanban IA dá visibilidade ao fluxo "
        "e injeta, no próprio cartão, o conhecimento corporativo que faz a tarefa andar — "
        "sob isolamento multilocatário absoluto.”</i>", est_quote))
    f.append(PageBreak())

    # ========== 2. GLOSSARIO ==========
    f.append(Paragraph("2. Glossário técnico", est_h1))
    f.append(Paragraph(
        "Se você travar em qualquer um destes termos durante a arguição, vai parecer que decorou em vez de entender. "
        "Saiba explicar cada um <b>em 1 frase, sem ler</b>.", est_body))
    f.append(Spacer(1, 8))

    termos = [
        ("Kanban", "Método de gestão visual herdado do Sistema Toyota de Produção, formalizado por Anderson (2010), baseado em 4 práticas: visualizar o fluxo, limitar o WIP, gerenciar o fluxo e tornar as políticas explícitas."),
        ("WIP (Work in Progress)", "Quantidade de cartões em execução simultânea. Limitar o WIP é o que faz o Kanban funcionar — quando há excesso de trabalho parado, o sistema sinaliza visualmente."),
        ("Lead Time", "Tempo entre a entrada da demanda no sistema e a entrega final ao solicitante. Inclui tempo em fila."),
        ("Cycle Time", "Tempo em que o cartão fica na coluna 'In Progress'. Soma de Wait Time + Touch Time. É a métrica central do seu trabalho."),
        ("Wait Time", "Tempo gasto pelo operador esperando alguma coisa: consulta a manual, resposta de supervisor, busca em planilha. É o tempo invisível e a sua grande vítima."),
        ("Touch Time", "Tempo de execução técnica efetiva do trabalho — quando as mãos estão na tarefa."),
        ("Throughput", "Quantidade de cartões concluídos por unidade de tempo."),
        ("Gargalo Cognitivo", "Termo cunhado por você no TCC. Designa o tempo invisível gasto pelo operador na busca por conhecimento operacional. É a manifestação prática do Wait Time."),
        ("SLA (Service Level Agreement)", "Acordo contratual de nível de serviço. No seu TCC, fixado em 240 minutos (4 horas)."),
        ("FCR (First Contact Resolution)", "Percentual de chamados resolvidos sem escalação para níveis hierárquicos superiores."),
        ("LLM (Large Language Model)", "Modelos de linguagem de grande escala (Gemini, GPT, Claude…). Funcionam recebendo um <i>prompt</i> e devolvendo texto preditivo."),
        ("Token", "Unidade mínima de processamento do LLM — fragmento de palavra. Cada chamada à API é cobrada por tokens consumidos."),
        ("Prompt", "Entrada textual enviada ao LLM. No seu sistema, o prompt é montado dinamicamente com os metadados do cartão + POPs filtrados."),
        ("Alucinação", "Quando o LLM inventa fatos ou regras inexistentes. O RAG e o filtro por TAGS minimizam isso."),
        ("RAG (Retrieval-Augmented Generation)", "Arquitetura introduzida por Lewis et al. (2020): o LLM não responde só com o que aprendeu — antes da geração, busca-se conhecimento externo relevante e injeta-se no prompt."),
        ("TAGS de Autorização Temática", "Termo seu. Etiquetas semânticas (ex: [SLA_FINANCEIRO], [TURNO_NOTURNO]) que classificam tanto cartões quanto registros da knowledge_base, permitindo o casamento e a filtragem cirúrgica antes do LLM."),
        ("Mecanismo de Scoping Temático Autônomo", "O coração da sua contribuição. É o processo de 4 etapas: (1) clique do operador, (2) envio de metadados + JWT, (3) consulta filtrada por TAG sob RLS, (4) prompt enxuto ao Gemini."),
        ("RLS (Row Level Security)", "Política nativa do PostgreSQL que filtra <i>quais linhas</i> uma consulta pode ver, antes mesmo de avaliar a cláusula WHERE explícita. Aplicada com CREATE POLICY."),
        ("Multilocatário (multi-tenant)", "Arquitetura SaaS em que múltiplos clientes (tenants) compartilham a mesma infraestrutura, mas seus dados ficam logicamente isolados. Você usa company_id + RLS."),
        ("SPA (Single Page Application)", "Aplicação web que carrega uma única página HTML e atualiza o conteúdo dinamicamente via JavaScript. Padrão do seu frontend React + Vite."),
        ("BaaS (Backend as a Service)", "Backend completo entregue como serviço (banco + auth + API). O Supabase é o seu BaaS."),
        ("Vercel Edge Network", "CDN/serverless da Vercel que distribui sua SPA mundialmente com baixa latência. Suporta rewrites first-party."),
        ("Rewrites first-party", "Regras de roteamento que fazem chamadas a APIs externas parecerem vir do seu próprio domínio, contornando bloqueadores de anúncios e CORS."),
        ("DES (Discrete-Event Simulation)", "Modelagem de sistemas como uma sequência de eventos discretos no tempo. Referência: Banks et al. (2010)."),
        ("Monte Carlo", "Técnica de simulação estocástica que executa o experimento múltiplas vezes para obter uma distribuição de resultados — você fez 30 réplicas."),
        ("Teste t pareado", "Teste estatístico inferencial para comparar duas medidas tomadas do mesmo conjunto de réplicas. Com df=29 e α=0,001, o valor crítico é 3,659."),
        ("p-valor", "Probabilidade de obter um resultado tão ou mais extremo se a hipótese nula (H₀) fosse verdadeira. Quanto menor, mais forte a evidência contra H₀."),
        ("IC 95% (Intervalo de Confiança)", "Faixa que, com 95% de probabilidade, contém o valor verdadeiro do parâmetro. Calculado como ±1,96·σ/√n."),
        ("JWT (JSON Web Token)", "Token de autenticação carregando dados do usuário (email, company_id…). Usado no Supabase para gerar auth.jwt() lido pelas políticas RLS."),
        ("Swarming", "Prática Kanban em que toda a equipe foca em destravar um único cartão crítico, em vez de cada um manter o seu fluxo isolado."),
    ]

    for termo, defin in termos:
        f.append(Paragraph(f"<b>{termo}</b> — {defin}", est_body))
        f.append(Spacer(1, 2))

    f.append(PageBreak())

    # ========== 3. CONCEITOS-CHAVE ==========
    f.append(Paragraph("3. Os 5 conceitos que você TEM que dominar", est_h1))
    f.append(Paragraph(
        "Se a banca cavar a fundo, ela vai cavar em um destes 5 pontos. Estude até conseguir explicar para uma pessoa "
        "que nunca viu o trabalho.", est_body))

    # 3.1 Kanban + Anderson
    f.append(Paragraph("3.1 Kanban — por que importa para o seu trabalho", est_h2))
    f.append(Paragraph(
        "O Kanban surgiu na Toyota nos anos 1960 (Taiichi Ohno) como sistema de cartões físicos para sinalizar reposição "
        "de estoque just-in-time. David Anderson, em 2010, formalizou o método para gestão de trabalho intelectual em "
        "TI/serviços. As 4 práticas fundamentais são:", est_body))
    f.append(ListFlowable([
        ListItem(Paragraph("Visualizar o fluxo de trabalho.", est_body)),
        ListItem(Paragraph("Limitar o trabalho em progresso (WIP).", est_body)),
        ListItem(Paragraph("Gerenciar o fluxo (medir Lead Time, Cycle Time, Throughput).", est_body)),
        ListItem(Paragraph("Tornar as políticas de processo explícitas.", est_body)),
    ], bulletType="bullet", leftIndent=18))
    f.append(Paragraph(
        "<b>Por que isso importa para você?</b> Porque você não está reinventando o Kanban — está respeitando seus "
        "fundamentos. O Kanban IA mantém visualização, WIP e fluxo, mas <b>resolve uma fraqueza estrutural</b>: o cartão "
        "tradicional não carrega conhecimento, ele apenas <i>descreve</i> a tarefa. Reinertsen (2009) já alertava: filas "
        "invisíveis de informação custam mais que filas de produção.", est_body))

    # 3.2 RAG
    f.append(Paragraph("3.2 RAG — a base teórica da injeção semântica", est_h2))
    f.append(Paragraph(
        "RAG é uma arquitetura proposta por Lewis et al. em 2020 (NeurIPS) para resolver dois problemas dos LLMs:", est_body))
    f.append(ListFlowable([
        ListItem(Paragraph("<b>Janela de contexto limitada:</b> o modelo não cabe a empresa inteira no prompt.", est_body)),
        ListItem(Paragraph("<b>Alucinação:</b> o modelo inventa fatos quando não sabe.", est_body)),
    ], bulletType="bullet", leftIndent=18))
    f.append(Paragraph(
        "A solução do RAG: <b>antes</b> de chamar o LLM, busque na base de conhecimento o que é relevante para a pergunta, "
        "e injete <b>apenas isso</b> no prompt. O LLM passa a responder com base em fontes verificáveis.", est_body))
    f.append(Paragraph(
        "<b>O que você melhorou?</b> O RAG genérico faz busca por similaridade vetorial (embeddings). Isso ainda pode "
        "trazer ruído. Você adicionou uma <b>camada taxonômica</b>: as TAGS funcionam como índice semântico humano, "
        "validado pelo gestor. O resultado é um RAG <i>dirigido por taxonomia</i>, com payload 87,5% menor e zero "
        "ambiguidade.", est_body))

    # 3.3 RLS
    f.append(Paragraph("3.3 RLS — o que protege seus clientes uns dos outros", est_h2))
    f.append(Paragraph(
        "Row Level Security é uma política aplicada <b>no núcleo do PostgreSQL</b>. Antes da consulta executar a "
        "cláusula WHERE explícita, o motor avalia se cada linha pode ser retornada para o usuário autenticado.", est_body))
    f.append(Paragraph("Exemplo do seu sistema:", est_body))
    f.append(Paragraph(
        'CREATE POLICY "Knowledge base company isolation"<br/>'
        '&nbsp;&nbsp;ON knowledge_base FOR ALL<br/>'
        '&nbsp;&nbsp;USING (company_id IN (SELECT company_id<br/>'
        "&nbsp;&nbsp;&nbsp;&nbsp;FROM profiles WHERE email = auth.jwt()-&gt;&gt;'email'));", est_code))
    f.append(Paragraph(
        "<b>Por que isso é diferente de WHERE manual?</b> Porque o WHERE manual depende do programador lembrar de "
        "colocá-lo em <i>toda</i> query. Se ele esquece em uma única chamada, vaza dado entre clientes. Com RLS, mesmo "
        "que o desenvolvedor faça <code>SELECT * FROM knowledge_base</code>, o PostgreSQL filtra automaticamente. É "
        "segurança <b>por construção</b>, não por convenção.", est_body))

    # 3.4 DES e Monte Carlo
    f.append(Paragraph("3.4 DES + Monte Carlo — a metodologia do seu Capítulo 5", est_h2))
    f.append(Paragraph(
        "Simulação de Eventos Discretos é a técnica clássica para modelar sistemas com filas, recursos compartilhados "
        "e variabilidade estocástica — exatamente um Kanban. Banks et al. (2010) é a referência.", est_body))
    f.append(Paragraph(
        "Replicação Monte Carlo significa rodar o mesmo experimento simulado <b>múltiplas vezes</b> com sementes "
        "aleatórias diferentes (ou no seu caso, com seed=42 fixa para reprodutibilidade), gerando uma <i>distribuição</i> "
        "de resultados, não um número solto.", est_body))
    f.append(Paragraph(
        "<b>Por que 30 réplicas?</b> Esse é o número mínimo amplamente aceito para invocar o Teorema Central do Limite "
        "(TCL): a partir de N=30, a média amostral tende a uma distribuição normal independentemente da distribuição "
        "subjacente, permitindo usar testes paramétricos (como o t de Student) com segurança.", est_body))

    # 3.5 Teste t pareado
    f.append(Paragraph("3.5 Teste t pareado — sua arma contra a crítica metodológica", est_h2))
    f.append(Paragraph(
        "É o teste estatístico que compara duas medidas tomadas <b>do mesmo</b> conjunto experimental. No seu caso, em "
        "cada uma das 30 réplicas, você gera um par (Cycle Time Kanban Tradicional, Cycle Time Kanban IA). Você testa "
        "se a diferença média entre os pares é zero (H₀) ou diferente de zero (H₁).", est_body))
    f.append(Paragraph(
        "A estatística t é calculada como:<br/>"
        "<b>t = média(diferenças) / [desvio-padrão(diferenças) / √n]</b>", est_body))
    f.append(Paragraph(
        "Com df = n-1 = 29 e α = 0,001 (bilateral), o valor crítico de t é <b>3,659</b>. Todos os seus t-stats "
        "estouraram esse limiar (99, 109, 114, 39, 47), implicando <b>p &lt; 0,001</b> — isto é, há menos de 1 chance em "
        "1.000 de seus resultados acontecerem por acaso.", est_body))
    f.append(PageBreak())

    # ========== 4. ARQUITETURA ==========
    f.append(Paragraph("4. Arquitetura do sistema em camadas", est_h1))
    f.append(Paragraph(
        "Se a banca pedir para você desenhar a arquitetura no quadro, este é o mapa mental.", est_body))

    cam = [
        ("Frontend (Camada de Apresentação)",
         "React.js 18 + Vite. Renderiza o quadro Kanban e captura o clique do operador no botão 'Solicitar Apoio da IA'. CSS puro (Vanilla CSS) para liberdade total de design — efeitos como Glassmorphism e gradientes."),
        ("Vercel Edge Network (Camada de Distribuição)",
         "CDN distribuída globalmente. Hospeda o JS estático. Usa rewrites configurados em vercel.json para rotear chamadas /api/* como first-party, evitando bloqueadores e CORS."),
        ("Supabase (Camada de Aplicação / BaaS)",
         "Auth (Google SSO) + API automática (PostgREST) + database. Recebe a requisição do frontend com o JWT e dispara a consulta SQL parametrizada à knowledge_base. Toda chamada passa pelas políticas RLS antes de retornar dados."),
        ("PostgreSQL (Camada de Persistência)",
         "Banco relacional. Tabelas centrais: companies, profiles, projects, knowledge_base, tasks, ai_logs. Cada tabela sensível tem RLS habilitado com política por company_id."),
        ("Motor de IA (Camada Cognitiva)",
         "Função no backend que recebe os POPs já filtrados, monta um prompt enxuto (~1.500 tokens) e chama a API do Google Gemini. Recebe a resposta determinística e retorna ao frontend, que renderiza o checklist no próprio cartão."),
    ]
    for titulo, descr in cam:
        f.append(Paragraph(titulo, est_h3))
        f.append(Paragraph(descr, est_body))

    f.append(Paragraph("Fluxo completo, do clique ao checklist", est_h2))
    f.append(ListFlowable([
        ListItem(Paragraph("Operador clica em 'Apoio da IA' no cartão #102 (frontend).", est_body)),
        ListItem(Paragraph("Frontend envia POST /api/ia-suggest com {card_id, tags, prioridade} + JWT (Vercel Edge).", est_body)),
        ListItem(Paragraph("Supabase recebe → resolve company_id via JWT → executa SELECT na knowledge_base.", est_body)),
        ListItem(Paragraph("PostgreSQL aplica RLS: retorna SÓ POPs da empresa do usuário cujas TAGS interceptam as do cartão.", est_body)),
        ListItem(Paragraph("Backend monta o prompt: [Metadados do cartão] + [POPs autorizados] → Gemini API.", est_body)),
        ListItem(Paragraph("Gemini devolve checklist passo a passo determinístico em menos de 1,5 s.", est_body)),
        ListItem(Paragraph("Frontend renderiza o checklist diretamente no cartão. Operador executa.", est_body)),
    ], bulletType="1", leftIndent=18))
    f.append(PageBreak())

    # ========== 5. ROTEIRO ==========
    f.append(Paragraph("5. Roteiro narrativo da defesa", est_h1))
    f.append(Paragraph(
        "Cada slide tem uma fala-chave de 30 a 60 segundos. <b>Não leia o slide</b> — fale sobre ele. Total: 18 minutos.", est_body))

    roteiro = [
        ("S1 — Capa (15 s)",
         "Saudação curta. Não leia o título inteiro — diga: \"Vou apresentar o Mecanismo Kanban IA, uma evolução semântica do Kanban tradicional, validada estatisticamente.\""),
        ("S2 — Agenda (30 s)",
         "Apenas mostre as 7 etapas. Dica: numere com os dedos."),
        ("S3 — Problema (1 min)",
         "\"Centrais de Serviços perdem entre 15% e 30% da jornada apenas procurando informação — Feldman e Sherman, IDC 2004. Esse Gargalo Cognitivo é invisível, mas custa em multas de SLA, retrabalho e turnover.\""),
        ("S4 — Hipótese (1 min)",
         "Aponte os 2 cards lado a lado. \"À esquerda, o cartão passivo. À direita, o cartão que injeta o checklist na própria interface. Esta é a tese central do trabalho.\""),
        ("S5 — Arquitetura (2 min)",
         "Descreva as 5 camadas de baixo para cima, em 20 segundos cada: PostgreSQL → Supabase → Vercel → React → Gemini. Termine com o stat box: <b>1,5 s de latência</b>."),
        ("S6 — UML Casos de Uso (1 min)",
         "Identifique os 3 atores e diga: \"O operador é o cliente da IA. O gestor é o curador da knowledge_base. O cliente B2B alimenta o backlog.\""),
        ("S7 — UML Sequência (1 min)",
         "Aponte para a nota amarela: \"Aqui é onde o RLS entra. Antes da consulta retornar, o PostgreSQL já filtrou tudo que não pertence à empresa do usuário.\""),
        ("S8 — RLS em produção (2 min)",
         "Mostre o SQL real. \"Esta política é o que blinda 100% dos meus clientes uns dos outros. Repare em <b>auth.jwt()</b> — é o token do usuário sendo lido pelo banco, não pela aplicação.\""),
        ("S9 — Metodologia (1,5 min)",
         "Os 3 cards: Modelagem (Banks 2010), Calibração (Feldman 2004), Inferência (30 réplicas + teste t). Termine: \"3.000 execuções simuladas, seed 42, totalmente reprodutível.\""),
        ("S10-S11 — Simuladores rodando (3 min)",
         "<b>Recomendo demo ao vivo:</b> abra um terminal, rode <code>node simulador_performance_tcc.js</code> e depois <code>python monte_carlo.py</code>. As capturas nos slides são fallback caso algo falhe. Aponte as métricas conforme aparecem."),
        ("S12 — Tabela de resultados (1,5 min)",
         "Vá linha por linha. Encerre: \"O valor crítico de t é 3,659. Todos os meus t-stats estão acima de 39. P < 0,001 em todas as métricas.\""),
        ("S13 — Cycle Time (1 min)",
         "Foque no callout dourado: <b>−44,6%</b>. \"De 170 para 94 minutos por cartão.\""),
        ("S14 — Boxplot (1 min)",
         "Frase forte: \"Mesmo a réplica mais lenta do Kanban IA é mais rápida que a réplica mais rápida do Kanban Tradicional. Não há sorte estatística aqui.\""),
        ("S15 — SLA e FCR (1 min)",
         "\"Quebra de SLA: 28% para zero. FCR: 53% para 95%. Estes são os números que o cliente B2B realmente vê na conta do fim do mês.\""),
        ("S16 — Tokens e ROI (1 min)",
         "\"Reduzi o payload do LLM em 87,5% porque envio apenas o conhecimento filtrado pela TAG. Isso traduz em economia anual potencial de R$ 1,5 milhão para 1.000 chamados/mês.\""),
        ("S17 — Conclusões (1 min)",
         "Leia os 7 itens entregues à esquerda. Mencione 2 trabalhos futuros à direita."),
        ("S18 — Obrigado (15 s)",
         "Pausa. Sorria. \"Estou à disposição para perguntas.\""),
    ]
    for s, fala in roteiro:
        f.append(Paragraph(s, est_h3))
        f.append(Paragraph(fala, est_body))
    f.append(PageBreak())

    # ========== 6. PERGUNTAS ==========
    f.append(Paragraph("6. 30 perguntas prováveis da banca + respostas modelo", est_h1))
    f.append(Paragraph(
        "Estude estas como se fossem flashcards. Para cada uma, pratique falar a resposta em voz alta, sem ler. "
        "Estão agrupadas por área de ataque.", est_body))

    f.append(Paragraph("6.1 Sobre o problema e a justificativa", est_h2))
    qa = [
        ("Por que esse problema é relevante hoje?",
         "Porque a popularização dos LLMs em 2023-2025 tornou viável injetar conhecimento corporativo em tempo real, mas o setor de gestão operacional ainda usa Kanban da forma de 2010. O gap entre o que a IA pode fazer e o que as ferramentas oferecem é o que justifica esta pesquisa."),
        ("Esse problema não é resolvido só com uma boa wiki corporativa?",
         "Não. Wiki é passiva — o operador precisa parar a tarefa, sair da tela, pesquisar, interpretar e voltar. Wait Time persiste. O Kanban IA é ativo — entrega o checklist no próprio cartão sem mudança de contexto."),
        ("Como você sabe que 15-30% é um número aplicável ao Brasil?",
         "É um intervalo, não um número absoluto, e foi medido pela IDC em base internacional ampla. Para um TCC, é uma âncora metodológica suficiente; em um doutorado, exigiria coleta brasileira específica — eu cito isso como limitação no §7.1."),
    ]
    for q, r in qa:
        f.extend(pergunta_resposta(q, r))

    f.append(Paragraph("6.2 Sobre a metodologia", est_h2))
    qa = [
        ("A sua simulação não é circular? Você calibrou os parâmetros para o resultado dar a seu favor.",
         "É a crítica mais inteligente possível. Minha defesa tem 3 partes: (1) os parâmetros do Sistema A foram calibrados a partir do intervalo 15-30% de Feldman e Sherman, não inventados; (2) os parâmetros do Sistema B refletem o tempo real de leitura de um checklist gerado por LLM (2 a 5 minutos), facilmente medido; (3) o teste t pareado com p < 0,001 garante que mesmo com variação estocástica, a diferença é estrutural — não aleatória."),
        ("Por que distribuição uniforme e não lognormal?",
         "Por simplicidade e transparência. Uniforme é mais fácil de calibrar e defender. Lognormal aderiria melhor à realidade — listei isso como trabalho futuro no §7.2. Para o objetivo de comparação direcional, a uniforme é suficiente."),
        ("Por que 30 réplicas e não 100 ou 1000?",
         "Por causa do Teorema Central do Limite: a partir de N=30, a média amostral converge para uma distribuição normal, permitindo testes paramétricos como o t. Acima de 30, o ganho marginal de precisão é pequeno. Foi escolha pragmática baseada em Banks et al. (2010)."),
        ("Você comparou com algum sistema real?",
         "Não. Esta é uma das limitações que declaro abertamente no §7.1. Estudo de caso longitudinal em operação real é o trabalho futuro #1."),
        ("Seed=42 é convenção ou foi escolhido para favorecer?",
         "Convenção da comunidade de ciência de dados — é a 'resposta da vida, do universo e tudo mais' do Guia do Mochileiro. Qualquer outra semente daria resultados parecidos. A escolha de seed é só para reprodutibilidade."),
    ]
    for q, r in qa:
        f.extend(pergunta_resposta(q, r))

    f.append(Paragraph("6.3 Sobre arquitetura e implementação", est_h2))
    qa = [
        ("Por que Supabase e não AWS RDS direto?",
         "Custo total de propriedade. Supabase é PostgreSQL gerenciado com auth, API REST e realtime já integrados. Para pequenas e médias operações, equivale a anos de engenharia de plataforma sem custo. Para empresas Fortune 500, o RDS direto faz mais sentido."),
        ("Por que Vanilla CSS e não Tailwind?",
         "Decisão de design system. Tailwind é excelente para velocidade, mas limita o vocabulário visual. Eu precisava de efeitos de Glassmorphism e gradientes específicos. Vanilla CSS me deu controle total sem dívida de framework."),
        ("Por que Gemini e não GPT-4 ou Claude?",
         "Custo + acordo de processamento de dados. Gemini tem preço competitivo, suporta JSON estruturado e o Google Cloud oferece data residency. Em prod, seria trocável — a camada de IA está abstraída atrás de uma interface simples."),
        ("O que acontece se a API do Gemini cair?",
         "Plano de contingência: o backend tem timeout configurado. Em caso de falha, o frontend exibe os POPs brutos retornados do Supabase como fallback. A operação não trava — perde-se apenas a sumarização e o checklist guiado."),
        ("Como você evita prompt injection malicioso?",
         "Três camadas: (1) o conteúdo dos POPs vem da knowledge_base controlada pelo gestor — não de input livre do operador; (2) o RLS impede acesso a POPs de outras empresas; (3) o prompt template tem delimitadores explícitos. Trabalho futuro inclui testes adversariais sistemáticos."),
        ("Por que RLS por email e não por user_id?",
         "Escolha pragmática observada no security_hardening.sql: o JWT do Supabase carrega o email de forma consistente entre fluxos (Google SSO, link mágico, senha). Funcionalmente equivalente a user_id, mais legível em logs de auditoria."),
        ("E se uma empresa tiver 10 mil POPs? A consulta não fica lenta?",
         "Não. A filtragem por TAGS (array do PostgreSQL com índice GIN) é O(log n) na prática. Mesmo 100 mil registros retornam em milissegundos. O RLS aplica filtros em forma de predicado, otimizados pelo planejador."),
    ]
    for q, r in qa:
        f.extend(pergunta_resposta(q, r))

    f.append(Paragraph("6.4 Sobre resultados e estatística", est_h2))
    qa = [
        ("O que significa um t de 114 em termos práticos?",
         "Significa que a diferença observada está 114 desvios-padrão acima do esperado por acaso. O valor crítico para p=0,001 é 3,659. Você poderia errar a hipótese em uma chance em centenas de milhões."),
        ("Por que a Quebra de SLA do Sistema B ficou zero exato?",
         "Porque o Cycle Time máximo possível no Sistema B é Wait máximo (5) + Touch máximo da alta complexidade (200 × 1,00) = 205 min, abaixo dos 240 min do SLA. Estruturalmente, é impossível quebrar SLA no Sistema B sob esses parâmetros. Em condições reais com outliers, pode haver quebras esporádicas."),
        ("O FCR aumentou demais (53 → 95). Não é otimista?",
         "É um teto teórico decorrente das regras de FCR no simulador. A elevação reflete que com um checklist exato, complexidade média e baixa são quase 100% resolvíveis. Em produção, observaria-se algo entre 75% e 90%, ainda assim ganho significativo."),
        ("Você fez ANOVA ou só teste t?",
         "Só teste t pareado bilateral, pois minha comparação é de duas amostras pareadas. ANOVA seria adequada se houvesse 3 ou mais sistemas (ex: Kanban Tradicional, Kanban + IA Genérica, Kanban IA). Boa sugestão para trabalho futuro."),
        ("Calculou o tamanho de efeito (Cohen's d)?",
         "Não no documento atual, mas é trivial: d = média(diferenças) / σ(diferenças). Para o Cycle Time, dá aproximadamente 20+, que é classificado como 'efeito enorme' (huge). Posso incluir como anexo em uma revisão."),
    ]
    for q, r in qa:
        f.extend(pergunta_resposta(q, r))

    f.append(Paragraph("6.5 Sobre originalidade e impacto", est_h2))
    qa = [
        ("Isso não é apenas RAG aplicado a Kanban?",
         "RAG genérico envia chunks vetorizados por similaridade. Meu trabalho usa filtragem por TAGS humanamente validadas + RLS multilocatário. É RAG dirigido por taxonomia, não por embedding. Resultado: payload 87,5% menor e zero ambiguidade semântica."),
        ("Já existem produtos que fazem isso (Atlassian Intelligence, Notion AI)?",
         "Esses produtos fazem sumarização e Q&A sobre conteúdo do próprio cartão. Não fazem injeção de POPs corporativos contextualizados, com isolamento multilocatário no nível do banco. O escopo é diferente. Posso documentar a comparação em revisão futura."),
        ("Qual sua contribuição em uma frase?",
         "Transformei o cartão Kanban de contêiner descritivo passivo em agente contextual semântico, com isolamento multilocatário garantido por construção, validado estatisticamente via simulação Monte Carlo."),
        ("E se eu quisesse implementar isso amanhã, qual a barreira?",
         "Curadoria da knowledge_base. O sistema só funciona se houver POPs bem escritos e bem etiquetados com TAGS. Esse trabalho de curadoria inicial é o maior custo de adoção, não a tecnologia."),
        ("Tem código aberto?",
         "O simulador (Apêndice A e B) é integralmente reproduzido no TCC. O sistema completo está em desenvolvimento contínuo no repositório próprio. Estou aberto a publicar uma versão demo após a defesa, se a banca recomendar."),
    ]
    for q, r in qa:
        f.extend(pergunta_resposta(q, r))

    f.append(Paragraph("6.6 Perguntas-armadilha (responda com calma)", est_h2))
    qa = [
        ("Você usou IA para escrever este TCC?",
         "Usei IA como ferramenta de apoio à redação, à mesma escala em que usaria um corretor gramatical ou um colega revisor — mas o conteúdo técnico, a hipótese, a modelagem do simulador, a interpretação dos resultados e as decisões arquiteturais são meus. Posso defender cada linha do trabalho oralmente."),
        ("Por que não rodou em ambiente real?",
         "Por restrição de prazo e de acesso a uma operação cliente disposta a participar. Está declarado como limitação no §7.1 e como trabalho futuro prioritário no §7.2."),
        ("E o impacto humano? Os operadores não vão ser substituídos pela IA?",
         "Pelo contrário. A IA elimina o tempo de busca, não o trabalho. O operador continua sendo o executor — mas com menos fadiga decisória, mais autonomia e menos escalações. A pesquisa de Choo (2003) sustenta que a entrega oportuna do conhecimento eleva, não substitui, a tomada de decisão humana."),
    ]
    for q, r in qa:
        f.extend(pergunta_resposta(q, r))

    f.append(PageBreak())

    # ========== 7. ARMADILHAS ==========
    f.append(Paragraph("7. Armadilhas da banca e como escapar delas", est_h1))

    f.append(Paragraph("7.1 'Por que você não fez X?'", est_h2))
    f.append(Paragraph(
        "Banca sempre acha que faltou algo. Estratégia: <b>não se defenda — concorde, contextualize, redirecione.</b> "
        "Exemplo: <i>\"Excelente sugestão, professor. Isso seria de fato o próximo passo natural. No escopo deste TCC, "
        "optei por X para manter rigor metodológico em [aspecto], mas listei sua sugestão como trabalho futuro no §7.2.\"</i>", est_body))

    f.append(Paragraph("7.2 'Esse resultado parece bom demais'", est_h2))
    f.append(Paragraph(
        "Esperem essa. A resposta: <i>\"Concordo que os números são expressivos. Eles refletem uma simulação controlada, "
        "calibrada a partir da literatura. O ganho relativo é o que importa, não os valores absolutos. Em ambiente real, "
        "o ganho seria menor — talvez 30-40% no Cycle Time em vez de 44% — mas direcionalmente robusto.\"</i>", est_body))

    f.append(Paragraph("7.3 'Qual o limite ético?'", est_h2))
    f.append(Paragraph(
        "Resposta pronta: <i>\"Há três limites éticos claros: (1) o conteúdo da knowledge_base é curado por humanos, "
        "não gerado pelo LLM; (2) o operador final mantém autonomia para divergir do checklist quando o contexto pedir; "
        "(3) toda decisão sugerida pela IA é registrada em ai_logs para auditoria. A IA é assistente, não decisora.\"</i>", est_body))

    f.append(Paragraph("7.4 'E se a banca pegar pesado em estatística?'", est_h2))
    f.append(Paragraph(
        "Mantra: <b>defina, demonstre, declare limite.</b> Defina o que mediu (Cycle Time médio). Demonstre como mediu "
        "(30 réplicas × 100 cartões, t pareado df=29). Declare limite (intervalo de confiança ±IC95).", est_body))

    f.append(Paragraph("7.5 'Não entendi sua arquitetura'", est_h2))
    f.append(Paragraph(
        "Pegue caneta. Vá ao quadro. Desenhe as 5 camadas verticais e mostre as setas: operador → React → Vercel → "
        "Supabase → PostgreSQL (com RLS marcado) → Gemini. Isso enche os olhos.", est_body))

    f.append(Paragraph("7.6 'O que você faria de diferente?'", est_h2))
    f.append(Paragraph(
        "Resposta forte: <i>\"Substituiria a distribuição uniforme do Touch Time por lognormal, instrumentaria uma "
        "operação real para coletar tempos verdadeiros e adicionaria testes adversariais de prompt injection. Já está "
        "tudo no §7.2 como trabalho futuro.\"</i> Você está se autoavaliando antes da banca — isso desarma críticas.", est_body))

    f.append(PageBreak())

    # ========== 8. CARTAO DE BOLSO ==========
    f.append(Paragraph("8. Cartão de bolso — decore na véspera", est_h1))
    f.append(Paragraph(
        "Imprima esta página e leve para a defesa. Use só se travar.", est_body))

    f.append(Paragraph("Os números que TODO TCC tem que ter na ponta da língua", est_h2))
    nums = [
        ("Wait Time", "Kanban: 47,5 ± 2,4 min", "Kanban IA: 3,5 ± 0,1 min", "−92,6%", "t = 99,7"),
        ("Touch Time", "123,1 ± 5,3 min", "91,0 ± 4,1 min", "−26,1%", "t = 109,8"),
        ("Cycle Time", "170,6 ± 7,4 min", "94,5 ± 4,0 min", "−44,6%", "t = 114,7"),
        ("Quebra SLA", "28,3 ± 3,9%", "0,0%", "−100%", "t = 39,3"),
        ("FCR", "53,4 ± 4,3%", "95,3 ± 2,3%", "+41,9 p.p.", "t = 47,3"),
    ]
    tab = Table(
        [["Métrica", "Kanban", "Kanban IA", "Δ", "t (df=29)"]] + list(nums),
        colWidths=[2.5*cm, 4.5*cm, 4.5*cm, 2.5*cm, 2.5*cm])
    tab.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONT", (0,0), (-1,0), "Helvetica-Bold", 10),
        ("FONT", (0,1), (-1,-1), "Helvetica", 9.5),
        ("ALIGN", (0,0), (-1,-1), "CENTER"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("BACKGROUND", (3,1), (3,-1), colors.HexColor("#FFF8E1")),
        ("FONT", (3,1), (3,-1), "Helvetica-Bold", 9.5),
        ("GRID", (0,0), (-1,-1), 0.5, CINZA),
        ("LEFTPADDING", (0,0), (-1,-1), 4),
        ("RIGHTPADDING", (0,0), (-1,-1), 4),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ]))
    f.append(tab)
    f.append(Spacer(1, 14))

    f.append(Paragraph("Outras métricas críticas", est_h2))
    f.append(Paragraph(
        "<b>•</b> Amostra: 30 réplicas × 100 cartões = 3.000 execuções simuladas<br/>"
        "<b>•</b> Seed: 42 (reprodutível)<br/>"
        "<b>•</b> Valor crítico t (df=29, α=0,001 bilateral): <b>3,659</b><br/>"
        "<b>•</b> SLA contratual: 240 minutos (4 horas)<br/>"
        "<b>•</b> Payload LLM: 12.000 → 1.500 tokens (−87,5%)<br/>"
        "<b>•</b> Latência IA: &lt; 1,5 segundos<br/>"
        "<b>•</b> Custo hora técnica: R$ 50,00<br/>"
        "<b>•</b> Horas salvas / lote 100 cartões: 127,8 horas<br/>"
        "<b>•</b> ROI anual estimado (1.000 chamados/mês): ~R$ 1,5 milhão", est_body))

    f.append(Paragraph("Autores que VOCÊ TEM QUE CITAR de cabeça", est_h2))
    f.append(Paragraph(
        "<b>•</b> <b>Anderson (2010)</b> — Kanban formalizado para TI; 4 práticas centrais<br/>"
        "<b>•</b> <b>Reinertsen (2009)</b> — Cost of Delay, filas invisíveis de informação<br/>"
        "<b>•</b> <b>Feldman &amp; Sherman (IDC, 2004)</b> — 15-30% do tempo procurando informação<br/>"
        "<b>•</b> <b>Choo (2003)</b> — Conhecimento contextualizado eleva decisão<br/>"
        "<b>•</b> <b>Lewis et al. (NeurIPS, 2020)</b> — RAG seminal<br/>"
        "<b>•</b> <b>Min et al. (EMNLP, 2022)</b> — Importância da delimitação de contexto<br/>"
        "<b>•</b> <b>Banks et al. (2010)</b> — DES e replicação Monte Carlo<br/>"
        "<b>•</b> <b>Chong &amp; Carraro (2006)</b> — Estratégias multi-tenant SaaS", est_body))

    f.append(PageBreak())

    # ========== 9. CHECKLIST DIA D ==========
    f.append(Paragraph("9. Checklist do dia D", est_h1))

    f.append(Paragraph("Na véspera (D-1)", est_h2))
    f.append(Paragraph(
        "□ Reler o cap. 1 (Resumo executivo) e cap. 8 (Cartão de bolso) em voz alta 3 vezes<br/>"
        "□ Ensaiar a defesa cronometrada — 1 vez do início ao fim<br/>"
        "□ Carregar PPTX em pendrive E enviar para o e-mail (backup duplo)<br/>"
        "□ Imprimir 4 cópias da monografia: 1 para você, 3 para a banca<br/>"
        "□ Testar projetor / cabos HDMI / adaptador USB-C<br/>"
        "□ Preparar a roupa<br/>"
        "□ Dormir 8 horas — não estude depois das 22h", est_body))

    f.append(Paragraph("Na manhã do dia (D)", est_h2))
    f.append(Paragraph(
        "□ Café da manhã reforçado (proteína + carboidrato lento)<br/>"
        "□ Hidratação: 1 garrafa de água<br/>"
        "□ Chegar 40 minutos antes do horário marcado<br/>"
        "□ Ir ao banheiro 10 minutos antes<br/>"
        "□ Respirar fundo 5 vezes antes de entrar (técnica 4-7-8)<br/>"
        "□ Levar: notebook + carregador + pendrive + cópia impressa + caneta + água + cartão de bolso", est_body))

    f.append(Paragraph("Durante a apresentação", est_h2))
    f.append(Paragraph(
        "□ Cumprimentar os 3 examinadores nominalmente, se souber<br/>"
        "□ Falar com voz firme e em ritmo médio — pausa entre frases<br/>"
        "□ Não ler os slides — fale SOBRE eles<br/>"
        "□ Olhar para os 3 examinadores em rotação, não só para o orientador<br/>"
        "□ Se travar, beba água, respire e siga<br/>"
        "□ Se a demo ao vivo travar, vá direto ao screenshot no slide<br/>"
        "□ Cronometrar mentalmente: aos 9 minutos você deve estar no slide 9", est_body))

    f.append(Paragraph("Durante a arguição (perguntas)", est_h2))
    f.append(Paragraph(
        "□ Ouça a pergunta inteira — não interrompa<br/>"
        "□ Repita a pergunta com suas palavras (te dá 3 segundos para pensar)<br/>"
        "□ Comece a resposta com \"Boa pergunta, professor(a)\" — desarma o tom<br/>"
        "□ Se não souber, diga: \"Não tenho a resposta neste momento, mas a investigarei. É um excelente apontamento.\"<br/>"
        "□ Nunca diga \"eu não sei\" seco — sempre conclua com plano<br/>"
        "□ Ao final, agradeça nominalmente cada examinador", est_body))

    f.append(Paragraph("Fim", est_h2))
    f.append(caixa(
        "<b>Você fez o trabalho. Você fez 3.000 simulações estatísticas. Você tem 654 KB de monografia, 18 slides "
        "polidos, código real rodando em produção, RLS implementado e testado.</b><br/><br/>"
        "<b>A banca não está lá para te derrubar. Está lá para garantir que você sabe o que escreveu.</b><br/><br/>"
        "<b>E você sabe. Boa defesa.</b>",
        cor_fundo=colors.HexColor("#FFF8E1"), cor_borda=OURO, padding=12))

    # Construir
    doc.build(f, onFirstPage=cabecalho_rodape, onLaterPages=cabecalho_rodape)
    size_kb = os.path.getsize(OUT) / 1024
    print(f"OK -> {OUT} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    construir()
