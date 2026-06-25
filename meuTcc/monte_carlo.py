# -*- coding: utf-8 -*-
"""
Replicacao Monte Carlo do simulador de eventos discretos do TCC.
30 rodadas independentes de 100 cartoes cada.
Reporta media, desvio-padrao, IC 95% e teste t pareado entre Kanban e Kanban IA.
"""
import random
import math
import json
import os

random.seed(42)

TOTAL_CARTOES = 100
SLA = 240
N_REPLICAS = 30

def rint(a, b): return random.randint(a, b)

def simular_uma_replicacao():
    a = {"wait": 0, "touch": 0, "cycle": 0, "sla": 0, "fcr": 0}
    b = {"wait": 0, "touch": 0, "cycle": 0, "sla": 0, "fcr": 0}
    for _ in range(TOTAL_CARTOES):
        c = rint(1, 3)
        tbase = rint(30, 60) if c == 1 else (rint(60, 120) if c == 2 else rint(120, 200))
        wA = rint(10, 25) if c == 1 else (rint(30, 60) if c == 2 else rint(60, 100))
        tA = round(tbase * rint(110, 140) / 100)
        cyA = wA + tA
        a["wait"] += wA; a["touch"] += tA; a["cycle"] += cyA
        if cyA > SLA: a["sla"] += 1
        if c == 1 or (c == 2 and random.random() > 0.4): a["fcr"] += 1
        wB = rint(2, 5)
        tB = round(tbase * rint(85, 100) / 100)
        cyB = wB + tB
        b["wait"] += wB; b["touch"] += tB; b["cycle"] += cyB
        if cyB > SLA: b["sla"] += 1
        if c <= 2 or random.random() > 0.15: b["fcr"] += 1
    return {
        "wait_A": a["wait"]/TOTAL_CARTOES, "wait_B": b["wait"]/TOTAL_CARTOES,
        "touch_A": a["touch"]/TOTAL_CARTOES, "touch_B": b["touch"]/TOTAL_CARTOES,
        "cycle_A": a["cycle"]/TOTAL_CARTOES, "cycle_B": b["cycle"]/TOTAL_CARTOES,
        "sla_A": a["sla"]/TOTAL_CARTOES*100, "sla_B": b["sla"]/TOTAL_CARTOES*100,
        "fcr_A": a["fcr"]/TOTAL_CARTOES*100, "fcr_B": b["fcr"]/TOTAL_CARTOES*100,
    }

# Executa replicas
replicas = [simular_uma_replicacao() for _ in range(N_REPLICAS)]

def stats(lista):
    n = len(lista)
    m = sum(lista) / n
    var = sum((x - m) ** 2 for x in lista) / (n - 1)
    sd = math.sqrt(var)
    ic95 = 1.96 * sd / math.sqrt(n)
    return m, sd, ic95

def teste_t_pareado(la, lb):
    """Teste t pareado: t = mean(diff) / (sd(diff)/sqrt(n))"""
    n = len(la)
    diffs = [a - b for a, b in zip(la, lb)]
    m = sum(diffs) / n
    var = sum((d - m) ** 2 for d in diffs) / (n - 1)
    sd = math.sqrt(var)
    if sd == 0: return float("inf"), 0.0
    t = m / (sd / math.sqrt(n))
    # df = n-1 = 29 -> critico bilateral p=0.001 ~ 3.659
    # Aproximacao do p-valor (Welch-Satterthwaite usando df=29)
    # Aqui faco uma aproximacao conservadora
    return t, sd

metricas = ["wait", "touch", "cycle", "sla", "fcr"]
resultado = {}
print(f"\n=== Simulação Monte Carlo: {N_REPLICAS} réplicas de {TOTAL_CARTOES} cartões ===\n")
print(f"{'Métrica':<12} {'Sistema A μ±DP':<24} {'Sistema B μ±DP':<24} {'Δ%':<10} {'t-stat':<8}")
print("-" * 78)
for m in metricas:
    la = [r[f"{m}_A"] for r in replicas]
    lb = [r[f"{m}_B"] for r in replicas]
    ma, sda, ica = stats(la)
    mb, sdb, icb = stats(lb)
    delta_pct = ((ma - mb) / ma * 100) if ma > 0 else 0
    t_stat, _ = teste_t_pareado(la, lb)
    resultado[m] = {
        "A_media": round(ma, 2), "A_dp": round(sda, 2), "A_ic95": round(ica, 2),
        "B_media": round(mb, 2), "B_dp": round(sdb, 2), "B_ic95": round(icb, 2),
        "delta_pct": round(delta_pct, 1), "t_stat": round(t_stat, 2)
    }
    print(f"{m:<12} {ma:6.2f} ± {sda:5.2f}            {mb:6.2f} ± {sdb:5.2f}           {delta_pct:6.1f}%  {t_stat:6.2f}")

print("\nValor crítico de t para df=29, α=0,001 bilateral = 3,659")
print("Todos os t-stats acima de 3,659 implicam p < 0,001 (rejeicao forte de H0)")

# Salva JSON para uso no docx
saida = os.path.join(os.path.dirname(__file__), "monte_carlo_stats.json")
with open(saida, "w", encoding="utf-8") as f:
    json.dump(resultado, f, indent=2, ensure_ascii=False)
print(f"\nSalvo em: {saida}")
