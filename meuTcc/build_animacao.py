# -*- coding: utf-8 -*-
"""
Animacao didatica em GIF: Metodologia Monte Carlo aplicada ao TCC Kanban IA.
Cenas:
  1. Intro - "O que e Monte Carlo?"
  2. Uma replica - 100 cartoes processados
  3. 30 replicas - distribuicao agregada
  4. Teste t pareado - estatistica
  5. Veredito - p < 0,001
"""
import os
import random
import math
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation, PillowWriter
from matplotlib.patches import FancyBboxPatch, Rectangle

random.seed(42)
np.random.seed(42)

BASE = os.path.dirname(__file__)
OUT_GIF = os.path.join(BASE, "TCC_Animacao_MonteCarlo.gif")
OUT_MP4 = os.path.join(BASE, "TCC_Animacao_MonteCarlo.mp4")

# Paleta
BG = "#0F1838"
PANEL = "#1E2761"
TXT = "#FFFFFF"
DIM = "#8b949e"
OURO = "#FFB400"
OK = "#3FB950"
ALERT = "#F85149"
A_COR = "#F85149"   # Sistema A - Kanban Tradicional (vermelho)
B_COR = "#3FB950"   # Sistema B - Kanban IA (verde)

# ===== Pre-computacao das 30 replicas (com seed fixa, igual ao monte_carlo.py) =====
TOTAL_CARTOES = 100
N_REPLICAS = 30
SLA = 240

def rint(a, b): return random.randint(a, b)

def simular():
    cycA_total, cycB_total = 0, 0
    for _ in range(TOTAL_CARTOES):
        c = rint(1, 3)
        tbase = rint(30, 60) if c == 1 else (rint(60, 120) if c == 2 else rint(120, 200))
        wA = rint(10, 25) if c == 1 else (rint(30, 60) if c == 2 else rint(60, 100))
        tA = round(tbase * rint(110, 140) / 100)
        cycA_total += wA + tA
        wB = rint(2, 5)
        tB = round(tbase * rint(85, 100) / 100)
        cycB_total += wB + tB
    return cycA_total / TOTAL_CARTOES, cycB_total / TOTAL_CARTOES

cycA_replicas = []
cycB_replicas = []
for _ in range(N_REPLICAS):
    a, b = simular()
    cycA_replicas.append(a)
    cycB_replicas.append(b)

mediaA = np.mean(cycA_replicas)
mediaB = np.mean(cycB_replicas)
sdA = np.std(cycA_replicas, ddof=1)
sdB = np.std(cycB_replicas, ddof=1)
diffs = [a - b for a, b in zip(cycA_replicas, cycB_replicas)]
media_diff = np.mean(diffs)
sd_diff = np.std(diffs, ddof=1)
t_stat = media_diff / (sd_diff / math.sqrt(N_REPLICAS))

print(f"Pre-calculado: muA={mediaA:.1f}±{sdA:.1f}  muB={mediaB:.1f}±{sdB:.1f}  t={t_stat:.2f}")

# ===== Figura =====
fig = plt.figure(figsize=(12, 7), facecolor=BG, dpi=110)
fig.subplots_adjust(left=0.04, right=0.96, top=0.92, bottom=0.06)

# Definicao de duracao por cena (em frames a 15 fps)
FPS = 15
CENA1_FRAMES = 30    # 2s intro
CENA2_FRAMES = 45    # 3s uma replica (acelerada)
CENA3_FRAMES = 60    # 4s replicas acumulando
CENA4_FRAMES = 30    # 2s teste t
CENA5_FRAMES = 45    # 3s veredito
TOTAL_FRAMES = CENA1_FRAMES + CENA2_FRAMES + CENA3_FRAMES + CENA4_FRAMES + CENA5_FRAMES


def limpar(ax):
    ax.clear()
    ax.set_facecolor(BG)
    ax.axis("off")


