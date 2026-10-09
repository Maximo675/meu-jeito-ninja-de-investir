/* =====================================================================
   chart.js — GRÁFICO DE LINHA EM SVG (sem bibliotecas)
   ---------------------------------------------------------------------
   Desenha o histórico do bid. Decisões de usabilidade:
   - Linha fina (2px) e grade discreta: o dado é o protagonista.
   - Passar o mouse (ou o dedo) mostra data e valor do dia (tooltip).
   - Teclado: com o gráfico em foco, ← e → percorrem os dias, e o valor
     é anunciado para leitores de tela.
   - Existe uma tabela com os mesmos dados logo abaixo (alternativa
     textual ao gráfico — WCAG 1.1.1).
   ===================================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Cria um elemento SVG com atributos. */
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/**
 * Desenha (ou redesenha) o gráfico dentro de `container`.
 * @param {HTMLElement} container
 * @param {Array<{timestamp:number, bid:number}>} pontos  ordem cronológica
 * @param {string} moeda  código da moeda de referência (ex.: 'BRL')
 */
function desenharGrafico(container, pontos, moeda) {
  // Guarda os dados no próprio elemento: o redimensionamento e os
  // eventos de mouse/teclado leem daqui.
  container._grafico = { pontos, moeda, indice: null };
  container.replaceChildren();

  if (!pontos || pontos.length < 2) {
    const p = document.createElement('p');
    p.className = 'grafico__vazio';
    p.textContent = 'Ainda não há dados suficientes para desenhar o histórico.';
    container.append(p);
    return;
  }

  const largura = Math.max(container.clientWidth, 260);
  const altura = largura < 480 ? 200 : 240;
  const m = { topo: 18, dir: 12, base: 28, esq: 8 }; // margens internas

  const valores = pontos.map((p) => p.bid);
  let min = Math.min(...valores);
  let max = Math.max(...valores);
  const folga = (max - min) * 0.12 || max * 0.01; // evita divisão por zero em série plana
  min -= folga;
  max += folga;

  const x = (i) => m.esq + (i / (pontos.length - 1)) * (largura - m.esq - m.dir);
  const y = (v) => m.topo + (1 - (v - min) / (max - min)) * (altura - m.topo - m.base);

  const svg = svgEl('svg', {
    viewBox: `0 0 ${largura} ${altura}`,
    width: largura,
    height: altura,
    class: 'grafico__svg',
    'aria-hidden': 'true', // a descrição acessível fica no container + tabela
  });

  // --- Grade horizontal com rótulos (4 linhas) ---
  const grade = svgEl('g', { class: 'grafico__grade' });
  // Os rótulos ficam num grupo separado, desenhado DEPOIS da linha, para
  // ficarem por cima dela (com contorno da cor do fundo — ver style.css).
  const rotulos = svgEl('g', { class: 'grafico__grade' });
  for (let i = 0; i < 4; i++) {
    const v = min + ((max - min) * (i + 0.5)) / 4;
    const yy = Math.round(y(v)) + 0.5;
    grade.append(svgEl('line', { x1: m.esq, x2: largura - m.dir, y1: yy, y2: yy }));
    const rotulo = svgEl('text', { x: m.esq, y: yy - 5 });
    rotulo.textContent = formatarValorCompacto(v, moeda);
    rotulos.append(rotulo);
  }
  svg.append(grade);

  // --- Rótulos do eixo X: primeiro, meio e último dia ---
  const eixo = svgEl('g', { class: 'grafico__eixo' });
  const marcas = [0, Math.floor((pontos.length - 1) / 2), pontos.length - 1];
  marcas.forEach((i, n) => {
    const t = svgEl('text', {
      x: x(i),
      y: altura - 8,
      'text-anchor': n === 0 ? 'start' : n === 2 ? 'end' : 'middle',
    });
    t.textContent = formatarDataCurta(pontos[i].timestamp);
    eixo.append(t);
  });
  svg.append(eixo);

  // --- Linha de dados ---
  const d = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.bid).toFixed(1)}`).join(' ');
  svg.append(svgEl('path', { d, class: 'grafico__linha' }));

  // --- Ponto final (valor mais recente) ---
  const ultimo = pontos.length - 1;
  svg.append(svgEl('circle', { cx: x(ultimo), cy: y(pontos[ultimo].bid), r: 4.5, class: 'grafico__ponto' }));
  svg.append(rotulos);

  // --- Camada de hover (mira + ponto) — começa escondida ---
  const mira = svgEl('g', { class: 'grafico__mira', visibility: 'hidden' });
  const miraLinha = svgEl('line', { y1: m.topo - 6, y2: altura - m.base });
  const miraPonto = svgEl('circle', { r: 5.5, class: 'grafico__ponto' });
  mira.append(miraLinha, miraPonto);
  svg.append(mira);

  const tooltip = document.createElement('div');
  tooltip.className = 'grafico__tooltip';
  tooltip.hidden = true;
  tooltip.setAttribute('aria-hidden', 'true');

  container.append(svg, tooltip);

  /** Mostra a mira no índice i (ou esconde se i for null). */
  function marcar(i) {
    container._grafico.indice = i;
    if (i === null) {
      mira.setAttribute('visibility', 'hidden');
      tooltip.hidden = true;
      return;
    }
    const p = pontos[i];
    const cx = x(i);
    const cy = y(p.bid);
    miraLinha.setAttribute('x1', cx);
    miraLinha.setAttribute('x2', cx);
    miraPonto.setAttribute('cx', cx);
    miraPonto.setAttribute('cy', cy);
    mira.setAttribute('visibility', 'visible');

    tooltip.innerHTML = `<span class="grafico__tooltip-data">${formatarDataLonga(p.timestamp)}</span>
      <strong>${formatarValor(p.bid, moeda)}</strong>`;
    tooltip.hidden = false;
    // Mantém o tooltip dentro da área do gráfico
    const tw = tooltip.offsetWidth;
    const left = Math.min(Math.max(cx - tw / 2, 0), largura - tw);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(cy - tooltip.offsetHeight - 14, 0)}px`;
  }
  container._grafico.marcar = marcar;
  container._grafico.indicePorX = (px) => {
    const rel = (px - m.esq) / (largura - m.esq - m.dir);
    return Math.min(pontos.length - 1, Math.max(0, Math.round(rel * (pontos.length - 1))));
  };

  ligarEventosGrafico(container);
}

