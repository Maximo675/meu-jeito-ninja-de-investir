"""Gera assets/css/icones.css embutindo os SVGs de assets/img como data URI.
Rode da raiz do projeto:  python tools/gerar-icones.py
"""
import urllib.parse
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

def uri(nome):
    svg = (RAIZ / 'assets/img' / nome).read_text(encoding='utf-8')
    return 'data:image/svg+xml,' + urllib.parse.quote(svg, safe=' =:/,.-')

css = f'''/* =====================================================================
   icones.css — SÍMBOLOS VETORIAIS (folha de Konoha e selo)
   ---------------------------------------------------------------------
   ARQUIVO GERADO por tools/gerar-icones.py — não edite à mão.

   Os símbolos foram vetorizados a partir das imagens fornecidas e
   embutidos aqui como "data URI".
   Por que embutir? O Chrome bloqueia `mask-image` apontando para arquivo
   local quando a página é aberta direto do disco (file://), por regra de
   CORS. Embutido, o ícone funciona em qualquer cenário.
   Os arquivos originais estão em assets/img/*.svg.

   Uso: <span class="icon icon--folha"></span>
   O ícone herda a COR do texto (currentColor) e o TAMANHO da fonte (1em).
   ===================================================================== */

:root {{
  --mask-folha: url("{uri('folha-konoha.svg')}");
  --mask-selo: url("{uri('selo.svg')}");
}}

.icon {{
  display: inline-block;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  background-color: currentColor;
  -webkit-mask: var(--mask) center / contain no-repeat;
          mask: var(--mask) center / contain no-repeat;
}}
.icon--folha {{ --mask: var(--mask-folha); }}
.icon--selo  {{ --mask: var(--mask-selo); }}

/* Modo de alto contraste do Windows: força a cor do texto do sistema */
@media (forced-colors: active) {{
  .icon {{ background-color: CanvasText; forced-color-adjust: none; }}
}}
'''
(RAIZ / 'assets/css/icones.css').write_text(css, encoding='utf-8')
print('icones.css gerado:', len(css), 'bytes')