def titulo(ax, texto, sub=None, y_titulo=0.95):
    ax.text(0.5, y_titulo, texto, transform=ax.transAxes,
            ha="center", va="top", fontsize=22, fontweight="bold",
            color=TXT, family="DejaVu Sans")
    if sub:
        ax.text(0.5, y_titulo - 0.06, sub, transform=ax.transAxes,
                ha="center", va="top", fontsize=13, style="italic", color=DIM)


def progresso(ax, atual, total, label):
    """Barra de progresso de cenas no topo."""
    ax.text(0.02, 0.97, label, transform=ax.transAxes,
            ha="left", va="top", fontsize=10, color=OURO, fontweight="bold")
    # Barra de progresso 5 segmentos
    for i in range(5):
        cor = OURO if i < atual else "#3a3a4a"
        ax.add_patch(plt.Rectangle((0.65 + i * 0.06, 0.965), 0.05, 0.012,
                                    transform=ax.transAxes, facecolor=cor, edgecolor="none"))
    ax.text(0.97, 0.97, f"Cena {atual}/5", transform=ax.transAxes,
            ha="right", va="top", fontsize=9, color=DIM)


# Estados acumulados para a animacao
def update(frame):
    fig.clear()
    fig.set_facecolor(BG)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_facecolor(BG)
    ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")

    # ============================================================
    # CENA 1 - INTRO
    # ============================================================
    if frame < CENA1_FRAMES:
        f_local = frame / CENA1_FRAMES
        progresso(ax, 1, 5, "METODOLOGIA MONTE CARLO")
        # Fade in
        alpha = min(1.0, f_local * 2)
        ax.text(0.5, 0.72, "Monte Carlo", ha="center", va="center",
                fontsize=48, fontweight="bold", color=OURO, alpha=alpha)
        ax.text(0.5, 0.58, "Como validar estatisticamente o ganho do Kanban IA",
                ha="center", va="center", fontsize=16, style="italic", color=TXT, alpha=alpha)
        # Conceitos chave aparecendo em sequencia
        if f_local > 0.3:
            ax.text(0.5, 0.42, "Repetir o experimento N vezes",
                    ha="center", fontsize=15, color=TXT)
        if f_local > 0.5:
            ax.text(0.5, 0.34, "Coletar uma distribuição de resultados",
                    ha="center", fontsize=15, color=TXT)
        if f_local > 0.7:
            ax.text(0.5, 0.26, "Aplicar inferência estatística (teste t)",
                    ha="center", fontsize=15, color=TXT)
        # Parametros
        ax.text(0.5, 0.12, "30 réplicas  •  100 cartões/réplica  •  seed = 42",
                ha="center", fontsize=12, color=DIM, family="DejaVu Sans Mono")

    # ============================================================
    # CENA 2 - UMA REPLICA (mostrar 100 cartoes sendo processados)
    # ============================================================
    elif frame < CENA1_FRAMES + CENA2_FRAMES:
        f_local = (frame - CENA1_FRAMES) / CENA2_FRAMES
        progresso(ax, 2, 5, "RÉPLICA 1 DE 30 — 100 CARTÕES")
        ax.text(0.5, 0.91, "Em cada réplica: simular 100 cartões nos dois sistemas",
                ha="center", fontsize=14, color=TXT, fontweight="bold")

        cartoes_processados = int(f_local * 100)
        # Grade de 10x10 cartoes
        for i in range(100):
            row = i // 10; col = i % 10
            cx = 0.32 + col * 0.034
            cy = 0.72 - row * 0.04
            processado = i < cartoes_processados
            cor = OK if processado else "#3a3a4a"
            ax.add_patch(Rectangle((cx, cy), 0.028, 0.032,
                                    facecolor=cor, edgecolor="none"))

        # Contador
        ax.text(0.5, 0.27, f"{cartoes_processados} / 100 cartões",
                ha="center", fontsize=22, fontweight="bold", color=OURO)

        # Stats parciais (proporcional aos cartoes processados)
        if cartoes_processados > 0:
            f_p = cartoes_processados / 100
            est_a = mediaA * f_p
            est_b = mediaB * f_p
            ax.text(0.18, 0.18, f"Sistema A (Kanban Tradicional)\nμ parcial: {est_a:.1f} min",
                    ha="left", va="top", fontsize=12, color=A_COR, fontweight="bold")
            ax.text(0.55, 0.18, f"Sistema B (Kanban IA)\nμ parcial: {est_b:.1f} min",
                    ha="left", va="top", fontsize=12, color=B_COR, fontweight="bold")

        ax.text(0.5, 0.06, "Cada quadrado verde = 1 cartão simulado",
                ha="center", fontsize=10, style="italic", color=DIM)

    # ============================================================
    # CENA 3 - 30 REPLICAS (acumulando histograma/dispersao)
    # ============================================================
    elif frame < CENA1_FRAMES + CENA2_FRAMES + CENA3_FRAMES:
        f_local = (frame - CENA1_FRAMES - CENA2_FRAMES) / CENA3_FRAMES
        progresso(ax, 3, 5, "REPLICAR 30 VEZES — DISTRIBUIÇÃO EMERGE")
        ax.text(0.5, 0.91, "Cada ponto = uma réplica completa (média de 100 cartões)",
                ha="center", fontsize=14, color=TXT, fontweight="bold")

        replicas_concluidas = min(N_REPLICAS, int(f_local * (N_REPLICAS + 2)))

        # Eixo dos cycle times
        x_min, x_max = 70, 200
        eixo_y_a = 0.55
        eixo_y_b = 0.30
        # Eixos
        ax.plot([0.08, 0.92], [eixo_y_a, eixo_y_a], color=DIM, lw=1, alpha=0.5)
        ax.plot([0.08, 0.92], [eixo_y_b, eixo_y_b], color=DIM, lw=1, alpha=0.5)
        # Ticks numericos
        for v in [80, 100, 120, 140, 160, 180, 200]:
            x = 0.08 + (v - x_min) / (x_max - x_min) * 0.84
            ax.plot([x, x], [eixo_y_b - 0.02, eixo_y_b - 0.01], color=DIM, lw=1)
            ax.text(x, eixo_y_b - 0.04, str(v), ha="center", fontsize=9, color=DIM)
        ax.text(0.5, eixo_y_b - 0.08, "Cycle Time médio por réplica (minutos)",
                ha="center", fontsize=10, color=DIM, style="italic")

        # Labels dos sistemas
        ax.text(0.03, eixo_y_a, "Sistema A:", fontsize=11, color=A_COR, fontweight="bold", va="center")
        ax.text(0.03, eixo_y_b, "Sistema B:", fontsize=11, color=B_COR, fontweight="bold", va="center")

        # Plotar pontos das replicas concluidas
        for i in range(replicas_concluidas):
            a = cycA_replicas[i]; b = cycB_replicas[i]
            xa = 0.08 + (a - x_min) / (x_max - x_min) * 0.84
            xb = 0.08 + (b - x_min) / (x_max - x_min) * 0.84
            # Jitter vertical
            ya = eixo_y_a + (i % 5 - 2) * 0.012
            yb = eixo_y_b + (i % 5 - 2) * 0.012
            ax.scatter([xa], [ya], s=80, c=A_COR, edgecolors="white",
                       linewidth=1.0, alpha=0.85, zorder=5)
            ax.scatter([xb], [yb], s=80, c=B_COR, edgecolors="white",
                       linewidth=1.0, alpha=0.85, zorder=5)

        # Linhas verticais das medias acumuladas
        if replicas_concluidas >= 3:
            ma = np.mean(cycA_replicas[:replicas_concluidas])
            mb = np.mean(cycB_replicas[:replicas_concluidas])
            xa = 0.08 + (ma - x_min) / (x_max - x_min) * 0.84
            xb = 0.08 + (mb - x_min) / (x_max - x_min) * 0.84
            ax.plot([xa, xa], [eixo_y_a - 0.035, eixo_y_a + 0.045],
                    color=A_COR, lw=2.5, alpha=0.9)
            ax.plot([xb, xb], [eixo_y_b - 0.035, eixo_y_b + 0.045],
                    color=B_COR, lw=2.5, alpha=0.9)

        # Painel de stats
        ax.text(0.5, 0.85, f"Réplica {replicas_concluidas}/{N_REPLICAS}",
                ha="center", fontsize=18, fontweight="bold", color=OURO)

        if replicas_concluidas >= 2:
            ma = np.mean(cycA_replicas[:replicas_concluidas])
            sda = np.std(cycA_replicas[:replicas_concluidas], ddof=1)
            mb = np.mean(cycB_replicas[:replicas_concluidas])
            sdb = np.std(cycB_replicas[:replicas_concluidas], ddof=1)
            ax.text(0.5, 0.78,
                    f"μ_A = {ma:.1f} ± {sda:.1f}    |    μ_B = {mb:.1f} ± {sdb:.1f}",
                    ha="center", fontsize=12, color=TXT, family="DejaVu Sans Mono")

        # Rodape
        ax.text(0.5, 0.08, "À medida que N cresce, a média converge (Teorema Central do Limite)",
                ha="center", fontsize=10, style="italic", color=DIM)

    # ============================================================
    # CENA 4 - TESTE T (formula e calculo)
    # ============================================================
    elif frame < CENA1_FRAMES + CENA2_FRAMES + CENA3_FRAMES + CENA4_FRAMES:
        f_local = (frame - CENA1_FRAMES - CENA2_FRAMES - CENA3_FRAMES) / CENA4_FRAMES
        progresso(ax, 4, 5, "TESTE T PAREADO BILATERAL")
        ax.text(0.5, 0.91, "Diferença entre as 30 réplicas → estatística t",
                ha="center", fontsize=14, color=TXT, fontweight="bold")

        # Hipoteses
        if f_local > 0.0:
            ax.text(0.5, 0.80, "H₀ : μ(Kanban Trad.) = μ(Kanban IA)",
                    ha="center", fontsize=13, color=DIM)
        if f_local > 0.15:
            ax.text(0.5, 0.74, "H₁ : μ(Kanban Trad.) ≠ μ(Kanban IA)",
                    ha="center", fontsize=13, color=TXT, fontweight="bold")

        # Formula
        if f_local > 0.3:
            ax.text(0.5, 0.60,
                    r"$t = \dfrac{\overline{d}}{s_d / \sqrt{n}}$",
                    ha="center", fontsize=30, color=OURO)

        # Substituicao
        if f_local > 0.5:
            ax.text(0.5, 0.42,
                    f"t = {media_diff:.2f} / ({sd_diff:.2f} / √30)",
                    ha="center", fontsize=18, color=TXT, family="DejaVu Sans Mono")
        if f_local > 0.75:
            ax.text(0.5, 0.33,
                    f"t = {media_diff:.2f} / {sd_diff/math.sqrt(N_REPLICAS):.3f}",
                    ha="center", fontsize=18, color=TXT, family="DejaVu Sans Mono")
        if f_local > 0.92:
            # destaque
            ax.add_patch(FancyBboxPatch((0.32, 0.15), 0.36, 0.10,
                                         boxstyle="round,pad=0.02",
                                         facecolor=OK, edgecolor="white", linewidth=2))
            ax.text(0.5, 0.20,
                    f"t = {t_stat:.2f}",
                    ha="center", va="center", fontsize=32, fontweight="bold",
                    color="white")

    # ============================================================
    # CENA 5 - VEREDITO
    # ============================================================
    else:
        f_local = (frame - CENA1_FRAMES - CENA2_FRAMES - CENA3_FRAMES - CENA4_FRAMES) / CENA5_FRAMES
        progresso(ax, 5, 5, "VEREDITO ESTATÍSTICO")

        # Comparacao com valor critico
        ax.text(0.5, 0.91, "Comparação com o valor crítico",
                ha="center", fontsize=14, color=TXT, fontweight="bold")

        # Eixo numerico
        if f_local > 0.05:
            ax.text(0.5, 0.78, "df = 29   |   α = 0,001 (bilateral)",
                    ha="center", fontsize=13, color=DIM, family="DejaVu Sans Mono")

        # Linha numerica
        if f_local > 0.15:
            y_linha = 0.62
            ax.plot([0.1, 0.9], [y_linha, y_linha], color=DIM, lw=2)
            for v, lab in [(0, "0"), (3.659, "3,659"), (50, "50"), (100, "100"), (t_stat, f"{t_stat:.0f}")]:
                # log-ish scale clamped
                x = 0.1 + min(v / 130, 1.0) * 0.8
                ax.plot([x, x], [y_linha - 0.012, y_linha + 0.012], color=DIM, lw=1.5)
                ax.text(x, y_linha - 0.04, lab, ha="center", fontsize=10, color=DIM)
            # zona critica
            x_crit = 0.1 + 3.659 / 130 * 0.8
            ax.axvspan(0.1, x_crit, ymin=(y_linha - 0.015)/1,
                       ymax=(y_linha + 0.015)/1, color=ALERT, alpha=0.15)
            ax.text((0.1 + x_crit)/2, y_linha + 0.05, "ZONA DE ACEITAR H₀",
                    ha="center", fontsize=8, color=ALERT)
            # nosso t
            x_t = 0.1 + min(t_stat / 130, 1.0) * 0.8
            ax.scatter([x_t], [y_linha], s=400, c=OK, edgecolors="white",
                       linewidth=2.5, zorder=10)
            ax.text(x_t, y_linha + 0.045, f"t = {t_stat:.1f}",
                    ha="center", fontsize=12, fontweight="bold", color=OK)

        # Veredito final
        if f_local > 0.45:
            ax.add_patch(FancyBboxPatch((0.15, 0.20), 0.70, 0.30,
                                         boxstyle="round,pad=0.02",
                                         facecolor=OK, edgecolor="white", linewidth=3))
            ax.text(0.5, 0.43, "p < 0,001", ha="center", va="center",
                    fontsize=36, fontweight="bold", color="white")
            ax.text(0.5, 0.33, "REJEITAR H₀ — DIFERENÇA ALTAMENTE SIGNIFICATIVA",
                    ha="center", va="center", fontsize=13, fontweight="bold", color="white")
            ax.text(0.5, 0.26, "O Kanban IA é estatisticamente superior",
                    ha="center", va="center", fontsize=11, style="italic", color="white")

        # Rodape mensagem final
        if f_local > 0.75:
            ax.text(0.5, 0.10,
                    "Menos de 1 chance em 1.000 desse resultado ocorrer por acaso.",
                    ha="center", fontsize=11, style="italic", color=OURO)
        if f_local > 0.92:
            ax.text(0.5, 0.04, "TCC — Mecanismo Kanban IA  •  Vinicius V. Rufini",
                    ha="center", fontsize=9, color=DIM)


# ===== Render =====
print(f"Renderizando {TOTAL_FRAMES} frames a {FPS} fps...")
anim = FuncAnimation(fig, update, frames=TOTAL_FRAMES, interval=1000/FPS, repeat=False)

writer = PillowWriter(fps=FPS)
anim.save(OUT_GIF, writer=writer, dpi=100)
print(f"OK -> {OUT_GIF}  ({os.path.getsize(OUT_GIF)/1024:.1f} KB)")