/**
 * Liga mouse/toque/teclado UMA vez por container (o SVG é recriado a
 * cada desenho, mas o container permanece — por isso os eventos ficam nele).
 */
function ligarEventosGrafico(container) {
  if (container.dataset.eventos) return;
  container.dataset.eventos = 'sim';

  const g = () => container._grafico;

  container.addEventListener('pointermove', (e) => {
    if (!g()?.marcar) return;
    const rect = container.getBoundingClientRect();
    g().marcar(g().indicePorX(e.clientX - rect.left));
  });
  container.addEventListener('pointerleave', () => g()?.marcar?.(null));

  container.addEventListener('keydown', (e) => {
    const dados = g();
    if (!dados?.marcar) return;
    const total = dados.pontos.length;
    let i = dados.indice ?? total - 1;
    if (e.key === 'ArrowLeft') i = Math.max(0, i - 1);
    else if (e.key === 'ArrowRight') i = Math.min(total - 1, i + 1);
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = total - 1;
    else if (e.key === 'Escape') { dados.marcar(null); return; }
    else return;
    e.preventDefault();
    dados.marcar(i);
    const p = dados.pontos[i];
    anunciar(`${formatarDataLonga(p.timestamp)}: ${formatarValor(p.bid, dados.moeda)}`);
  });
  container.addEventListener('blur', () => g()?.marcar?.(null));

  // Redesenha quando a largura muda (girar o celular, redimensionar janela)
  let larguraAnterior = container.clientWidth;
  new ResizeObserver(() => {
    const w = container.clientWidth;
    if (Math.abs(w - larguraAnterior) < 4 || !g()) return;
    larguraAnterior = w;
    requestAnimationFrame(() => desenharGrafico(container, g().pontos, g().moeda));
  }).observe(container);
}
