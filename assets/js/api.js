/* =====================================================================
   api.js — COMUNICAÇÃO COM A AWESOMEAPI
   ---------------------------------------------------------------------
   Este é o ÚNICO arquivo que conhece URLs e o formato bruto da API.
   O resto da aplicação recebe objetos já "limpos" (números de verdade,
   timestamps em segundos, nomes em português).

   Endpoints usados (documentação: https://docs.awesomeapi.com.br/api-de-moedas):
     GET /json/last/BTC-BRL,BTC-USD,...   → última cotação de cada par
     GET /json/daily/BTC-BRL/15           → fechamento dos últimos 15 dias
   ===================================================================== */

/**
 * Erro com "tipo" para a interface conseguir mostrar uma mensagem útil
 * (heurística de Nielsen nº 9: ajudar o usuário a reconhecer e se
 * recuperar de erros — a mensagem diz O QUE houve, não só "erro").
 */
class ErroApi extends Error {
  /** @param {'rede'|'tempo'|'limite'|'nao-encontrado'|'servidor'|'formato'} tipo */
  constructor(tipo, mensagem, status = null) {
    super(mensagem);
    this.name = 'ErroApi';
    this.tipo = tipo;
    this.status = status;
  }
}

/** Mensagens amigáveis para cada tipo de erro. */
const MENSAGENS_ERRO = {
  rede: 'Sem conexão com a internet ou a API está fora do ar. Verifique sua rede.',
  tempo: 'A API demorou demais para responder. Tente novamente em instantes.',
  limite: 'Muitas consultas em pouco tempo. Aguarde um minuto e tente de novo.',
  'nao-encontrado': 'A API não reconheceu este par de moedas.',
  servidor: 'A API respondeu com um erro interno. Tente novamente em instantes.',
  formato: 'A API respondeu em um formato inesperado.',
};

/**
 * fetch + tempo limite + tradução de erros HTTP para ErroApi.
 * @param {string} url
 * @returns {Promise<any>} JSON já convertido
 */
async function buscarJson(url) {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_API);

  let resposta;
  try {
    resposta = await fetch(url, { signal: controle.signal, cache: 'no-store' });
  } catch (erro) {
    const tipo = erro.name === 'AbortError' ? 'tempo' : 'rede';
    throw new ErroApi(tipo, MENSAGENS_ERRO[tipo]);
  } finally {
    clearTimeout(timer);
  }

  if (!resposta.ok) {
    const s = resposta.status;
    const tipo = s === 404 ? 'nao-encontrado' : s === 429 ? 'limite' : 'servidor';
    throw new ErroApi(tipo, MENSAGENS_ERRO[tipo], s);
  }

  try {
    return await resposta.json();
  } catch {
    throw new ErroApi('formato', MENSAGENS_ERRO.formato);
  }
}

/** A API devolve tudo como texto ("5.6609"); aqui vira número. */
const num = (v) => Number.parseFloat(v);

/** Alguns endpoints mandam o timestamp em milissegundos; padronizamos em segundos. */
const emSegundos = (ts) => {
  const n = Number(ts);
  return n > 1e12 ? Math.round(n / 1000) : n;
};

/**
 * Converte o objeto bruto da API no formato usado pela aplicação.
 * Exemplo bruto: { code:"USD", codein:"BRL", bid:"5.6609", ask:"5.6616", ... }
 */
function normalizarCotacao(bruto) {
  const cotacao = {
    de: bruto.code,
    para: bruto.codein,
    nome: bruto.name,
    bid: num(bruto.bid),         // COMPRA — valor de referência pedido no enunciado
    ask: num(bruto.ask),         // venda
    high: num(bruto.high),       // máxima do dia
    low: num(bruto.low),         // mínima do dia
    varBid: num(bruto.varBid),   // variação absoluta do bid
    pctChange: num(bruto.pctChange), // variação percentual
    timestamp: emSegundos(bruto.timestamp),
  };
  if (!Number.isFinite(cotacao.bid)) throw new ErroApi('formato', MENSAGENS_ERRO.formato);
  return cotacao;
}

/**
 * Busca a última cotação de vários pares em UMA requisição.
 * Se a chamada combinada falhar porque um dos pares não existe (404),
 * tenta par a par para não perder os que funcionam.
 *
 * @param {string[]} ids  ex.: ['BTC-BRL', 'BRL-USD']
 * @returns {Promise<{cotacoes: Object<string, object>, falhas: string[]}>}
 */
async function buscarCotacoes(ids) {
  try {
    const dados = await buscarJson(`${API_BASE}/last/${ids.join(',')}`);
    const cotacoes = {};
    const falhas = [];
    for (const id of ids) {
      const chave = id.replace('-', ''); // a API responde com a chave "BTCBRL"
      if (dados && dados[chave]) cotacoes[id] = normalizarCotacao(dados[chave]);
      else falhas.push(id);
    }
    if (Object.keys(cotacoes).length === 0) throw new ErroApi('formato', MENSAGENS_ERRO.formato);
    return { cotacoes, falhas };
  } catch (erro) {
    if (!(erro instanceof ErroApi) || erro.tipo !== 'nao-encontrado' || ids.length === 1) throw erro;

    // Plano B: um par por requisição
    const resultados = await Promise.allSettled(ids.map((id) => buscarCotacoes([id])));
    const cotacoes = {};
    const falhas = [];
    resultados.forEach((r, i) => {
      if (r.status === 'fulfilled') Object.assign(cotacoes, r.value.cotacoes);
      else falhas.push(ids[i]);
    });
    if (Object.keys(cotacoes).length === 0) throw erro;
    return { cotacoes, falhas };
  }
}

/**
 * Histórico diário de um par, do mais antigo para o mais recente.
 * @param {string} id   ex.: 'BTC-BRL'
 * @param {number} dias ex.: 15
 * @returns {Promise<Array<{timestamp:number, bid:number, high:number, low:number}>>}
 */
async function buscarHistorico(id, dias) {
  const dados = await buscarJson(`${API_BASE}/daily/${id}/${dias}`);
  if (!Array.isArray(dados)) throw new ErroApi('formato', MENSAGENS_ERRO.formato);

  return dados
    .map((d) => ({
      timestamp: emSegundos(d.timestamp),
      bid: num(d.bid),
      high: num(d.high),
      low: num(d.low),
    }))
    .filter((d) => Number.isFinite(d.bid) && Number.isFinite(d.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);
}
