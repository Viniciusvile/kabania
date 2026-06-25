# -*- coding: utf-8 -*-
"""
Gera os graficos PNG para o TCC (dados do Monte Carlo, 30 replicas).
Saida: pasta charts/
"""
import os
import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

BASE = os.path.dirname(__file__)
OUT = os.path.join(BASE, "charts")
os.makedirs(OUT, exist_ok=True)

with open(os.path.join(BASE, "monte_carlo_stats.json"), encoding="utf-8") as f:
    S = json.load(f)

AZUL = "#2b5876"
CIANO = "#00b4db"
VERDE = "#2e8b57"
VERMELHO = "#c0392b"
CINZA = "#7f8c8d"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 11,
    "axes.titlesize": 13,
    "axes.titleweight": "bold",
    "axes.spines.top": False,
    "axes.spines.right": False,
})

def salvar(fig, nome):
    path = os.path.join(OUT, nome)
    fig.tight_layout()
    fig.savefig(path, dpi=160, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"OK -> {path}")

# ----- Grafico 1: Tempos operacionais medios com barras de erro -----
metricas = ["Wait Time", "Touch Time", "Cycle Time"]
kanban = [S["wait"]["A_media"], S["touch"]["A_media"], S["cycle"]["A_media"]]
kanban_ic = [S["wait"]["A_ic95"], S["touch"]["A_ic95"], S["cycle"]["A_ic95"]]
kanban_ia = [S["wait"]["B_media"], S["touch"]["B_media"], S["cycle"]["B_media"]]
kanban_ia_ic = [S["wait"]["B_ic95"], S["touch"]["B_ic95"], S["cycle"]["B_ic95"]]

fig, ax = plt.subplots(figsize=(8.2, 4.8))
x = np.arange(len(metricas))
largura = 0.38
b1 = ax.bar(x - largura/2, kanban, largura, yerr=kanban_ic, capsize=4,
            label="Kanban Tradicional", color=VERMELHO, edgecolor="white",
            error_kw=dict(ecolor="#444", lw=1.2))
b2 = ax.bar(x + largura/2, kanban_ia, largura, yerr=kanban_ia_ic, capsize=4,
            label="Kanban IA", color=CIANO, edgecolor="white",
            error_kw=dict(ecolor="#444", lw=1.2))
ax.set_title("Tempos Operacionais Médios — IC 95% (n=30 réplicas)")
ax.set_xticks(x); ax.set_xticklabels(metricas)
ax.set_ylabel("Tempo (min)")
ax.legend(loc="upper left", frameon=False)
for bars in (b1, b2):
    for r in bars:
        ax.text(r.get_x() + r.get_width()/2, r.get_height() + 4,
                f"{r.get_height():.1f}", ha="center", va="bottom", fontsize=9)
ax.set_ylim(0, max(kanban) * 1.22)
ax.grid(axis="y", linestyle="--", alpha=0.4)
salvar(fig, "g1_tempos_operacionais.png")

# ----- Grafico 2: Cycle Time isolado -----
fig, ax = plt.subplots(figsize=(6.8, 4.4))
sistemas = ["Kanban Tradicional", "Kanban IA"]
valores = [S["cycle"]["A_media"], S["cycle"]["B_media"]]
ics = [S["cycle"]["A_ic95"], S["cycle"]["B_ic95"]]
cores = [VERMELHO, VERDE]
barras = ax.bar(sistemas, valores, yerr=ics, capsize=6, color=cores,
                edgecolor="white", width=0.55,
                error_kw=dict(ecolor="#333", lw=1.4))
ax.set_title("Cycle Time Médio por Cartão (minutos)")
ax.set_ylabel("Cycle Time (min)")
for r, v, ic in zip(barras, valores, ics):
    ax.text(r.get_x() + r.get_width()/2, r.get_height() + ic + 3,
            f"{v:.1f} ± {ic:.1f}", ha="center", va="bottom",
            fontsize=11, fontweight="bold")
delta = S["cycle"]["delta_pct"]
ax.annotate("", xy=(1, valores[1] + 8), xytext=(0, valores[0] - 8),
            arrowprops=dict(arrowstyle="->", color=AZUL, lw=2))
ax.text(0.5, (valores[0] + valores[1]) / 2,
        f"−{delta:.1f}%\n(p < 0,001)", color=AZUL, fontweight="bold",
        fontsize=12, ha="center")
ax.set_ylim(0, max(valores) * 1.25)
ax.grid(axis="y", linestyle="--", alpha=0.4)
salvar(fig, "g2_cycle_time.png")

# ----- Grafico 3: Pizza SLA -----
fig, axes = plt.subplots(1, 2, figsize=(8.2, 4.4))
rotulos = ["Dentro do SLA", "Quebra de SLA"]
cores_p = [VERDE, VERMELHO]
A = S["sla"]["A_media"]; B = S["sla"]["B_media"]
axes[0].pie([100 - A, A], labels=rotulos, autopct="%1.1f%%", colors=cores_p,
            startangle=90, wedgeprops=dict(edgecolor="white", linewidth=2))
axes[0].set_title(f"Kanban Tradicional\n({A:.1f}% de quebras — SLA > 240 min)")
axes[1].pie([100 - B, B + 0.0001], labels=rotulos, autopct="%1.1f%%", colors=cores_p,
            startangle=90, wedgeprops=dict(edgecolor="white", linewidth=2))
