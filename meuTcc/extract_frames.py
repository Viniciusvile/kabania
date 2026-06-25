# -*- coding: utf-8 -*-
"""Extrai frames-chave do GIF para inspecao."""
from PIL import Image
import os

GIF = r"C:\Users\vinic\Desktop\kabania\meuTcc\TCC_Animacao_MonteCarlo.gif"
OUT_DIR = os.path.join(os.path.dirname(GIF), "frames_anim")
os.makedirs(OUT_DIR, exist_ok=True)

im = Image.open(GIF)
total = im.n_frames
print(f"Total frames: {total}")
# Frames-chave: 15 (cena1), 55 (cena2), 110 (cena3), 165 (cena4), 200 (cena5)
chaves = [15, 55, 110, 165, 200]
for i in chaves:
    im.seek(i)
    out = os.path.join(OUT_DIR, f"frame_{i:03d}.png")
    im.convert("RGB").save(out)
    print(f"OK -> {out}")
