# -*- coding: utf-8 -*-
"""Gera diagramas UML como PNG: Casos de Uso, Sequencia e DER."""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Ellipse, Rectangle
from matplotlib.lines import Line2D

OUT = os.path.join(os.path.dirname(__file__), "charts")
os.makedirs(OUT, exist_ok=True)

AZUL = "#2b5876"
CIANO = "#00b4db"
CINZA_CLARO = "#eef3f7"
BORDA = "#1b3a52"

# ============================================================================
# Diagrama 1 - Casos de Uso
# ============================================================================
fig, ax = plt.subplots(figsize=(11, 7))
ax.set_xlim(0, 14); ax.set_ylim(0, 10); ax.axis("off")

def ator(x, y, nome):
    ax.plot(x, y+0.6, "o", color="black", markersize=12)
    ax.plot([x, x], [y+0.55, y-0.2], "k-", lw=2)
    ax.plot([x-0.4, x+0.4], [y+0.25, y+0.25], "k-", lw=2)
    ax.plot([x, x-0.35], [y-0.2, y-0.8], "k-", lw=2)
    ax.plot([x, x+0.35], [y-0.2, y-0.8], "k-", lw=2)
    ax.text(x, y-1.15, nome, ha="center", fontsize=10, fontweight="bold")

def uc(x, y, texto):
    e = Ellipse((x, y), 3.4, 1.0, facecolor=CIANO, edgecolor=BORDA, lw=1.5)
    ax.add_patch(e)
    ax.text(x, y, texto, ha="center", va="center", fontsize=9, color="white", fontweight="bold")

# Fronteira do sistema
ax.add_patch(Rectangle((4.5, 0.5), 7, 9, fill=False, edgecolor=BORDA, lw=2, linestyle="--"))
ax.text(8, 9.7, "Fronteira do Sistema Kanban IA", ha="center", fontsize=11, fontweight="bold", color=BORDA)

# Atores
ator(1.2, 7.5, "Operador\nLogístico")
ator(1.2, 4.5, "Gestor\nOperacional")
ator(1.2, 1.8, "Cliente\nB2B")

# Casos de uso
uc(7.0, 8.3, "Movimentar Cartões no Kanban")
uc(7.0, 6.8, "Solicitar Assistência da IA")
uc(7.0, 5.2, "Cadastrar POPs e Regras")
uc(7.0, 3.6, "Acompanhar Painel de SLAs")
uc(7.0, 2.0, "Abrir Chamados pelo Portal")

# Linhas de associação
def liga(x1, y1, x2, y2):
    ax.plot([x1, x2], [y1, y2], "k-", lw=1.2)

liga(1.5, 7.4, 5.3, 8.3)
liga(1.5, 7.4, 5.3, 6.8)
liga(1.5, 4.5, 5.3, 5.2)
liga(1.5, 4.5, 5.3, 3.6)
liga(1.5, 1.8, 5.3, 2.0)

ax.set_title("Diagrama de Casos de Uso - Sistema Kanban IA", fontsize=13, fontweight="bold", pad=20)
plt.tight_layout()
plt.savefig(os.path.join(OUT, "uml1_casos_de_uso.png"), dpi=160, bbox_inches="tight", facecolor="white")
plt.close()
print("OK -> uml1_casos_de_uso.png")

# ============================================================================
# Diagrama 2 - Sequência
# ============================================================================
fig, ax = plt.subplots(figsize=(12, 8))
ax.set_xlim(0, 14); ax.set_ylim(0, 11); ax.axis("off")

participantes = [
    (1.5, "Operador"),
    (4.5, "Frontend\n(React/Vite)"),
    (7.5, "Backend\n(Supabase / PostgreSQL)"),
    (10.5, "LLM\n(Google Gemini)"),
]

for x, nome in participantes:
    ax.add_patch(FancyBboxPatch((x-1.1, 9.6), 2.2, 0.8,
                                 boxstyle="round,pad=0.05",
                                 facecolor=AZUL, edgecolor=BORDA, lw=1.5))
    ax.text(x, 10.0, nome, ha="center", va="center", fontsize=9.5,
            color="white", fontweight="bold")
    ax.plot([x, x], [9.6, 0.5], "k--", lw=0.8, alpha=0.5)

def msg(y, x1, x2, texto, sincrono=True):
    estilo = "-|>" if sincrono else "<|-"
    seta = FancyArrowPatch((x1, y), (x2, y), arrowstyle="->", color=BORDA,
                            lw=1.6, mutation_scale=15)
    ax.add_patch(seta)
    meio = (x1 + x2) / 2
    ax.text(meio, y + 0.15, texto, ha="center", va="bottom", fontsize=8.8,
            style="italic", color=BORDA)