axes[1].set_title(f"Kanban IA\n({B:.1f}% de quebras — SLA > 240 min)")
fig.suptitle("Taxa de Conformidade de SLA — n=30 réplicas", fontsize=13, fontweight="bold")
salvar(fig, "g3_sla_pizza.png")

# ----- Grafico 4: FCR -----
fig, ax = plt.subplots(figsize=(6.8, 4.4))
fcr_a = S["fcr"]["A_media"]; fcr_b = S["fcr"]["B_media"]
ic_a = S["fcr"]["A_ic95"]; ic_b = S["fcr"]["B_ic95"]
barras = ax.bar(["Kanban Tradicional", "Kanban IA"], [fcr_a, fcr_b],
                yerr=[ic_a, ic_b], capsize=6,
                color=[CINZA, AZUL], edgecolor="white", width=0.55,
                error_kw=dict(ecolor="#333", lw=1.4))
for r, v, ic in zip(barras, [fcr_a, fcr_b], [ic_a, ic_b]):
    ax.text(r.get_x() + r.get_width()/2, r.get_height() + ic + 1.5,
            f"{v:.1f}% ± {ic:.1f}", ha="center", va="bottom",
            fontsize=11, fontweight="bold")
ax.set_title("First Contact Resolution (FCR) — IC 95%")
ax.set_ylabel("Taxa de resolução no 1º contato (%)")
ax.set_ylim(0, 115)
ax.grid(axis="y", linestyle="--", alpha=0.4)
salvar(fig, "g4_fcr.png")

# ----- Grafico 5: Tokens -----
fig, ax = plt.subplots(figsize=(7.0, 4.4))
sistemas = ["RAG Genérico", "Kanban IA (TAGS+RLS)"]
tokens = [12000, 1500]
barras = ax.barh(sistemas, tokens, color=[VERMELHO, CIANO], edgecolor="white")
for r, v in zip(barras, tokens):
    ax.text(r.get_width() + 200, r.get_y() + r.get_height()/2,
            f"{v:,} tokens".replace(",", "."),
            va="center", fontsize=11, fontweight="bold")
ax.set_title("Payload Médio Enviado ao LLM por Requisição")
ax.set_xlabel("Quantidade de tokens")
ax.set_xlim(0, 14500)
ax.grid(axis="x", linestyle="--", alpha=0.4)
salvar(fig, "g5_tokens.png")

# ----- Grafico 6: Composicao Cycle Time -----
fig, ax = plt.subplots(figsize=(7.4, 4.2))
sistemas = ["Kanban Tradicional", "Kanban IA"]
wait = [S["wait"]["A_media"], S["wait"]["B_media"]]
touch = [S["touch"]["A_media"], S["touch"]["B_media"]]
ax.barh(sistemas, wait, color=VERMELHO, label="Wait Time (espera oculta)", edgecolor="white")
ax.barh(sistemas, touch, left=wait, color=CIANO, label="Touch Time (execução real)", edgecolor="white")
for i, (w, t) in enumerate(zip(wait, touch)):
    ax.text(w/2, i, f"{w:.1f}m", ha="center", va="center", color="white", fontweight="bold")
    ax.text(w + t/2, i, f"{t:.1f}m", ha="center", va="center", color="white", fontweight="bold")
    ax.text(w + t + 4, i, f"Total: {w+t:.1f}m", va="center", fontweight="bold", color="#222")
ax.set_xlim(0, max([sum(x) for x in zip(wait, touch)]) * 1.25)
ax.set_title("Composição do Cycle Time (Wait + Touch)")
ax.set_xlabel("Tempo (min)")
ax.legend(loc="lower right", frameon=False)
ax.grid(axis="x", linestyle="--", alpha=0.3)
salvar(fig, "g6_composicao_cycle.png")

# ----- Grafico 7: Boxplot - distribuicao das replicas -----
import random
random.seed(42)
# Recria replicas para boxplot
def rint(a, b): return random.randint(a, b)
def replicar():
    cy_a, cy_b = [], []
    for _ in range(30):
        sa, sb = 0, 0
        for _ in range(100):
            c = rint(1, 3)
            tbase = rint(30, 60) if c == 1 else (rint(60, 120) if c == 2 else rint(120, 200))
            wA = rint(10, 25) if c == 1 else (rint(30, 60) if c == 2 else rint(60, 100))
            tA = round(tbase * rint(110, 140) / 100)
            sa += wA + tA
            wB = rint(2, 5)
            tB = round(tbase * rint(85, 100) / 100)
            sb += wB + tB
        cy_a.append(sa / 100); cy_b.append(sb / 100)
    return cy_a, cy_b
ca, cb = replicar()

fig, ax = plt.subplots(figsize=(7.0, 4.4))
bp = ax.boxplot([ca, cb], labels=["Kanban Tradicional", "Kanban IA"],
                patch_artist=True, widths=0.55,
                medianprops=dict(color="black", lw=2))
for patch, cor in zip(bp["boxes"], [VERMELHO, VERDE]):
    patch.set_facecolor(cor); patch.set_alpha(0.7)
ax.set_title("Distribuição do Cycle Time nas 30 Réplicas (Boxplot)")
ax.set_ylabel("Cycle Time médio por réplica (min)")
ax.grid(axis="y", linestyle="--", alpha=0.4)
salvar(fig, "g7_boxplot.png")

print("\nGraficos atualizados com dados Monte Carlo em:", OUT)
