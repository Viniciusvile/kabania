# -*- coding: utf-8 -*-
"""
Renderiza as saidas dos simuladores como imagens estilo terminal (dark theme),
para usar nos slides.
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

BASE = os.path.dirname(__file__)
OUT = os.path.join(BASE, "charts")
os.makedirs(OUT, exist_ok=True)

BG = "#0d1117"      # github dark
HEADER = "#161b22"
TXT = "#c9d1d9"
ACCENT_OK = "#3fb950"
ACCENT_HL = "#58a6ff"
ACCENT_WARN = "#f0883e"
ACCENT_ERR = "#f85149"

def render_terminal(linhas, titulo, arquivo, w=14, h=8, fontsize=11, colorize=None):
    """Renderiza linhas de texto como terminal dark."""
    fig = plt.figure(figsize=(w, h), facecolor=BG)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")
    ax.set_facecolor(BG)

    # Barra de titulo
    ax.add_patch(FancyBboxPatch((0, 0.93), 1, 0.07, boxstyle="square,pad=0",
                                 facecolor=HEADER, edgecolor="none",
                                 transform=ax.transAxes))
    # 3 bolinhas (mac style)
    for i, cor in enumerate(["#ff5f56", "#ffbd2e", "#27c93f"]):
        ax.plot(0.012 + i*0.018, 0.965, "o", color=cor, markersize=10,
                transform=ax.transAxes, markeredgewidth=0)
    ax.text(0.5, 0.965, titulo, ha="center", va="center",
            fontsize=fontsize+1, color="#8b949e", family="monospace",
            transform=ax.transAxes, weight="bold")

    # Conteudo
    y = 0.88
    dy = (0.86 / max(len(linhas), 1))
    if dy > 0.04: dy = 0.04
    for linha in linhas:
        cor = TXT
        if colorize:
            for trecho, c in colorize:
                if trecho in linha:
                    cor = c; break
        ax.text(0.025, y, linha, ha="left", va="top",
                fontsize=fontsize, color=cor, family="monospace",
                transform=ax.transAxes)
        y -= dy
        if y < 0.02: break

    path = os.path.join(OUT, arquivo)
    fig.savefig(path, dpi=150, facecolor=BG, bbox_inches=None)
    plt.close(fig)
    print(f"OK -> {path}")

# ============ NODE OUTPUT ============
with open(os.path.join(BASE, "saida_node.txt"), encoding="utf-8") as f:
    linhas_node = [ln.rstrip() for ln in f.readlines()]
linhas_node = ["$ node simulador_performance_tcc.js"] + linhas_node
colorize_node = [
    ("🚀", ACCENT_HL),
    ("📊", ACCENT_HL),
    ("📈", ACCENT_OK),
    ("Kanban IA", ACCENT_OK),
    ("Mecanismo", ACCENT_OK),
    ("✔️", ACCENT_OK),
    ("🎯", ACCENT_WARN),
    ("💡", ACCENT_WARN),
    ("Crítica", ACCENT_ERR),
    ("$", ACCENT_HL),
]
render_terminal(linhas_node, "Terminal — Simulador Node.js (DES)",
                "terminal_node.png", w=14, h=8.5, fontsize=11,
                colorize=colorize_node)

# ============ PYTHON OUTPUT ============
with open(os.path.join(BASE, "saida_python.txt"), encoding="utf-8") as f:
    linhas_py = [ln.rstrip() for ln in f.readlines()]
linhas_py = ["$ python monte_carlo.py"] + linhas_py
colorize_py = [
    ("===", ACCENT_HL),
    ("Sistema A", ACCENT_WARN),
    ("Sistema B", ACCENT_OK),
    ("wait ", ACCENT_OK),
    ("touch", ACCENT_OK),
    ("cycle", ACCENT_OK),
    ("sla ", ACCENT_OK),
    ("fcr ", ACCENT_OK),
    ("p < 0,001", ACCENT_ERR),
    ("rejeicao forte", ACCENT_ERR),
    ("$ python", ACCENT_HL),
    ("Salvo em", ACCENT_HL),
]
render_terminal(linhas_py, "Terminal — Replicação Monte Carlo (Python)",
                "terminal_python.png", w=14, h=8.5, fontsize=11,
                colorize=colorize_py)

print("\nImagens de terminal geradas em:", OUT)