msg(8.7, 1.5, 4.5, "1: Clica em 'Apoio da IA' no Cartão #102")
msg(7.7, 4.5, 7.5, "2: Envia metadados + auth.jwt")
ax.add_patch(FancyBboxPatch((5.8, 6.0), 3.4, 1.0,
                             boxstyle="round,pad=0.05",
                             facecolor="#fff5d6", edgecolor=BORDA, lw=1.2))
ax.text(7.5, 6.5, "Nota: Política RLS aplicada\nknowledge_base.company_id =\njwt.company_id",
        ha="center", va="center", fontsize=8)
msg(5.3, 7.5, 4.5, "3: Retorna POPs autorizados", sincrono=False)
msg(4.3, 4.5, 10.5, "4: Envia prompt otimizado (~1.500 tokens)")
msg(3.3, 10.5, 4.5, "5: Retorna prescrição determinística", sincrono=False)
msg(2.3, 4.5, 1.5, "6: Renderiza checklist na interface", sincrono=False)

ax.set_title("Diagrama de Sequência - Motor Semântico do Kanban IA", fontsize=13, fontweight="bold", pad=20)
plt.tight_layout()
plt.savefig(os.path.join(OUT, "uml2_sequencia.png"), dpi=160, bbox_inches="tight", facecolor="white")
plt.close()
print("OK -> uml2_sequencia.png")

# ============================================================================
# Diagrama 3 - DER
# ============================================================================
fig, ax = plt.subplots(figsize=(12, 7.5))
ax.set_xlim(0, 14); ax.set_ylim(0, 9); ax.axis("off")

def entidade(x, y, w, h, titulo, campos):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.05",
                                 facecolor=CINZA_CLARO, edgecolor=BORDA, lw=1.6))
    ax.add_patch(Rectangle((x, y+h-0.7), w, 0.7, facecolor=AZUL, edgecolor=BORDA, lw=1.6))
    ax.text(x+w/2, y+h-0.35, titulo, ha="center", va="center",
            fontsize=11, color="white", fontweight="bold")
    for i, campo in enumerate(campos):
        ax.text(x+0.15, y+h-1.1-i*0.35, campo, ha="left", va="center", fontsize=9)

entidade(0.5, 5.5, 3.0, 3.0, "companies", [
    "PK id : uuid", "name : text", "invite_code : text", "created_at : timestamp"
])
entidade(5.5, 5.5, 3.0, 3.0, "profiles", [
    "PK id : uuid", "FK company_id", "email : text", "role : text", "name : text"
])
entidade(10.5, 5.5, 3.0, 3.0, "knowledge_base", [
    "PK id : uuid", "FK company_id", "tags : text[]", "content : text", "created_by"
])
entidade(0.5, 0.5, 3.0, 3.5, "projects", [
    "PK id : uuid", "FK company_id", "name : text", "wip_limit : int", "status : text"
])
entidade(5.5, 0.5, 3.0, 3.5, "tasks (cards)", [
    "PK id : uuid", "FK project_id", "FK company_id", "title : text",
    "priority : text", "tags : text[]", "column : text"
])
entidade(10.5, 0.5, 3.0, 3.5, "ai_logs", [
    "PK id : uuid", "FK task_id", "FK company_id",
    "prompt_tokens : int", "response_ms : int", "created_at"
])

def rel(x1, y1, x2, y2, card="1..N"):
    ax.plot([x1, x2], [y1, y2], "-", color=BORDA, lw=1.4)
    ax.text((x1+x2)/2, (y1+y2)/2 + 0.15, card, ha="center", fontsize=8, color=BORDA,
            fontweight="bold")

rel(3.5, 7.0, 5.5, 7.0)        # companies -> profiles
rel(3.5, 6.5, 10.5, 6.5)       # companies -> knowledge_base
rel(2.0, 5.5, 2.0, 4.0)        # companies -> projects
rel(7.0, 5.5, 7.0, 4.0)        # profiles -> tasks (created_by)
rel(3.5, 2.2, 5.5, 2.2)        # projects -> tasks
rel(8.5, 2.2, 10.5, 2.2)       # tasks -> ai_logs

ax.set_title("Diagrama Entidade-Relacionamento - Modelo de Dados do Kanban IA",
             fontsize=13, fontweight="bold", pad=20)
plt.tight_layout()
plt.savefig(os.path.join(OUT, "uml3_der.png"), dpi=160, bbox_inches="tight", facecolor="white")
plt.close()
print("OK -> uml3_der.png")

print("\nDiagramas UML gerados em:", OUT)
