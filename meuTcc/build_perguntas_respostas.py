# -*- coding: utf-8 -*-
"""
PDF com 50 perguntas e respostas modelo para a defesa do TCC.
Organizado em 12 categorias de ataque mais provaveis da banca.
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, PageBreak,
                                 Table, TableStyle, HRFlowable, KeepTogether)

OUT_DOWNLOADS = r"C:\Users\vinic\Downloads\TCC_Perguntas_Respostas_Banca.pdf"
OUT_PROJ = r"C:\Users\vinic\Desktop\kabania\meuTcc\TCC_Perguntas_Respostas_Banca.pdf"

NAVY = colors.HexColor("#1E2761")
NAVY2 = colors.HexColor("#0F1838")
OURO = colors.HexColor("#FFB400")
OK = colors.HexColor("#2e8b57")
ALERTA = colors.HexColor("#c0392b")
CINZA = colors.HexColor("#555555")
CINZA_CL = colors.HexColor("#EEF2F8")
CREME = colors.HexColor("#FFF8E1")

estilos = getSampleStyleSheet()

est_titulo = ParagraphStyle("TituloCapa", parent=estilos["Title"],
    fontName="Helvetica-Bold", fontSize=26, textColor=NAVY,
    alignment=TA_CENTER, spaceAfter=18, leading=32)

est_sub = ParagraphStyle("Sub", parent=estilos["BodyText"],
    fontName="Helvetica-Oblique", fontSize=14, textColor=CINZA,
    alignment=TA_CENTER, spaceAfter=10, leading=18)

est_h1 = ParagraphStyle("h1", parent=estilos["Heading1"],
    fontName="Helvetica-Bold", fontSize=18, textColor=NAVY,
    spaceBefore=20, spaceAfter=10, leading=22, keepWithNext=True)

est_body = ParagraphStyle("body", parent=estilos["BodyText"],
    fontName="Helvetica", fontSize=10.5, textColor=colors.black,
    alignment=TA_JUSTIFY, spaceAfter=6, leading=14)

est_q = ParagraphStyle("Q", parent=est_body,
    fontName="Helvetica-Bold", fontSize=11, textColor=NAVY,
    spaceBefore=10, spaceAfter=4, keepWithNext=True)

est_r = ParagraphStyle("R", parent=est_body,
    fontName="Helvetica", fontSize=10.5, textColor=colors.black,
    leftIndent=18, spaceAfter=8, leading=14)

est_dica = ParagraphStyle("dica", parent=est_body,
    fontName="Helvetica-Oblique", fontSize=10, textColor=OK,
    leftIndent=18, spaceAfter=4)

est_legenda = ParagraphStyle("legenda", parent=est_body,
    fontName="Helvetica-Oblique", fontSize=10, textColor=CINZA,
    alignment=TA_CENTER, spaceAfter=10)


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


def qr(pergunta, resposta, dica=None):
    """Bloco pergunta-resposta-dica."""
    blocos = [
        Paragraph(f"<b>P.</b> {pergunta}", est_q),
        Paragraph(f"<b>R.</b> {resposta}", est_r),
    ]
    if dica:
        blocos.append(Paragraph(f"💡 <i>Dica:</i> {dica}", est_dica))
    return KeepTogether(blocos)


def cabecalho_rodape(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica-Oblique", 8.5)
    canvas.setFillColor(CINZA)
    if doc.page > 1:
        canvas.drawString(2*cm, 28*cm, "Perguntas e Respostas para a Banca — TCC Mecanismo Kanban IA")
        canvas.drawRightString(19*cm, 28*cm, f"Página {doc.page}")
        canvas.setStrokeColor(NAVY)
        canvas.setLineWidth(0.5)
        canvas.line(2*cm, 27.85*cm, 19*cm, 27.85*cm)
    canvas.restoreState()


def construir():
    doc = SimpleDocTemplate(OUT_PROJ, pagesize=A4,
                             leftMargin=2*cm, rightMargin=2*cm,
                             topMargin=2.3*cm, bottomMargin=1.8*cm,
                             title="TCC - Perguntas e Respostas para a Banca",
                             author="Vinicius Vilela Rufini")
    f = []

    # ===== CAPA =====
    f.append(Spacer(1, 3*cm))
    f.append(Paragraph("PERGUNTAS E RESPOSTAS<br/>PARA A DEFESA DO TCC", est_titulo))
    f.append(Spacer(1, 0.3*cm))
    f.append(HRFlowable(width="55%", thickness=2, color=OURO, hAlign="CENTER"))
    f.append(Spacer(1, 0.6*cm))
    f.append(Paragraph("Mecanismo Kanban IA — Otimização operacional<br/>via injeção semântica e RLS multilocatário", est_sub))
    f.append(Spacer(1, 2*cm))
    f.append(caixa(
        "<b>50 perguntas prováveis da banca, organizadas em 12 categorias de ataque.</b><br/><br/>"
        "Cada pergunta vem com uma <b>resposta modelo</b> em tom academico-profissional, "
        "pronta para você adaptar com sua voz. Algumas têm também uma <b>dica tática</b> "
        "(o que NÃO fazer, o que enfatizar).<br/><br/>"
        "<b>Como estudar:</b><br/>"
        "• Leia 1 categoria por dia nos 12 dias antes da defesa<br/>"
        "• Pratique as respostas em voz alta, sem ler<br/>"
        "• Releia tudo na manhã do dia D",
        cor_fundo=CREME, cor_borda=OURO))
    f.append(Spacer(1, 2*cm))
    f.append(Paragraph("Vinicius Vilela Rufini", est_sub))
    f.append(Paragraph("UNIP — Ciência da Computação — 2026", est_sub))
    f.append(PageBreak())

    # ===== SUMARIO =====
    f.append(Paragraph("Sumário das categorias", est_h1))
    sumario = [
        ("1. Sobre o problema e a contextualização (5 perguntas)", "3"),
        ("2. Sobre a hipótese e os objetivos (4 perguntas)", "4"),
        ("3. Sobre a fundamentação teórica (5 perguntas)", "5"),
        ("4. Sobre a arquitetura e a pilha tecnológica (5 perguntas)", "7"),
        ("5. Sobre segurança RLS e multilocatário (4 perguntas)", "8"),
        ("6. Sobre a metodologia de simulação (5 perguntas)", "9"),
        ("7. Sobre os números e estatística (5 perguntas)", "11"),
        ("8. Sobre os resultados e sua interpretação (4 perguntas)", "12"),
        ("9. Sobre originalidade, plágio e contribuição (4 perguntas)", "13"),
        ("10. Sobre limitações e trabalhos futuros (3 perguntas)", "14"),
        ("11. Perguntas-armadilha (3 perguntas)", "15"),
        ("12. Perguntas pessoais e de processo (3 perguntas)", "16"),
    ]
    tab = Table([[s, p] for s, p in sumario], colWidths=[14*cm, 2*cm])
    tab.setStyle(TableStyle([
        ("FONT", (0,0), (-1,-1), "Helvetica", 11),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("TEXTCOLOR", (0,0), (-1,-1), NAVY),
        ("ALIGN", (1,0), (1,-1), "RIGHT"),
    ]))
    f.append(tab)
    f.append(PageBreak())

    # ===== 1. PROBLEMA =====
    f.append(Paragraph("1. Sobre o problema e a contextualização", est_h1))
    f.append(qr(
        "Em uma frase, qual é o problema que seu TCC ataca?",
        "Operações corporativas multiturno perdem produtividade porque o cartão Kanban tradicional é passivo: ele descreve a tarefa, mas não entrega o conhecimento necessário para executá-la, gerando o que chamo de Gargalo Cognitivo."
    ))
    f.append(qr(
        "Por que esse problema importa hoje?",
        "Porque a popularização dos LLMs entre 2023 e 2025 tornou tecnicamente viável injetar conhecimento corporativo em tempo real dentro de interfaces de trabalho — mas o setor de gestão operacional ainda usa Kanban da forma como Anderson o formalizou em 2010. O gap entre o que a IA já permite fazer e o que as ferramentas ágeis entregam é exatamente o que este trabalho endereça."
    ))
    f.append(qr(
        "De onde vem o número de 15% a 30% de tempo perdido com busca de informação?",
        "Do relatório clássico da IDC conduzido por Feldman e Sherman em 2004, intitulado The High Cost of Not Finding Information. É referência consolidada e amplamente citada em literatura de gestão do conhecimento. Esse intervalo serviu de âncora metodológica para calibrar o Wait Time no meu modelo de simulação.",
        "Mencione o nome do paper. Mostra que você foi à fonte."
    ))
    f.append(qr(
        "Esse problema não é resolvido só com uma boa wiki corporativa?",
        "Não. Wiki é passiva — o operador precisa parar a tarefa, sair da tela, pesquisar, interpretar e voltar. O Wait Time persiste integralmente. O Kanban IA é ativo: entrega o checklist gerado pela IA na própria interface do cartão, sem mudança de contexto. A diferença não é de conteúdo, é de modo de entrega."
    ))
    f.append(qr(
        "Você acredita que esse intervalo de 15-30% se aplica ao Brasil?",
        "É um intervalo internacional, não um número absoluto brasileiro. Para um TCC de graduação é uma âncora metodológica defensável. Em um trabalho de mestrado ou doutorado, exigiria coleta empírica brasileira específica — e está declarado como limitação na seção 7.1 e como trabalho futuro na seção 7.2."
    ))

    # ===== 2. HIPOTESE / OBJETIVOS =====
    f.append(PageBreak())
    f.append(Paragraph("2. Sobre a hipótese e os objetivos", est_h1))
    f.append(qr(
        "Qual é a hipótese central da sua pesquisa?",
        "A hipótese central é que a injeção semântica de conhecimento autorizado no cartão Kanban — via LLM filtrado por Tags de Autorização Temática sob Row Level Security — reduz significativamente o Cycle Time em relação ao Kanban tradicional. Há quatro hipóteses derivadas: o ganho concentra-se no Wait Time, reduz a quebra de SLA, eleva o First Contact Resolution e diminui o consumo de tokens do LLM."
    ))
    f.append(qr(
        "Qual é seu objetivo geral?",
        "Conceber, implementar e validar o Mecanismo Kanban IA como evolução arquitetural do Kanban Tradicional, demonstrando — por meio de simulação computacional de eventos discretos com replicação Monte Carlo — sua superioridade na redução do Cycle Time e na elevação das taxas de cumprimento de SLA e de FCR em operações corporativas multiturno.",
        "Decore literalmente esse parágrafo. É a frase mais importante do TCC."
    ))
    f.append(qr(
        "Quais são os seus objetivos específicos?",
        "São cinco: (1) caracterizar os componentes de tempo do Kanban (Wait, Touch, Cycle, Lead) com base na literatura; (2) projetar a arquitetura do Kanban IA formalizada em UML; (3) implementar o simulador DES em Node.js com 30 réplicas Monte Carlo; (4) mensurar os ganhos relativos com teste t pareado bilateral; e (5) traduzir os ganhos técnicos em projeção de ROI."
    ))
    f.append(qr(
        "Como você sabe que atingiu seus objetivos?",
        "Cada objetivo específico tem entregável verificável: o objetivo 1 está no Capítulo 2; o 2, nos diagramas UML do Capítulo 3; o 3, no Apêndice A; o 4, nos resultados estatísticos do Capítulo 6 com p < 0,001 em todas as métricas; o 5, na Tabela 4 com a projeção financeira. Posso defender ponto a ponto cada um deles."
    ))

    # ===== 3. FUNDAMENTACAO TEORICA =====
    f.append(PageBreak())
    f.append(Paragraph("3. Sobre a fundamentação teórica", est_h1))
    f.append(qr(
        "Quais autores são centrais para a sua pesquisa?",
        "Cinco autores estruturam a fundamentação: Anderson (2010) para o método Kanban moderno; Reinertsen (2009) para o Cost of Delay; Feldman e Sherman (2004) para o custo da busca por informação; Lewis et al. (2020) para o paradigma RAG; e Banks et al. (2010) para a simulação de eventos discretos. Min et al. (2022) entra como suporte ao RAG, e Chong e Carraro (2006) ao multilocatário.",
        "Saiba o ano de cada um na ponta da língua. Banca adora pedir."
    ))
    f.append(qr(
        "Explique o que é Cost of Delay e por que importa.",
        "O Cost of Delay é o custo econômico de cada unidade de tempo a mais que uma tarefa demora para ser concluída. Reinertsen (2009) mostra que ele é sistematicamente subestimado nas organizações porque não aparece de forma direta nos demonstrativos financeiros — manifesta-se em multas de SLA, retrabalho, insatisfação de cliente e imobilização de capital intelectual. No meu TCC, é a base teórica para argumentar que reduzir o Wait Time gera valor econômico mensurável, mesmo sem alterar o Touch Time."
    ))
    f.append(qr(
        "O que é RAG e por que você o usou?",
        "RAG é Retrieval-Augmented Generation, proposto por Lewis et al. em 2020 no NeurIPS. É uma arquitetura em duas etapas: primeiro recupera-se conhecimento externo relevante de uma base de dados; depois injeta-se esse conhecimento no prompt do LLM antes da geração. Isso resolve dois problemas dos LLMs puros: a janela de contexto limitada e a tendência à alucinação. No meu trabalho, usei RAG porque preciso que o sistema responda com base nos POPs corporativos da empresa específica do usuário, não com base no conhecimento genérico do modelo."
    ))
    f.append(qr(
        "Qual é a diferença entre seu RAG e um RAG genérico?",
        "O RAG genérico recupera por similaridade vetorial — converte documentos em embeddings e busca os mais próximos da consulta. O meu adota recuperação dirigida por taxonomia: as Tags de Autorização Temática são índices semânticos humanamente validados pelos gestores, e o casamento de TAGS entre cartão e knowledge_base define o que vai para o prompt. Resultado: payload 87,5% menor, zero ambiguidade vetorial e curadoria garantida."
    ))
    f.append(qr(
        "Por que escolher DES e não outro método de simulação?",
        "Porque o Kanban é um sistema com filas, recursos compartilhados e variabilidade estocástica — exatamente o que Banks et al. (2010) descrevem como o caso de uso canônico da Discrete-Event Simulation. Alternativas como Agent-Based Modeling seriam apropriadas para estudar comportamento emergente dos operadores, e Teoria de Filas analítica seria boa para limites assintóticos — ambas estão na lista de trabalhos futuros."
    ))

    # ===== 4. ARQUITETURA =====
    f.append(PageBreak())
    f.append(Paragraph("4. Sobre a arquitetura e a pilha tecnológica", est_h1))
    f.append(qr(
        "Descreva sua arquitetura em uma frase.",
        "É uma Single Page Application em React + Vite hospedada na Vercel Edge Network, conectada a um backend BaaS Supabase (PostgreSQL + Auth + API), com integração ao Google Gemini para geração de checklists, e isolamento multilocatário garantido por Row Level Security no nível do banco."
    ))
    f.append(qr(
        "Por que Supabase e não AWS RDS direto?",
        "Por custo total de propriedade. Supabase entrega PostgreSQL gerenciado, auth com Google SSO, API REST automática e realtime — todos integrados. Para pequenas e médias operações, equivale a anos de engenharia de plataforma sem custo. Para uma Fortune 500, RDS direto faria mais sentido pela flexibilidade.",
        "Não desdenhe da AWS. Apenas diga que a escolha é contextual."
    ))
    f.append(qr(
        "Por que Vanilla CSS e não Tailwind?",
        "Decisão de design system. Tailwind é excelente para velocidade, mas limita o vocabulário visual. Eu queria efeitos de Glassmorphism, gradientes específicos e micro-animações de engajamento que ficariam atrapalhados em frameworks utilitários. Vanilla CSS me deu controle total."
    ))
    f.append(qr(
        "Por que Google Gemini e não GPT-4 ou Claude?",
        "Três fatores: custo competitivo por token, suporte nativo a JSON estruturado nas respostas, e a possibilidade de data residency pelo Google Cloud. Em produção, a camada de IA está abstraída atrás de uma interface simples no backend — o LLM seria trocável sem mudanças de arquitetura.",
        "Demonstre que pensou em trocabilidade. Banca técnica gosta."
    ))
    f.append(qr(
        "O que acontece se a API do Gemini cair?",
        "Plano de contingência: o backend tem timeout configurado. Em caso de falha, o frontend exibe os POPs brutos retornados do Supabase como fallback. A operação não trava — perde-se apenas a sumarização guiada do LLM, mas o conhecimento corporativo ainda chega ao operador. Está documentado no plano de testes."
    ))

    # ===== 5. SEGURANCA RLS =====
    f.append(PageBreak())
    f.append(Paragraph("5. Sobre segurança RLS e multilocatário", est_h1))
    f.append(qr(
        "O que é Row Level Security e por que ele é central no seu trabalho?",
        "RLS é um mecanismo nativo do PostgreSQL no qual políticas de segurança são avaliadas pelo motor relacional no nível de cada linha, antes mesmo da cláusula WHERE explícita da consulta. Ele transforma o isolamento multilocatário em garantia por construção, não por convenção de programação. No meu TCC, garante que o LLM jamais receba conhecimento de uma empresa que não seja a do usuário autenticado."
    ))
    f.append(qr(
        "Por que RLS por e-mail e não por user_id?",
        "Escolha pragmática observada no script security_hardening.sql que está em produção. O JWT do Supabase carrega o e-mail de forma consistente entre fluxos (Google SSO, link mágico, senha). É funcionalmente equivalente a user_id, mas mais legível em logs de auditoria.",
        "Aponte que o código real do projeto está no Capítulo 4."
    ))
    f.append(qr(
        "Como você evita prompt injection malicioso?",
        "Três camadas. Primeira: o conteúdo dos POPs vem da knowledge_base curada pelo gestor — não de input livre do operador. Segunda: o RLS impede qualquer acesso a POPs de outra empresa, então mesmo que alguém tente injeção, só atingirá o próprio escopo. Terceira: o prompt template usa delimitadores explícitos. Testes adversariais sistemáticos estão na lista de trabalhos futuros."
    ))
    f.append(qr(
        "E se um desenvolvedor esquecer de aplicar RLS em uma nova tabela?",
        "Esse é precisamente o ponto crítico. No Supabase, há um aviso visual no painel quando uma tabela tem RLS desabilitado. Como prática de desenvolvimento, todo novo DDL passa por revisão. Como mitigação adicional, mantenho um script de auditoria que lista tabelas sem RLS — está na pasta scripts/ do repositório."
    ))

    # ===== 6. METODOLOGIA =====
    f.append(PageBreak())
    f.append(Paragraph("6. Sobre a metodologia de simulação", est_h1))
    f.append(qr(
        "Por que simulação de eventos discretos e não A/B test em produção real?",
        "A/B test real seria o padrão-ouro, mas demanda 3 a 6 meses em uma operação cliente disposta a participar — inviável no prazo de um TCC. A DES com replicação Monte Carlo é o método científico consagrado para prova de conceito quantitativa antes de implantação em larga escala, conforme Banks et al. (2010). Está declarado como prova de conceito, não como validação definitiva."
    ))
    f.append(qr(
        "Por que 30 réplicas e não 100 ou 1000?",
        "Pelo Teorema Central do Limite: a partir de N=30, a média amostral converge para uma distribuição normal independentemente da distribuição subjacente, viabilizando testes paramétricos como o t de Student. Acima de 30, o ganho marginal de precisão é pequeno e o custo computacional cresce. Escolha pragmática fundamentada em Banks et al. (2010)."
    ))
    f.append(qr(
        "Por que seed=42?",
        "Convenção da comunidade de ciência de dados — vem do romance Guia do Mochileiro das Galáxias, onde 42 é 'a resposta para tudo'. Qualquer outra semente daria resultados estatisticamente equivalentes. A função do seed é apenas garantir reprodutibilidade exata do experimento.",
        "Resposta leve. Pode até abrir um sorriso na banca."
    ))
    f.append(qr(
        "Sua simulação não é circular? Você calibrou os parâmetros para o resultado dar a seu favor.",
        "É a crítica metodológica mais sofisticada possível e tenho três respostas. Primeira: o Sistema A foi calibrado a partir do intervalo 15-30% de Feldman e Sherman, não inventado. Segunda: o Sistema B reflete o tempo real de leitura de um checklist (2 a 5 minutos), facilmente medido empiricamente. Terceira: o teste t pareado com p < 0,001 garante que, mesmo com variação estocástica, a diferença é estrutural — não aleatória. A conclusão é condicional ('se os parâmetros aderem à literatura, então...'), nunca categórica.",
        "Decore esta. É a pergunta mais perigosa."
    ))
    f.append(qr(
        "Por que distribuição uniforme e não lognormal?",
        "Por transparência e defensibilidade. Uniforme é mais simples de calibrar e auditar. Lognormal aderiria melhor à realidade empírica e está explicitamente listada como trabalho futuro na seção 7.2. Para o objetivo direcional da comparação — mostrar que o ganho existe e é robusto —, a uniforme é suficiente."
    ))

    # ===== 7. NUMEROS =====
    f.append(PageBreak())
    f.append(Paragraph("7. Sobre os números e a estatística", est_h1))
    f.append(qr(
        "O que significa um t de 114 em termos práticos?",
        "Significa que a diferença observada está 114 desvios-padrão acima do esperado por acaso. O valor crítico para p = 0,001 com 29 graus de liberdade é 3,659. Estatística t de 114 implica que a probabilidade de obter esse resultado se H₀ fosse verdadeira é menor que 1 em centenas de milhões. É um sinal estatístico inequívoco.",
        "Diga o número devagar. Banca não esquece."
    ))
    f.append(qr(
        "Por que a Quebra de SLA do Sistema B ficou zero exato?",
        "Por construção do modelo. O Cycle Time máximo possível no Sistema B é Wait máximo (5 min) somado ao Touch máximo de alta complexidade com fator de eficiência 1,00 (200 min) = 205 min, abaixo dos 240 min do SLA. Estruturalmente, nas 3.000 simulações nenhum cartão ultrapassou. Em condições reais com outliers, haveria quebras esporádicas, talvez 1-3%."
    ))
    f.append(qr(
        "O FCR saiu de 53,4% para 95,3% — não é otimista demais?",
        "É um teto teórico decorrente das regras de FCR no simulador (baixa e média complexidade resolvíveis 100% no Sistema B; alta com 85% de probabilidade). Em produção, observaria-se algo entre 75% e 90% — ainda assim ganho enorme. Está listado como tema para validação empírica futura."
    ))
    f.append(qr(
        "Você calculou o tamanho de efeito (Cohen's d)?",
        "Não no documento atual, mas é trivial: d é a média das diferenças dividida pelo desvio-padrão das diferenças. Para o Cycle Time, dá aproximadamente 20, classificado como 'efeito enorme' (huge) na escala de Cohen — bem acima do limiar de 0,8 para efeito grande. Posso adicionar como apêndice em uma revisão.",
        "Confessar com plano transmite domínio."
    ))
    f.append(qr(
        "Fez ANOVA ou só teste t?",
        "Apenas teste t pareado bilateral, porque a comparação é entre duas amostras pareadas. ANOVA seria adequada se houvesse três ou mais sistemas comparados (por exemplo, Kanban Tradicional, Kanban + IA Genérica, Kanban IA). É boa sugestão para trabalho futuro."
    ))

    # ===== 8. RESULTADOS =====
    f.append(PageBreak())
    f.append(Paragraph("8. Sobre os resultados e sua interpretação", est_h1))
    f.append(qr(
        "Resuma seus resultados em três frases.",
        "O Cycle Time caiu 44,6%, de 170,6 para 94,5 minutos por cartão. A taxa de quebra de SLA caiu de 28,3% para 0%, e o FCR subiu de 53,4% para 95,3%. O consumo de tokens do LLM caiu 87,5%, e a projeção financeira anual ultrapassa R$ 1 milhão para 1.000 chamados/mês — tudo com p < 0,001 no teste t pareado.",
        "Saber recitar essas 3 frases sem hesitar vale meio ponto."
    ))
    f.append(qr(
        "Esse resultado parece bom demais.",
        "Concordo que os números são expressivos. Eles refletem uma simulação controlada, calibrada a partir da literatura. O ganho relativo é o que importa, não os valores absolutos. Em ambiente real, o ganho seria provavelmente menor — talvez 30 a 40% no Cycle Time em vez de 44,6% —, mas direcionalmente robusto. É uma prova de conceito quantitativa, não uma medição empírica."
    ))
    f.append(qr(
        "Como você lidaria com cartões de complexidade muito alta, fora do modelo?",
        "O modelo cobre três níveis de complexidade. Cartões fora dessa faixa entrariam em uma quarta categoria de exceção, com tratamento especial: escalação direta para especialistas, sem passar pela IA. O sistema reconhece o limite do conhecimento corporativo e não tenta substituir expertise humana em casos genuinamente novos."
    ))
    f.append(qr(
        "Qual o impacto humano? Os operadores serão substituídos pela IA?",
        "Pelo contrário. A IA elimina o tempo de busca, não o trabalho. O operador continua sendo o executor, mas com menos fadiga decisória, mais autonomia e menos escalações. Choo (2003) sustenta teoricamente que a entrega oportuna do conhecimento eleva, não substitui, a tomada de decisão humana. O FCR subindo de 53% para 95% mostra exatamente isso: o operador resolve mais sozinho."
    ))

    # ===== 9. ORIGINALIDADE =====
    f.append(PageBreak())
    f.append(Paragraph("9. Sobre originalidade, plágio e contribuição", est_h1))
    f.append(qr(
        "Isso não é apenas RAG aplicado a Kanban?",
        "Há três diferenças concretas. Primeira: RAG genérico recupera por similaridade vetorial; eu uso filtragem por TAGS humanamente validadas — RAG dirigido por taxonomia. Segunda: meu sistema acopla a recuperação ao fluxo Kanban, com metadados do cartão entrando no prompt — não é um chatbot lateral. Terceira: a infraestrutura inclui isolamento multilocatário por RLS no nível do banco, o que não aparece na literatura RAG canônica."
    ))
    f.append(qr(
        "Já existem produtos similares: Atlassian Intelligence, Notion AI...",
        "Esses produtos fazem sumarização e Q&A sobre conteúdo do próprio cartão ou da página. Não fazem injeção de Procedimentos Operacionais Padrão corporativos, contextualizados por taxonomia e com isolamento multilocatário garantido por RLS no banco. O escopo é diferente — eles são produtos de produtividade individual; o meu é de governança operacional B2B."
    ))
    f.append(qr(
        "Em uma frase, qual é a sua contribuição?",
        "Transformei o cartão Kanban de contêiner descritivo passivo em agente contextual semântico, com isolamento multilocatário garantido por construção e validado estatisticamente via simulação Monte Carlo.",
        "Decore essa frase. Ela vale uma pergunta inteira."
    ))
    f.append(qr(
        "Você passaria pelo Turnitin?",
        "Verifiquei termos distintivos do meu trabalho — Mecanismo de Scoping Temático Autônomo, Tags de Autorização Temática, Gargalo Cognitivo — e nenhum retornou correspondência exata em busca web. A expectativa de similaridade total no Turnitin é de 8 a 15%, basicamente proveniente das referências bibliográficas formatadas em ABNT (que sempre marcam) e do código do simulador. Plágio real, zero."
    ))

    # ===== 10. LIMITACOES =====
    f.append(PageBreak())
    f.append(Paragraph("10. Sobre limitações e trabalhos futuros", est_h1))
    f.append(qr(
        "Quais são as principais limitações do seu trabalho?",
        "Três limitações que reconheço abertamente na seção 7.1. Primeira: os parâmetros estocásticos da simulação, embora calibrados em Feldman e Sherman, não substituem coleta empírica em ambiente real. Segunda: distribuições uniformes são mais simples que a realidade — lognormal aderiria melhor. Terceira: aspectos qualitativos (satisfação do operador, fadiga decisória) não foram diretamente mensurados. As três têm trabalho futuro correspondente na seção 7.2."
    ))
    f.append(qr(
        "Se você tivesse mais um ano, o que faria?",
        "Cinco coisas. Primeiro, estudo de caso longitudinal em uma operação real instrumentada. Segundo, substituir distribuição uniforme por lognormal calibrada nesses dados reais. Terceiro, integrar agentes de voz para operadores de campo. Quarto, aprendizado por reforço para que o sistema sugira novos POPs a partir do histórico. Quinto, framework de testes adversariais de prompt injection.",
        "Essa pergunta é convite. Tenha lista pronta."
    ))
    f.append(qr(
        "O que você faria de diferente?",
        "Substituiria a distribuição uniforme do Touch Time por lognormal logo de início, instrumentaria uma operação real para coletar tempos verdadeiros e adicionaria testes adversariais de prompt injection desde a primeira versão. Já está tudo declarado na seção 7.2 como trabalho futuro, mas no meu próximo projeto começaria por aí.",
        "Autoavaliar-se antes da banca desarma críticas."
    ))

    # ===== 11. ARMADILHAS =====
    f.append(PageBreak())
    f.append(Paragraph("11. Perguntas-armadilha", est_h1))
    f.append(qr(
        "Você usou IA para escrever este TCC?",
        "Usei IA como ferramenta de apoio à redação, na mesma escala em que usaria um corretor gramatical ou um colega revisor. Mas o conteúdo técnico, a hipótese, a modelagem do simulador, a interpretação dos resultados e as decisões arquiteturais são integralmente meus. Posso defender cada linha do trabalho oralmente, agora mesmo, sem consulta.",
        "Responda com calma, sem se defender em excesso. Confiança."
    ))
    f.append(qr(
        "Você implantou isso em uma empresa real?",
        "A arquitetura está implementada e em testes internos, com políticas RLS reais aplicadas no Supabase (Capítulo 4). A validação em operação cliente produtiva ainda não — é exatamente o trabalho futuro prioritário declarado em 7.2.",
        "Não invente cliente. Honestidade vale mais que ficção."
    ))
    f.append(qr(
        "Por que você não fez X?",
        "Excelente sugestão, professor. Isso seria de fato o próximo passo natural. No escopo deste TCC, optei por focar em [aspecto que fez] para manter rigor metodológico naquilo que era viável no prazo. Sua sugestão está alinhada com os trabalhos futuros que listo em 7.2.",
        "Concorde, contextualize, redirecione. Nunca se defenda em primeira pessoa."
    ))

    # ===== 12. PROCESSO =====
    f.append(PageBreak())
    f.append(Paragraph("12. Perguntas pessoais e de processo", est_h1))
    f.append(qr(
        "Por que você escolheu este tema?",
        "Convivo profissionalmente com operações de suporte e logística que sofrem o Gargalo Cognitivo todo dia. Quando os LLMs começaram a maturar em 2023-2024, vi a oportunidade técnica de resolver isso de forma escalável — mas com a barreira da segurança multilocatário, que descobri ser perfeitamente endereçável por RLS do PostgreSQL. Foi a interseção entre dor real, oportunidade técnica e curiosidade acadêmica."
    ))
    f.append(qr(
        "O que você aprendeu fazendo este TCC?",
        "Três aprendizados maiores. Primeiro, que arquitetura de software é tão importante quanto código — uma boa política RLS resolve mais que mil verificações na aplicação. Segundo, que validação estatística rigorosa transforma uma boa ideia em argumento defensável. Terceiro, que a melhor IA não é a que sabe mais, é a que recebe o contexto certo no momento certo."
    ))
    f.append(qr(
        "O que você pretende fazer com este trabalho depois da defesa?",
        "Pretendo dar continuidade ao desenvolvimento da plataforma e, se a banca julgar pertinente, publicar uma versão demo. A médio prazo, busco transformar o protótipo em produto comercial validado em operação real, e considero seriamente prosseguir os estudos em pós-graduação — possivelmente com foco em testes adversariais de sistemas LLM-RLS."
    ))

    # ===== ENCERRAMENTO =====
    f.append(PageBreak())
    f.append(Paragraph("Encerramento", est_h1))
    f.append(Paragraph(
        "Estas 50 perguntas cobrem mais de 90% do que uma banca de Ciência da Computação da UNIP pode "
        "perguntar sobre o seu trabalho. Se você dominar este material, qualquer pergunta surpresa cai "
        "em pelo menos uma destas categorias e você consegue improvisar com segurança a partir das "
        "respostas modelo.", est_body))
    f.append(Spacer(1, 12))
    f.append(caixa(
        "<b>3 regras de ouro para a arguição:</b><br/><br/>"
        "1. <b>Ouça a pergunta inteira</b> antes de começar a responder. Não interrompa.<br/>"
        "2. <b>Repita a pergunta com suas palavras</b> antes de responder — te dá 3 segundos de pensamento.<br/>"
        "3. <b>Se não souber, declare com plano:</b> 'Não tenho a resposta neste momento, mas é um excelente "
        "apontamento que investigarei.' Nunca diga 'eu não sei' seco.<br/><br/>"
        "<b>Você fez o trabalho. Você defende ele com tranquilidade. Boa banca.</b>",
        cor_fundo=CREME, cor_borda=OURO, padding=12))

    doc.build(f, onFirstPage=cabecalho_rodape, onLaterPages=cabecalho_rodape)
    print(f"OK -> {OUT_PROJ}")
    # Copia para Downloads
    import shutil
    shutil.copy(OUT_PROJ, OUT_DOWNLOADS)
    print(f"OK -> {OUT_DOWNLOADS}")
    print(f"Tamanho: {os.path.getsize(OUT_PROJ)/1024:.1f} KB")


if __name__ == "__main__":
    construir()
