# -*- coding: utf-8 -*-
"""
Guia de Apresentacao - PDF estilo teleprompter para ler durante a defesa.
Texto grande, fala verbatim, instrucoes de acao (apontar, respirar).
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, PageBreak,
                                 Table, TableStyle, HRFlowable, KeepTogether)

OUT_DOWN = r"C:\Users\vinic\Downloads\TCC_Guia_Apresentacao_Slides.pdf"
OUT_PROJ = r"C:\Users\vinic\Desktop\kabania\meuTcc\TCC_Guia_Apresentacao_Slides.pdf"

NAVY = colors.HexColor("#1E2761")
OURO = colors.HexColor("#FFB400")
VERDE = colors.HexColor("#2e8b57")
LARANJA = colors.HexColor("#d35400")
ROXO = colors.HexColor("#6c3483")
CINZA = colors.HexColor("#555555")
CINZA_CL = colors.HexColor("#EEF2F8")
CREME = colors.HexColor("#FFF8E1")
ALERTA = colors.HexColor("#c0392b")

# Estilos GRANDES (teleprompter)
est_capa_h = ParagraphStyle("CapaH", fontName="Helvetica-Bold", fontSize=30,
    textColor=NAVY, alignment=TA_CENTER, spaceAfter=18, leading=36)
est_capa_sub = ParagraphStyle("CapaSub", fontName="Helvetica-Oblique", fontSize=16,
    textColor=CINZA, alignment=TA_CENTER, spaceAfter=10, leading=20)

est_slide_num = ParagraphStyle("SlideNum", fontName="Helvetica-Bold", fontSize=18,
    textColor=OURO, alignment=TA_LEFT, spaceAfter=2, leading=22)
est_slide_titulo = ParagraphStyle("SlideTit", fontName="Helvetica-Bold", fontSize=22,
    textColor=NAVY, alignment=TA_LEFT, spaceAfter=8, leading=26)
est_tempo = ParagraphStyle("Tempo", fontName="Helvetica-BoldOblique", fontSize=12,
    textColor=ALERTA, alignment=TA_LEFT, spaceAfter=12)

# Acao: o que fazer fisicamente (apontar, mostrar, respirar)
est_acao = ParagraphStyle("Acao", fontName="Helvetica-Bold", fontSize=12,
    textColor=LARANJA, alignment=TA_LEFT, spaceBefore=6, spaceAfter=4, leading=16)

# Fala: o que voce vai dizer (verbatim)
est_fala = ParagraphStyle("Fala", fontName="Helvetica", fontSize=14,
    textColor=colors.black, alignment=TA_LEFT, spaceAfter=8, leading=20,
    leftIndent=18)

# Dica
est_dica = ParagraphStyle("Dica", fontName="Helvetica-Oblique", fontSize=11,
    textColor=VERDE, alignment=TA_LEFT, spaceBefore=4, spaceAfter=4, leading=14,
    leftIndent=18)

# Aviso (cuidados)
est_aviso = ParagraphStyle("Aviso", fontName="Helvetica-Bold", fontSize=11,
    textColor=ALERTA, alignment=TA_LEFT, spaceBefore=4, leading=14,
    leftIndent=18)

est_body = ParagraphStyle("body", fontName="Helvetica", fontSize=11.5,
    textColor=colors.black, alignment=TA_JUSTIFY, spaceAfter=6, leading=15)


def caixa(texto, cor_fundo=CINZA_CL, cor_borda=NAVY, padding=10):
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


def slide(numero, titulo, tempo, blocos):
    """
    Monta um slide. blocos = lista de tuplas (tipo, texto):
      tipo = 'acao' | 'fala' | 'dica' | 'aviso'
    """
    out = []
    # Cabecalho do slide
    out.append(Paragraph(f"SLIDE {numero}", est_slide_num))
    out.append(Paragraph(titulo, est_slide_titulo))
    out.append(Paragraph(f"⏱ Tempo: {tempo}", est_tempo))
    out.append(HRFlowable(width="100%", thickness=1.5, color=OURO))
    out.append(Spacer(1, 8))
    for tipo, txt in blocos:
        if tipo == 'acao':
            out.append(Paragraph(f"👉 {txt}", est_acao))
        elif tipo == 'fala':
            out.append(Paragraph(f"<b>VOCÊ DIZ:</b> &nbsp;&nbsp;<i>“{txt}”</i>", est_fala))
        elif tipo == 'dica':
            out.append(Paragraph(f"✓ {txt}", est_dica))
        elif tipo == 'aviso':
            out.append(Paragraph(f"⚠ {txt}", est_aviso))
    return KeepTogether(out) if len(blocos) <= 3 else out


def cabecalho_rodape(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica-Oblique", 9)
    canvas.setFillColor(CINZA)
    if doc.page > 1:
        canvas.drawString(2*cm, 28.3*cm, "Guia de Apresentação — Defesa TCC Kanban IA")
        canvas.drawRightString(19*cm, 28.3*cm, f"Página {doc.page}")
        canvas.setStrokeColor(NAVY)
        canvas.line(2*cm, 28.15*cm, 19*cm, 28.15*cm)
    canvas.restoreState()


def construir():
    doc = SimpleDocTemplate(OUT_PROJ, pagesize=A4,
                             leftMargin=2*cm, rightMargin=2*cm,
                             topMargin=2.3*cm, bottomMargin=1.8*cm,
                             title="TCC - Guia de Apresentacao", author="Vinicius Vilela Rufini")
    f = []

    # ===== CAPA =====
    f.append(Spacer(1, 3*cm))
    f.append(Paragraph("GUIA DE APRESENTAÇÃO", est_capa_h))
    f.append(Spacer(1, 0.4*cm))
    f.append(HRFlowable(width="55%", thickness=2, color=OURO, hAlign="CENTER"))
    f.append(Spacer(1, 0.8*cm))
    f.append(Paragraph("Para ler durante a defesa,<br/>apontando os 18 slides", est_capa_sub))
    f.append(Spacer(1, 1*cm))
    f.append(caixa(
        "<b>Como usar este guia:</b><br/><br/>"
        "• Imprima as próximas páginas em <b>folha A4 frente única</b>.<br/>"
        "• A cada slide há 3 tipos de instrução:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;👉 <font color='#d35400'><b>Laranja</b></font> = ação física (apontar, mostrar, respirar).<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<b>VOCÊ DIZ</b> = fala em voz alta, palavra por palavra.<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;✓ <font color='#2e8b57'>Verde</font> = dica de entonação ou nuance.<br/><br/>"
        "<b>Use o avanço de slide como “marcador”:</b> só vire a folha quando trocar de slide.<br/><br/>"
        "<b>Cronômetro mental:</b> aos 9 minutos você deve estar no Slide 9. Se estiver no 7, "
        "acelere; se estiver no 11, respire e segure.",
        cor_fundo=CREME, cor_borda=OURO, padding=14))
    f.append(Spacer(1, 1.5*cm))
    f.append(caixa(
        "<b>3 regras de ouro:</b><br/>"
        "1. Não leia os slides. <b>Fale SOBRE eles.</b><br/>"
        "2. Olhe para os 3 examinadores em rotação — não só para o orientador.<br/>"
        "3. Se travar: pause, beba água, respire e siga. Travada não é fim.",
        cor_fundo=CINZA_CL, cor_borda=NAVY, padding=14))
    f.append(PageBreak())

    # ===== SLIDE 1 — CAPA =====
    f.extend([
        Paragraph("SLIDE 1", est_slide_num),
        Paragraph("Capa", est_slide_titulo),
        Paragraph("⏱ Tempo: 20 segundos", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Suba ao palco, cumprimente a banca com a cabeça.", est_acao),
        Paragraph("👉 Respire fundo uma vez antes de falar.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Boa tarde, professores. Meu nome é Vinicius Vilela Rufini. Vou apresentar o Mecanismo Kanban IA — uma evolução semântica do Kanban tradicional, validada estatisticamente.”</i>", est_fala),
        Paragraph("✓ Não leia o título inteiro do slide. Diga a frase acima e avance.", est_dica),
        Paragraph("⚠ Não comece com “Boa tarde a todos”. Olhe para os examinadores e diga “Boa tarde, professores”. Mais profissional.", est_aviso),
    ])
    f.append(PageBreak())

    # ===== SLIDE 2 — AGENDA =====
    f.extend([
        Paragraph("SLIDE 2", est_slide_num),
        Paragraph("Agenda — Roteiro de 18 minutos", est_slide_titulo),
        Paragraph("⏱ Tempo: 30 segundos", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Não leia os 7 itens. Mostre rapidamente com a mão.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“A apresentação tem 7 partes: vou começar pelo problema, depois apresentar a hipótese, a arquitetura, a segurança via Row Level Security, a metodologia de simulação, os resultados estatísticos e, por fim, as conclusões e trabalhos futuros.”</i>", est_fala),
        Paragraph("✓ Fale rápido aqui — a banca quer ouvir o conteúdo, não o índice.", est_dica),
    ])
    f.append(PageBreak())

    # ===== SLIDE 3 — PROBLEMA =====
    f.extend([
        Paragraph("SLIDE 3", est_slide_num),
        Paragraph("O Problema — Gargalo Cognitivo", est_slide_titulo),
        Paragraph("⏱ Tempo: 1 minuto", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Aponte para o card grande à esquerda (GARGALO COGNITIVO).", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Centrais de Serviços, operações logísticas, suporte técnico — todas essas operações multiturno convivem com um problema invisível: o tempo que o operador gasta procurando informação. Não é o tempo de execução da tarefa — é o tempo entre receber o cartão e saber o que fazer com ele.”</i>", est_fala),
        Spacer(1, 4),
        Paragraph("👉 Agora aponte para o card grande à direita: <b>15% a 30%</b>.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“E isso não é palpite meu. Feldman e Sherman, em um relatório clássico da IDC de 2004, mediram que profissionais do conhecimento gastam entre 15% e 30% da jornada apenas procurando informação. É um dado consolidado, e foi a âncora metodológica deste trabalho.”</i>", est_fala),
        Paragraph("✓ Fale o nome “Feldman e Sherman” com clareza. Mostra rigor.", est_dica),
        Paragraph("✓ Se quiser dar peso, faça uma pausa de 1 segundo depois de “15% a 30%”.", est_dica),
    ])
    f.append(PageBreak())

    # ===== SLIDE 4 — HIPOTESE =====
    f.extend([
        Paragraph("SLIDE 4", est_slide_num),
        Paragraph("Hipótese Central — Kanban passivo → Semântico", est_slide_titulo),
        Paragraph("⏱ Tempo: 1 minuto", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Aponte para o card vermelho à esquerda (Kanban Tradicional).", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“À esquerda, o Kanban tradicional como conhecemos: o cartão informa o estado da tarefa, mas é passivo. Para resolver, o operador sai da tela, abre wiki, procura POP, talvez chame o supervisor. Tudo isso é tempo de espera invisível.”</i>", est_fala),
        Spacer(1, 4),
        Paragraph("👉 Agora aponte para o card verde à direita (Kanban IA).", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“À direita, a proposta deste trabalho: o cartão deixa de ser passivo e vira um agente contextual. Ele injeta — na própria interface, em menos de 1 segundo e meio — o checklist de resolução, gerado por IA e filtrado pelas TAGS autorizadas para aquela empresa.”</i>", est_fala),
        Paragraph("✓ Marque a transição com a entonação: “passivo” (devagar) → “ativo” (forte).", est_dica),
    ])
    f.append(PageBreak())

    # ===== SLIDE 5 — ARQUITETURA =====
    f.extend([
        Paragraph("SLIDE 5", est_slide_num),
        Paragraph("Arquitetura e Pilha Tecnológica", est_slide_titulo),
        Paragraph("⏱ Tempo: 2 minutos", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Aponte para as 5 camadas, de cima para baixo, rapidamente.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“A arquitetura é uma SPA com BaaS e LLM. No frontend, React 18 com Vite e CSS puro, para liberdade total de design. Na infraestrutura, Vercel Edge Network distribuindo globalmente. No backend, Supabase entregando PostgreSQL gerenciado, autenticação e API REST automática. A segurança, no banco, via Row Level Security. E a camada cognitiva é o Google Gemini.”</i>", est_fala),
        Spacer(1, 4),
        Paragraph("👉 Agora aponte para o painel lateral “Diferenciais Técnicos”.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Os números à direita resumem por que essa escolha arquitetural funciona: 1,5 segundo de latência média da IA, 87,5% menos tokens enviados ao LLM, 100% de isolamento multilocatário garantido pelo banco, e zero código extra de filtragem na aplicação.”</i>", est_fala),
        Paragraph("✓ Mencione “zero código extra” com tom forte — é argumento de venda.", est_dica),
    ])
    f.append(PageBreak())

    # ===== SLIDE 6 — UML CASOS DE USO =====
    f.extend([
        Paragraph("SLIDE 6", est_slide_num),
        Paragraph("UML — Casos de Uso", est_slide_titulo),
        Paragraph("⏱ Tempo: 1 minuto", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Aponte para os 3 atores no canto esquerdo.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Três atores principais. O Operador Logístico ou de Suporte movimenta cartões e solicita o apoio da IA. O Gestor Operacional cadastra os POPs e regras corporativas — ele é o curador da knowledge_base. E o Cliente B2B alimenta o backlog pelo portal externo.”</i>", est_fala),
        Paragraph("✓ Use “curador” quando falar do Gestor — é vocabulário acadêmico que pega bem.", est_dica),
    ])
    f.append(PageBreak())

    # ===== SLIDE 7 — UML SEQUENCIA =====
    f.extend([
        Paragraph("SLIDE 7", est_slide_num),
        Paragraph("UML — Diagrama de Sequência", est_slide_titulo),
        Paragraph("⏱ Tempo: 1 minuto e 30 segundos", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Aponte para a primeira seta (Operador → Frontend) e siga.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Aqui está a cronologia exata do mecanismo. O operador clica no botão de apoio. O frontend envia metadados do cartão com o JWT de autenticação. O backend Supabase consulta a knowledge_base — e é aqui que entra o RLS.”</i>", est_fala),
        Spacer(1, 4),
        Paragraph("👉 Aponte para a nota amarela do RLS.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Esta nota mostra o ponto-chave: o PostgreSQL filtra automaticamente as linhas, garantindo que apenas POPs da empresa do usuário sejam retornados. Esse é o blindagem multilocatário no nível do banco.”</i>", est_fala),
        Spacer(1, 4),
        Paragraph("👉 Aponte para a seta de retorno do LLM ao operador.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“O backend monta um prompt enxuto, envia ao Gemini, recebe a prescrição determinística e o frontend renderiza o checklist diretamente no cartão. Tudo isso em menos de 1 segundo e meio.”</i>", est_fala),
    ])
    f.append(PageBreak())

    # ===== SLIDE 8 — RLS SQL =====
    f.extend([
        Paragraph("SLIDE 8", est_slide_num),
        Paragraph("Segurança — Row Level Security (código real)", est_slide_titulo),
        Paragraph("⏱ Tempo: 2 minutos", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Aponte para o código SQL na caixa escura à esquerda.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Este código não é exemplo didático. É o trecho real do arquivo security_hardening.sql que está em produção no meu sistema. Ele faz três coisas: ativa o RLS na tabela knowledge_base; cria uma política chamada Knowledge base company isolation; e — o ponto-chave — filtra por uma expressão que lê o e-mail do JWT do usuário autenticado e cruza com a tabela profiles para resolver o company_id.”</i>", est_fala),
        Spacer(1, 4),
        Paragraph("👉 Aponte para a frase “FOR ALL” no código.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“O FOR ALL cobre SELECT, INSERT, UPDATE e DELETE simultaneamente. Não existe operação no banco que escape dessa política.”</i>", est_fala),
        Spacer(1, 4),
        Paragraph("👉 Aponte para o painel “GARANTIAS” à direita.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“E o que isso garante? Quatro coisas. Aplicação automática antes do WHERE explícito. Cobertura de todas as operações. Impossibilidade de romper o isolamento por falha lógica na aplicação. E zero impacto na ergonomia do código — o desenvolvedor escreve SQL normal, e o banco filtra sozinho.”</i>", est_fala),
        Paragraph("✓ Este é o slide mais técnico. Fale com calma e firmeza — banca de Ciência da Computação ama isso.", est_dica),
    ])
    f.append(PageBreak())

    # ===== SLIDE 9 — METODOLOGIA =====
    f.extend([
        Paragraph("SLIDE 9", est_slide_num),
        Paragraph("Metodologia — Simulação DES + Monte Carlo", est_slide_titulo),
        Paragraph("⏱ Tempo: 1 minuto e 30 segundos", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Aponte para os 3 cards horizontais (Modelagem → Calibração → Inferência).", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“A validação seguiu três etapas. Primeira: modelagem por Simulação de Eventos Discretos, conforme Banks et al. de 2010. Segunda: calibração ancorada nos 15-30% de Feldman e Sherman, então os parâmetros não são chute meu. Terceira: inferência com 30 réplicas Monte Carlo e teste t pareado bilateral, com α igual a 0,001.”</i>", est_fala),
        Spacer(1, 4),
        Paragraph("👉 Aponte para o número grande embaixo: <b>3.000</b>.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“No total foram três mil execuções simuladas: 30 réplicas vezes 100 cartões cada. Tudo com seed fixada em 42, portanto totalmente reprodutível por qualquer um da banca.”</i>", est_fala),
    ])
    f.append(PageBreak())

    # ===== SLIDE 10 — DEMO NODE =====
    f.extend([
        Paragraph("SLIDE 10", est_slide_num),
        Paragraph("Demonstração 1 — Simulador Node.js", est_slide_titulo),
        Paragraph("⏱ Tempo: 1 minuto e 30 segundos", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 OPÇÃO A: se conseguir mostrar terminal ao vivo, rode <b>node simulador_performance_tcc.js</b>.", est_acao),
        Paragraph("👉 OPÇÃO B (segura): aponte para o screenshot do terminal no slide.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Aqui está o simulador de eventos discretos rodando. Ele processou 100 cartões aleatórios em cada um dos dois sistemas. Os resultados aparecem nessa tabela do console.”</i>", est_fala),
        Spacer(1, 4),
        Paragraph("👉 Aponte para a linha do Cycle Time na tabela do terminal.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Vejam o Cycle Time: 171 minutos no Kanban tradicional, 94 minutos no Kanban IA. Uma redução de 45% — só nessa execução isolada.”</i>", est_fala),
        Paragraph("✓ Se rodar ao vivo: avise antes — “vou rodar o simulador ao vivo, um momento”. Banca aprecia transparência.", est_dica),
        Paragraph("⚠ Se a internet falhar ou der erro: pule direto para o screenshot. Não tente debugar na frente da banca.", est_aviso),
    ])
    f.append(PageBreak())

    # ===== SLIDE 11 — DEMO PYTHON =====
    f.extend([
        Paragraph("SLIDE 11", est_slide_num),
        Paragraph("Demonstração 2 — Monte Carlo em Python", est_slide_titulo),
        Paragraph("⏱ Tempo: 1 minuto e 30 segundos", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Aponte para o output do terminal Python.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Aqui está o script Monte Carlo em Python rodando — ele repete 30 vezes o experimento e aplica o teste t pareado bilateral em cada métrica.”</i>", est_fala),
        Spacer(1, 4),
        Paragraph("👉 Aponte para a coluna “t-stat” no output.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Repare na coluna da direita: as estatísticas t variam de 39 a 114, dependendo da métrica. O valor crítico para rejeitar a hipótese nula com 99,9% de confiança é 3,659. Estou muito, muito acima disso. O p-valor é menor que 1 em 1.000 em todas as métricas.”</i>", est_fala),
        Paragraph("✓ A frase “muito muito acima” pode ser dita com ênfase. É o seu argumento estatístico mais forte.", est_dica),
    ])
    f.append(PageBreak())

    # ===== SLIDE 12 — TABELA =====
    f.extend([
        Paragraph("SLIDE 12", est_slide_num),
        Paragraph("Resultados — Números-chave", est_slide_titulo),
        Paragraph("⏱ Tempo: 1 minuto e 30 segundos", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Aponte para cada linha da tabela conforme menciona.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Vou percorrer rapidamente as cinco métricas. Wait Time: cai de 47,5 para 3,5 minutos. Touch Time: de 123 para 91. Cycle Time, que é a métrica principal: de 170,6 para 94,5, uma redução de 44,6%. Quebra de SLA: de 28,3% para zero. E First Contact Resolution: de 53,4% para 95,3%.”</i>", est_fala),
        Spacer(1, 4),
        Paragraph("👉 Aponte para a faixa verde inferior.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Todos os valores de t na última coluna estão acima de 3,659, o que implica p menor que 0,001 — rejeição forte da hipótese nula em todas as métricas.”</i>", est_fala),
    ])
    f.append(PageBreak())

    # ===== SLIDE 13 — CYCLE TIME =====
    f.extend([
        Paragraph("SLIDE 13", est_slide_num),
        Paragraph("Resultados — Cycle Time (gráfico)", est_slide_titulo),
        Paragraph("⏱ Tempo: 1 minuto", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Aponte para as duas barras do gráfico.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Aqui está o Cycle Time isolado. 170 minutos contra 94 minutos. E reparem nas barras de erro — elas representam o intervalo de confiança de 95%. Mesmo no pior caso do Kanban IA, ele está bem abaixo do melhor caso do Kanban tradicional.”</i>", est_fala),
        Spacer(1, 4),
        Paragraph("👉 Aponte para o card lateral com o número grande <b>−44,6%</b>.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“É o destaque deste trabalho: redução de quase 45% no tempo de ciclo, com t de 114,7 e p menor que 0,001.”</i>", est_fala),
    ])
    f.append(PageBreak())

    # ===== SLIDE 14 — BOXPLOT =====
    f.extend([
        Paragraph("SLIDE 14", est_slide_num),
        Paragraph("Estabilidade entre Réplicas — Boxplot", est_slide_titulo),
        Paragraph("⏱ Tempo: 1 minuto", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Aponte para as duas caixas do boxplot.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Este boxplot mostra a distribuição dos 30 valores de Cycle Time, um por réplica. À esquerda, Kanban Tradicional. À direita, Kanban IA. Reparem que as duas caixas não se sobrepõem em nenhum ponto.”</i>", est_fala),
        Spacer(1, 4),
        Paragraph("👉 Aponte para o painel lateral com o texto.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Isso significa que mesmo a réplica mais lenta do Kanban IA foi mais rápida que a réplica mais rápida do Kanban tradicional. Não é sorte estatística — é diferença estrutural.”</i>", est_fala),
        Paragraph("✓ Esta é uma das frases mais fortes da apresentação. Fale devagar e segure o olhar da banca.", est_dica),
    ])
    f.append(PageBreak())

    # ===== SLIDE 15 — SLA + FCR =====
    f.extend([
        Paragraph("SLIDE 15", est_slide_num),
        Paragraph("SLA e First Contact Resolution", est_slide_titulo),
        Paragraph("⏱ Tempo: 1 minuto", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Aponte para os gráficos de pizza do SLA à esquerda.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Quebra de SLA: 28,3% no tradicional, zero no Kanban IA. Para uma empresa B2B que tem multas contratuais por quebra de SLA, esse é o número que aparece direto na conta do mês.”</i>", est_fala),
        Spacer(1, 4),
        Paragraph("👉 Aponte para o gráfico do FCR à direita.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“E o FCR vai de 53,4% para 95,3% — ganho de quase 42 pontos percentuais. Isso significa que muito mais chamados são resolvidos sem escalonamento, sem precisar acionar especialistas seniores.”</i>", est_fala),
    ])
    f.append(PageBreak())

    # ===== SLIDE 16 — TOKENS / ROI =====
    f.extend([
        Paragraph("SLIDE 16", est_slide_num),
        Paragraph("Eficiência Computacional e ROI", est_slide_titulo),
        Paragraph("⏱ Tempo: 1 minuto", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Aponte para o gráfico de tokens à esquerda.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Aqui está o argumento financeiro do trabalho. Um RAG genérico enviaria em média 12.000 tokens por requisição. O Kanban IA, com filtragem por TAGS, envia 1.500 tokens. Uma redução de 87,5% no custo por interação com o LLM.”</i>", est_fala),
        Spacer(1, 4),
        Paragraph("👉 Aponte para o card lateral com <b>R$ 1,5 mi</b>.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Aplicando isso ao tempo economizado, a projeção é de aproximadamente um milhão e meio de reais ao ano em economia direta de força de trabalho, para uma operação de mil chamados mensais. É uma estimativa de cenário — quero deixar claro que não é ROI auditado.”</i>", est_fala),
        Paragraph("✓ Diga “estimativa de cenário” com clareza. Mostra honestidade metodológica e blinda a crítica.", est_dica),
    ])
    f.append(PageBreak())

    # ===== SLIDE 17 — CONCLUSOES =====
    f.extend([
        Paragraph("SLIDE 17", est_slide_num),
        Paragraph("Conclusões e Trabalhos Futuros", est_slide_titulo),
        Paragraph("⏱ Tempo: 1 minuto", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Aponte para a lista verde à esquerda (Entregue).", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“À esquerda, o que foi entregue: arquitetura formal em UML, implementação real em React, Supabase e Gemini, políticas RLS em produção, simulador autoral em Node.js, replicação Monte Carlo em Python, teste t pareado com p menor que 0,001, e a redução de 44,6% comprovada estatisticamente.”</i>", est_fala),
        Spacer(1, 4),
        Paragraph("👉 Aponte para a lista dourada à direita (Próximos Passos).", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“À direita, os trabalhos futuros: estudo de caso em operação real, troca da distribuição uniforme por lognormal, agentes de voz para operadores de campo, aprendizado por reforço para sugestão de POPs, e framework de testes adversariais de prompt injection.”</i>", est_fala),
    ])
    f.append(PageBreak())

    # ===== SLIDE 18 — OBRIGADO =====
    f.extend([
        Paragraph("SLIDE 18", est_slide_num),
        Paragraph("Encerramento — Obrigado", est_slide_titulo),
        Paragraph("⏱ Tempo: 15 segundos", est_tempo),
        HRFlowable(width="100%", thickness=1.5, color=OURO),
        Spacer(1, 8),
        Paragraph("👉 Faça uma pausa. Olhe para os 3 examinadores.", est_acao),
        Paragraph("👉 Sorria de forma contida.", est_acao),
        Paragraph("<b>VOCÊ DIZ:</b> &nbsp;<i>“Obrigado pela atenção, professores. Estou à disposição para perguntas, observações e contribuições da banca.”</i>", est_fala),
        Paragraph("✓ Não diga “espero que tenham gostado” nem “foi isso”. Termine forte e em silêncio.", est_dica),
        Paragraph("⚠ Aguarde a banca falar. Não se mova até o orientador dar a palavra.", est_aviso),
    ])
    f.append(PageBreak())

    # ===== APENDICE: CRONOMETRO =====
    f.append(Paragraph("Cronômetro mental", est_slide_titulo))
    f.append(HRFlowable(width="100%", thickness=1.5, color=OURO))
    f.append(Spacer(1, 10))
    tab = Table(
        [["Slide", "Tempo acumulado", "Conteúdo"]] +
        [
            ["1", "0:00–0:20", "Capa"],
            ["2", "0:20–0:50", "Agenda"],
            ["3", "0:50–1:50", "Problema"],
            ["4", "1:50–2:50", "Hipótese"],
            ["5", "2:50–4:50", "Arquitetura"],
            ["6", "4:50–5:50", "UML Casos de Uso"],
            ["7", "5:50–7:20", "UML Sequência"],
            ["8", "7:20–9:20", "RLS SQL"],
            ["9", "9:20–10:50", "Metodologia"],
            ["10", "10:50–12:20", "Demo Node"],
            ["11", "12:20–13:50", "Demo Python"],
            ["12", "13:50–15:20", "Tabela"],
            ["13", "15:20–16:20", "Cycle Time"],
            ["14", "16:20–17:20", "Boxplot"],
            ["15", "17:20–18:20", "SLA/FCR"],
            ["16", "18:20–19:20", "Tokens/ROI"],
            ["17", "19:20–20:20", "Conclusões"],
            ["18", "20:20–20:35", "Obrigado"],
        ],
        colWidths=[1.5*cm, 4*cm, 10.5*cm])
    tab.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONT", (0,0), (-1,0), "Helvetica-Bold", 11),
        ("FONT", (0,1), (-1,-1), "Helvetica", 11),
        ("ALIGN", (0,0), (1,-1), "CENTER"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("GRID", (0,0), (-1,-1), 0.5, CINZA),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ]))
    f.append(tab)
    f.append(Spacer(1, 16))
    f.append(caixa(
        "<b>Se atrasar:</b> corte o Slide 10 (demo Node) — vá direto ao Slide 11 (Python) que já mostra os números.<br/>"
        "<b>Se adiantar:</b> aprofunde o Slide 8 (RLS) ou o Slide 14 (boxplot) — são os mais técnicos e dão sustentação.<br/>"
        "<b>Margem de segurança:</b> total previsto é ~20 min. Você tem alguns minutos de folga.<br/><br/>"
        "<b>Você foi entrevistado, simulou, escreveu, validou. A banca não está lá para te derrubar — está para confirmar o que você já sabe.</b>",
        cor_fundo=CREME, cor_borda=OURO, padding=14))

    doc.build(f, onFirstPage=cabecalho_rodape, onLaterPages=cabecalho_rodape)
    print(f"OK -> {OUT_PROJ}")
    import shutil
    shutil.copy(OUT_PROJ, OUT_DOWN)
    print(f"OK -> {OUT_DOWN}")
    print(f"Tamanho: {os.path.getsize(OUT_PROJ)/1024:.1f} KB")


if __name__ == "__main__":
    construir()
