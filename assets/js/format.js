/* =====================================================================
   format.js — FORMATAÇÃO E LEITURA DE NÚMEROS
   ---------------------------------------------------------------------
   Regra do enunciado: "O aplicativo deverá sempre exibir a referência da
   unidade monetária, por exemplo: 200 BRL".
   Por isso NENHUM valor monetário é escrito na tela sem passar por
   formatarValor(), que sempre devolve "número + código da moeda".
   ===================================================================== */

/** Espaço que não quebra linha: impede que "200" fique numa linha e
 *  "BRL" na outra em telas estreitas. */
const NBSP = ' ';

/**
 * Decide quantas casas decimais mostrar.
 * - Fiat acima de 1: 2 casas (R$ 5,66).
 * - Fiat abaixo de 1: 4 casas, senão 1 BRL em USD viraria "0,18" e
 *   perderia precisão (o valor real é algo como 0,1806).
 * - Cripto: no mínimo 2 e no máximo 8 casas (zeros à direita somem).
 */
function casasDecimais(valor, codigo) {
  const moeda = MOEDAS[codigo];
  if (!moeda || moeda.tipo === 'fiat') {
    return Math.abs(valor) < 1 && valor !== 0 ? { min: 4, max: 4 } : { min: 2, max: 2 };
  }
  return { min: 2, max: moeda.casas };
}

/**
 * Formata um valor monetário no padrão brasileiro + unidade.
 * @example formatarValor(352418.5, 'BRL')  // "352.418,50 BRL"
 * @example formatarValor(0.00284, 'BTC')   // "0,00284 BTC"
 */
function formatarValor(valor, codigo) {
  if (!Number.isFinite(valor)) return `—${NBSP}${codigo}`;
  const { min, max } = casasDecimais(valor, codigo);
  const numero = valor.toLocaleString('pt-BR', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
  return `${numero}${NBSP}${codigo}`;
}

/**
 * Mesma coisa que formatarValor, mas em HTML com número e unidade em
 * <span>s separados (usado nos valores GRANDES da tela). Assim o CSS
 * consegue quebrar a linha entre os dois sem cortar a sigla no meio.
 */
function formatarValorHTML(valor, codigo) {
  const [numero] = formatarValor(valor, codigo).split(NBSP);
  return `<span class="valor__num">${numero}</span> <span class="valor__un">${codigo}</span>`;
}

/** Versão curta para eixos do gráfico: 352 mil BRL, 1,2 mi BRL. */
function formatarValorCompacto(valor, codigo) {
  const opcoes = Math.abs(valor) >= 10000
    ? { notation: 'compact', maximumFractionDigits: 1 }
    : { maximumFractionDigits: Math.abs(valor) < 1 ? 4 : 2 };
  return `${valor.toLocaleString('pt-BR', opcoes)}${NBSP}${codigo}`;
}

/** Percentual sempre com sinal: "+0,66%", "−1,20%", "0,00%". */
function formatarPercentual(pct) {
  if (!Number.isFinite(pct)) return '—';
  const abs = Math.abs(pct).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (pct > 0) return `+${abs}%`;
  if (pct < 0) return `−${abs}%`; // sinal de menos tipográfico (−)
  return `${abs}%`;
}

/** Variação absoluta com sinal e unidade: "+1.204,10 BRL". */
function formatarVariacao(valor, codigo) {
  if (!Number.isFinite(valor)) return `—${NBSP}${codigo}`;
  const sinal = valor > 0 ? '+' : valor < 0 ? '−' : '';
  return sinal + formatarValor(Math.abs(valor), codigo);
}

/** Timestamp (segundos) → "08/10/2026, 18:25:04". */
function formatarDataHora(timestampSeg) {
  return new Date(timestampSeg * 1000).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/** Timestamp (segundos) → "08/10". Usado no eixo do gráfico. */
function formatarDataCurta(timestampSeg) {
  return new Date(timestampSeg * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Timestamp (segundos) → "qui., 08/10/2026". Usado na tabela. */
function formatarDataLonga(timestampSeg) {
  return new Date(timestampSeg * 1000).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

/** Número para colocar de volta no campo de texto (sem unidade). */
function formatarParaCampo(valor) {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 8, useGrouping: false });
}

/**
 * Lê o que o usuário digitou e devolve um número (ou NaN se inválido).
 * Aceita o jeito brasileiro e o internacional:
 *   "0,5" → 0.5 | "1.234,56" → 1234.56 | "1.000" → 1000 | "0.5" → 0.5
 */
function lerNumeroDigitado(texto) {
  let t = String(texto).trim().replace(/\s|BRL|USD|BTC|ETH|R\$/gi, '');
  if (t === '') return NaN;
  if (!/^[\d.,]+$/.test(t)) return NaN; // letras, sinais etc. → inválido

  if (t.includes(',')) {
    // Padrão BR: ponto é milhar, vírgula é decimal
    t = t.replace(/\./g, '').replace(',', '.');
    if ((t.match(/\./g) || []).length > 1) return NaN; // duas vírgulas
  } else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(t)) {
    // "1.000" ou "12.500.000" → pontos de milhar ("0.500" continua decimal)
    t = t.replace(/\./g, '');
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}
