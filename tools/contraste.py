"""Verifica o contraste (WCAG 2.1) das combinações de cor usadas no projeto.
Lê os valores direto de assets/css/tokens.css. Rode: python tools/contraste.py
"""
import re
from pathlib import Path

css = (Path(__file__).resolve().parent.parent / 'assets/css/tokens.css').read_text(encoding='utf-8')
T = dict(re.findall(r'--([\w-]+):\s*(#[0-9a-fA-F]{6})', css))

def lum(h):
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def razao(a, b):
    l1, l2 = sorted((lum(a), lum(b)), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)

# (texto, fundo, mínimo exigido, onde aparece)
PARES = [
    ('text', 'bg', 4.5, 'texto principal'), ('text', 'surface', 4.5, 'texto em cartão'),
    ('text', 'surface-2', 4.5, 'tooltip / unidade'), ('text-muted', 'bg', 4.5, 'texto secundário'),
    ('text-muted', 'surface', 4.5, 'texto secundário em cartão'), ('text-muted', 'surface-2', 4.5, 'data no tooltip'),
    ('laranja-texto', 'bg', 4.5, 'kicker / links'), ('laranja-texto', 'surface', 4.5, 'setas, links'),
    ('laranja-texto', 'surface-2', 4.5, 'unidade do campo'), ('laranja-tinta', 'laranja', 4.5, 'texto no botão laranja'),
    ('tinta', 'papel', 4.5, 'texto do pergaminho'), ('tinta-suave', 'papel', 4.5, 'texto secundário do pergaminho'),
    ('tinta-suave', 'papel-sombra', 4.5, 'texto na borda escura do papel'),
    ('papel', 'tinta', 4.5, 'etiqueta compra·bid'), ('alta-papel', 'papel', 4.5, 'alta no pergaminho'),
    ('queda-papel', 'papel', 4.5, 'queda no pergaminho'), ('alta', 'surface', 4.5, 'alta no cartão'),
    ('queda', 'surface', 4.5, 'queda no cartão'), ('neutra', 'surface', 4.5, 'estável no cartão'),
    ('alta', 'bg', 4.5, 'alta no fundo'), ('queda', 'bg', 4.5, 'queda / erro no campo'),
    ('border-strong', 'surface', 3.0, 'contorno de controles (1.4.11)'), ('border-strong', 'bg', 3.0, 'contorno do campo'),
    ('laranja', 'surface', 3.0, 'linha do gráfico / seleção'), ('foco', 'bg', 3.0, 'anel de foco'),
    ('foco', 'surface', 3.0, 'anel de foco em cartão'), ('text', 'bg-alt', 4.5, 'texto no painel geral'),
    ('text-muted', 'bg-alt', 4.5, 'secundário no painel geral'),
]

falhas = 0
for fg, bg, minimo, onde in PARES:
    r = razao(T[fg], T[bg])
    ok = r >= minimo
    falhas += not ok
    print(f"{'OK  ' if ok else 'FALHA'} {r:5.2f}:1 (mín {minimo}) {fg:>14} sobre {bg:<13} {onde}")
print(f'\n{len(PARES) - falhas}/{len(PARES)} combinações aprovadas')
