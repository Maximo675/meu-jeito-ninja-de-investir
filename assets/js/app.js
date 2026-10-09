/* =====================================================================
   app.js — LÓGICA DA INTERFACE
   ---------------------------------------------------------------------
   Padrão usado: ESTADO → RENDER
     1. Toda informação da tela mora no objeto `estado`.
     2. Eventos (clique, digitação, resposta da API) só ALTERAM o estado.
     3. Depois de alterar, chamamos render(), que redesenha a tela a
        partir do estado. A tela nunca é a "fonte da verdade".
   Isso evita o bug clássico de um pedaço da tela mostrar um par e
   outro pedaço mostrar outro.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. ESTADO
   --------------------------------------------------------------------- */
const estado = {
  par: lerParDaUrl() || PAR_PADRAO, // par selecionado (ex.: 'BTC-BRL')
  cotacoes: {},                    // id do par → cotação normalizada
  status: 'carregando',            // 'carregando' | 'pronto' | 'erro'
  erro: null,                      // ErroApi da última falha
  desatualizado: false,            // true = falhou, mas ainda há dado antigo
  buscando: false,                 // há uma requisição em andamento?
  ultimaAtualizacao: null,         // Date da última resposta com sucesso
  segundosRestantes: INTERVALO_ATUALIZACAO,
  anunciarPar: false,              // anunciar o novo par para leitor de tela?

  conversor: {
    texto: valorPadraoConversor(lerParDaUrl() || PAR_PADRAO),
    invertido: false,              // false: de → para | true: para → de
  },

  historico: {
    dias: DIAS_HISTORICO_PADRAO,
    cache: {},                     // 'BTC-BRL:15' → { pontos, hora }
    status: 'carregando',
    erro: null,
  },
};

/* ---------------------------------------------------------------------
   2. ATALHOS PARA ELEMENTOS DO HTML
   --------------------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const el = {
  refreshTexto: $('refresh-text'),
  refreshPonto: $('refresh-dot'),
  btnAtualizar: $('btn-refresh'),
  paresMissao: $('pares-missao'),
  paresExtras: $('pares-extras'),
  formPares: $('form-pares'),

  cartao: $('cotacao'),
  titulo: $('cotacao-titulo'),
  parCodigo: $('cotacao-par'),
  carregando: $('estado-carregando'),
  erro: $('estado-erro'),
  erroTexto: $('erro-texto'),
  btnTentar: $('btn-tentar'),
  pronto: $('estado-pronto'),
  unidade: $('cotacao-unidade'),
  valor: $('cotacao-valor'),
  variacao: $('cotacao-variacao'),
  ask: $('stat-ask'),
  high: $('stat-high'),
  low: $('stat-low'),
  varBid: $('stat-varbid'),
  data: $('cotacao-data'),
  avisoDesatualizado: $('aviso-desatualizado'),

  convValor: $('conversor-valor'),
  convDe: $('conversor-de'),
  convDeNome: $('conversor-de-nome'),
  convErro: $('conversor-erro'),
  convResultado: $('conversor-resultado'),
  convAtalhos: $('conversor-atalhos'),
  btnInverter: $('btn-inverter'),

  periodo: $('historico-periodo'),
  histResumo: $('historico-resumo'),
  grafico: $('grafico'),
  tabelaCorpo: $('tabela-corpo'),
  tabelaLegenda: $('tabela-legenda'),

  geral: $('geral-lista'),
  anuncio: $('anuncio'),
};

/* ---------------------------------------------------------------------
   3. FUNÇÕES AUXILIARES
   --------------------------------------------------------------------- */

/** Pega o objeto de configuração de um par pelo id.
 *  (declarada com `function` para ser "içada" — o objeto `estado`, lá no
 *  topo, já usa esta função antes desta linha ser lida.) */
function configDoPar(id) {
  return PARES.find((p) => p.id === id);
}

/** Lê o par do endereço (#BTC-USD). Permite favoritar/compartilhar o link. */
function lerParDaUrl() {
  const id = decodeURIComponent(location.hash.slice(1)).toUpperCase();
  return PARES.some((p) => p.id === id) ? id : null;
}

/** Valor inicial do conversor: 1 unidade de cripto ou 200 de moeda comum
 *  (o mesmo "200 BRL" usado como exemplo no enunciado). */
function valorPadraoConversor(id) {
  const { de } = configDoPar(id);
  return MOEDAS[de].tipo === 'cripto' ? '1' : '200';
}

/** Valores rápidos quando o conversor está invertido (entrada em fiat). */
const ATALHOS_FIAT = { BRL: [50, 100, 200, 1000], USD: [10, 50, 100, 500] };

/** Classe de variação: alta, queda ou neutra. */
function classeVariacao(pct) {
  if (pct > 0) return 'alta';
  if (pct < 0) return 'queda';
  return 'neutra';
}

/** Texto da variação com seta (a informação não depende só da cor). */
function textoVariacao(pct, sufixo = 'hoje') {
  const seta = pct > 0 ? '▲' : pct < 0 ? '▼' : '=';
  return `${seta} ${formatarPercentual(pct)} ${sufixo}`.trim();
}

/** Envia uma frase para o leitor de tela (região aria-live). */
function anunciar(frase) {
  el.anuncio.textContent = '';
  // pequeno atraso garante que o leitor perceba a mudança mesmo se a frase repetir
  setTimeout(() => { el.anuncio.textContent = frase; }, 60);
}

/* ---------------------------------------------------------------------
   4. MONTAGEM INICIAL (elementos criados uma vez só)
   --------------------------------------------------------------------- */

/** Cria os botões de rádio do seletor de pares.
 *  Rádios nativos = navegação por setas e leitor de tela de graça. */
function montarSeletor() {
  for (const par of PARES) {
    const label = document.createElement('label');
    label.className = 'par';
    label.innerHTML = `
      <input class="par__radio" type="radio" name="par" value="${par.id}">
      <span class="par__corpo">
        <span class="par__simbolos">
          <span>${par.de}</span>
          <span class="par__seta" aria-hidden="true">→</span>
          <span>${par.para}</span>
        </span>
        <span class="par__nome">${MOEDAS[par.de].nome} em ${MOEDAS[par.para].nome}</span>
        <span class="par__mini" id="mini-${par.id}">—</span>
      </span>`;
    (par.grupo === 'missao' ? el.paresMissao : el.paresExtras).append(label);
  }
}

/** Cria os cartões do painel geral. */
function montarPainelGeral() {
  for (const par of PARES) {
    const li = document.createElement('li');
    li.innerHTML = `
      <button class="resumo" type="button" data-par="${par.id}" id="resumo-${par.id}">
        <span class="resumo__topo">
          <span class="resumo__par">${par.de}<span aria-hidden="true"> → </span><span class="sr-only"> para </span>${par.para}</span>
          ${par.grupo === 'extra' ? '<span class="tag tag--escura">extra</span>' : ''}
        </span>
        <span class="resumo__unidade">1 ${par.de} =</span>
        <span class="resumo__valor">—</span>
        <span class="variacao resumo__variacao"><span class="variacao__icone" aria-hidden="true"></span><span class="variacao__texto">—</span></span>
      </button>`;
    el.geral.append(li);
  }
}

/* ---------------------------------------------------------------------
   5. RENDER — desenha a tela a partir do estado
   --------------------------------------------------------------------- */
function render() {
  renderStatus();
  renderSeletor();
  renderCotacao();
  renderConversor();
  renderGeral();
}

/** Barra superior: quando atualizou e quando atualiza de novo. */
function renderStatus() {
  const s = estado.segundosRestantes;
  let texto;
  let tipo;
  if (estado.buscando) {
    texto = 'Buscando cotações…';
    tipo = 'buscando';
  } else if (estado.status === 'erro' || estado.desatualizado) {
    texto = `Falha na conexão · nova tentativa em ${s} s`;
    tipo = 'erro';
  } else if (estado.ultimaAtualizacao) {
    const hora = estado.ultimaAtualizacao.toLocaleTimeString('pt-BR');
    texto = `Atualizado às ${hora} · próxima em ${s} s`;
    tipo = 'ok';
  } else {
    texto = 'Conectando à API…';
    tipo = 'buscando';
  }
  el.refreshTexto.textContent = texto;
  el.refreshPonto.dataset.tipo = tipo;
  el.btnAtualizar.disabled = estado.buscando;
}

/** Marca o rádio do par atual e mostra o bid em miniatura em cada opção. */
function renderSeletor() {
  for (const radio of el.formPares.elements.par) {
    radio.checked = radio.value === estado.par;
  }
  for (const par of PARES) {
    const c = estado.cotacoes[par.id];
    $(`mini-${par.id}`).textContent = c ? formatarValor(c.bid, par.para) : '—';
  }
}

/** O pergaminho principal com a cotação do par selecionado. */
function renderCotacao() {
  const par = configDoPar(estado.par);
  const c = estado.cotacoes[estado.par];

  el.titulo.textContent = `${MOEDAS[par.de].nome} em ${MOEDAS[par.para].nome}`;
  el.parCodigo.textContent = par.id;

  // Qual dos três estados mostrar?
  const temDado = Boolean(c);
  const mostrar = temDado ? 'pronto' : estado.status === 'erro' ? 'erro' : 'carregando';
  el.carregando.hidden = mostrar !== 'carregando';
  el.erro.hidden = mostrar !== 'erro';
  el.pronto.hidden = mostrar !== 'pronto';
  el.cartao.setAttribute('aria-busy', String(mostrar === 'carregando'));

  if (mostrar === 'erro') {
    el.erroTexto.textContent = estado.erro?.message || 'Não foi possível falar com a API de moedas.';
    return;
  }
  if (!temDado) return;

  // Valor principal: SEMPRE o bid (compra), sempre com a unidade
  el.unidade.textContent = `1 ${par.de}`;
  el.valor.innerHTML = formatarValorHTML(c.bid, par.para);

  const tipo = classeVariacao(c.pctChange);
  el.variacao.className = `variacao variacao--${tipo} variacao--grande`;
  el.variacao.querySelector('.variacao__texto').textContent = textoVariacao(c.pctChange);

  el.ask.textContent = formatarValor(c.ask, par.para);
  el.high.textContent = formatarValor(c.high, par.para);
  el.low.textContent = formatarValor(c.low, par.para);
  el.varBid.textContent = formatarVariacao(c.varBid, par.para);

  el.data.textContent = formatarDataHora(c.timestamp);
  el.data.dateTime = new Date(c.timestamp * 1000).toISOString();
  el.avisoDesatualizado.hidden = !estado.desatualizado;

  document.title = `${formatarValor(c.bid, par.para)} · ${par.id} | Meu jeito ninja de Investir`;

  if (estado.anunciarPar) {
    estado.anunciarPar = false;
    anunciar(`${el.titulo.textContent}: 1 ${par.de} vale ${formatarValor(c.bid, par.para)}, ${textoVariacao(c.pctChange)}.`);
  }
}

/** Calculadora: converte o valor digitado usando o bid. */
function renderConversor() {
  const par = configDoPar(estado.par);
  const { texto, invertido } = estado.conversor;
  const origem = invertido ? par.para : par.de;
  const destino = invertido ? par.de : par.para;

  el.convDe.textContent = origem;
  el.convDeNome.textContent = MOEDAS[origem].nome;
  if (el.convValor.value !== texto) el.convValor.value = texto;

  // Atalhos (valores rápidos)
  const atalhos = invertido ? ATALHOS_FIAT[origem] || [10, 100] : par.atalhos;
  const assinatura = `${origem}:${atalhos.join()}`;
  if (el.convAtalhos.dataset.assinatura !== assinatura) {
    el.convAtalhos.dataset.assinatura = assinatura;
    el.convAtalhos.replaceChildren(...atalhos.map((v) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.valor = formatarParaCampo(v);
      b.textContent = formatarValor(v, origem);
      return b;
    }));
  }

  // Validação do que foi digitado
  const quantia = lerNumeroDigitado(texto);
  const invalido = texto.trim() !== '' && Number.isNaN(quantia);
  el.convValor.setAttribute('aria-invalid', String(invalido));
  el.convErro.textContent = invalido ? 'Digite apenas números positivos, por exemplo 0,5 ou 1.000.' : '';

  const c = estado.cotacoes[estado.par];
  if (!c || invalido || texto.trim() === '') {
    el.convResultado.innerHTML = `<span class="conversor__igual">=</span> —${NBSP}${destino}`;
    return;
  }

  // de → para: multiplica pelo bid | para → de: divide pelo bid
  const convertido = invertido ? quantia / c.bid : quantia * c.bid;
  el.convResultado.innerHTML = `
    <span class="conversor__de">${formatarValor(quantia, origem)}</span>
    <span class="conversor__igual">=</span>
    <span class="conversor__para">${formatarValorHTML(convertido, destino)}</span>
    <span class="conversor__base">Base: 1 ${par.de} = ${formatarValor(c.bid, par.para)} (compra)</span>`;
}

/** Cartões do painel geral. */
function renderGeral() {
  for (const par of PARES) {
    const botao = $(`resumo-${par.id}`);
    const c = estado.cotacoes[par.id];
    botao.setAttribute('aria-current', String(par.id === estado.par));
    botao.querySelector('.resumo__valor').innerHTML = c ? formatarValorHTML(c.bid, par.para) : '—';
    const variacao = botao.querySelector('.resumo__variacao');
    if (c) {
      variacao.className = `variacao resumo__variacao variacao--${classeVariacao(c.pctChange)}`;
      variacao.querySelector('.variacao__texto').textContent = textoVariacao(c.pctChange, '');
    }
  }
}

/** Gráfico + tabela + resumo do histórico. */
function renderHistorico() {
  const par = configDoPar(estado.par);
  const { dias, status, erro } = estado.historico;
  const registro = estado.historico.cache[`${par.id}:${dias}`];

  for (const b of el.periodo.querySelectorAll('button')) {
    b.setAttribute('aria-pressed', String(Number(b.dataset.dias) === dias));
  }
  el.tabelaLegenda.textContent = `Bid diário de ${par.id} nos últimos ${dias} dias`;

  if (!registro) {
    el.histResumo.textContent = status === 'erro'
      ? `Não foi possível carregar o histórico. ${erro?.message || ''}`
      : 'Carregando histórico…';
    el.grafico.removeAttribute('tabindex');
    el.grafico.replaceChildren();
    el.tabelaCorpo.replaceChildren();
    return;
  }

  const pontos = registro.pontos;
  if (pontos.length >= 2) {
    const primeiro = pontos[0].bid;
    const ultimo = pontos[pontos.length - 1].bid;
    const variacaoPeriodo = ((ultimo - primeiro) / primeiro) * 100;
    const min = Math.min(...pontos.map((p) => p.bid));
    const max = Math.max(...pontos.map((p) => p.bid));
    el.histResumo.textContent =
      `Em ${pontos.length} dias, 1 ${par.de} oscilou entre ${formatarValor(min, par.para)} e ` +
      `${formatarValor(max, par.para)} (${textoVariacao(variacaoPeriodo, 'no período')}).`;
  } else {
    el.histResumo.textContent = 'Poucos dados para este período.';
  }

  // Gráfico focável para navegação por teclado
  el.grafico.tabIndex = 0;
  el.grafico.setAttribute('role', 'group');
  el.grafico.setAttribute('aria-label',
    `Gráfico do bid de ${par.id}. ${el.histResumo.textContent} Use as setas esquerda e direita para percorrer os dias.`);
  desenharGrafico(el.grafico, pontos, par.para);

  // Tabela: mais recente primeiro (é o que a pessoa procura antes)
  el.tabelaCorpo.replaceChildren(...[...pontos].reverse().map((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${formatarDataLonga(p.timestamp)}</td><td>${formatarValor(p.bid, par.para)}</td>`;
    return tr;
  }));
}

/* ---------------------------------------------------------------------
   6. AÇÕES (chamam a API e atualizam o estado)
   --------------------------------------------------------------------- */

/** Busca as cotações de TODOS os pares em uma requisição só. */
async function carregarCotacoes() {
  if (estado.buscando) return;
  estado.buscando = true;
  if (!estado.ultimaAtualizacao) estado.status = 'carregando';
  render();

  try {
    const { cotacoes } = await buscarCotacoes(PARES.map((p) => p.id));
    Object.assign(estado.cotacoes, cotacoes);
    estado.status = 'pronto';
    estado.erro = null;
    estado.desatualizado = false;
    estado.ultimaAtualizacao = new Date();
  } catch (erro) {
    console.warn('[CryptoDattebayo] Falha ao buscar cotações:', erro);
    estado.erro = erro;
    // Se já temos dados, continuamos mostrando-os com um aviso (melhor
    // do que apagar a tela inteira por causa de uma falha momentânea).
    if (Object.keys(estado.cotacoes).length) estado.desatualizado = true;
    else estado.status = 'erro';
  } finally {
    estado.buscando = false;
    estado.segundosRestantes = INTERVALO_ATUALIZACAO;
    render();
  }
}

/** Busca o histórico do par atual (com cache de 10 minutos). */
async function carregarHistorico() {
  const id = estado.par;
  const dias = estado.historico.dias;
  const chave = `${id}:${dias}`;
  const emCache = estado.historico.cache[chave];
  if (emCache && Date.now() - emCache.hora < 10 * 60 * 1000) {
    renderHistorico();
    return;
  }

  estado.historico.status = 'carregando';
  renderHistorico();
  try {
    const pontos = await buscarHistorico(id, dias);
    estado.historico.cache[chave] = { pontos, hora: Date.now() };
    estado.historico.status = 'pronto';
  } catch (erro) {
    console.warn('[CryptoDattebayo] Falha ao buscar histórico:', erro);
    estado.historico.status = 'erro';
    estado.historico.erro = erro;
  }
  // Só desenha se a pessoa ainda estiver no mesmo par/período
  if (estado.par === id && estado.historico.dias === dias) renderHistorico();
}

/** Troca o par selecionado (vindo do rádio, do painel geral ou da URL). */
function selecionarPar(id, { rolar = false } = {}) {
  if (!configDoPar(id)) return;
  if (id === estado.par) {
    if (rolar) irParaPainel();
    return;
  }
  const anterior = configDoPar(estado.par);
  const novo = configDoPar(id);

  estado.par = id;
  estado.anunciarPar = true;
  // Mantém o valor digitado se a moeda de origem continua a mesma
  if (anterior.de !== novo.de || estado.conversor.invertido) {
    estado.conversor = { texto: valorPadraoConversor(id), invertido: false };
  }
  history.replaceState(null, '', `#${id}`);

  render();
  carregarHistorico();

  if (rolar) irParaPainel();
}

/** Rola até o pergaminho e move o foco para lá (quem usa teclado ou
 *  leitor de tela "vai junto" com a rolagem). */
function irParaPainel() {
  const painel = $('painel');
  painel.scrollIntoView({ behavior: preferirMovimento() ? 'smooth' : 'auto' });
  painel.focus({ preventScroll: true });
}

/** Respeita quem pediu "reduzir movimento" no sistema operacional. */
const preferirMovimento = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------------
   7. EVENTOS
   --------------------------------------------------------------------- */
function ligarEventos() {
  // Seletor de pares (rádios)
  el.formPares.addEventListener('change', (e) => {
    if (e.target.name === 'par') selecionarPar(e.target.value);
  });
  el.formPares.addEventListener('submit', (e) => e.preventDefault());

  // Painel geral
  el.geral.addEventListener('click', (e) => {
    const botao = e.target.closest('[data-par]');
    if (botao) selecionarPar(botao.dataset.par, { rolar: true });
  });

  // Atualizar manualmente / tentar de novo
  el.btnAtualizar.addEventListener('click', () => { carregarCotacoes(); carregarHistorico(); });
  el.btnTentar.addEventListener('click', () => { carregarCotacoes(); carregarHistorico(); });

  // Conversor
  el.convValor.addEventListener('input', () => {
    estado.conversor.texto = el.convValor.value;
    renderConversor();
  });
  el.btnInverter.addEventListener('click', () => {
    const par = configDoPar(estado.par);
    const c = estado.cotacoes[estado.par];
    const quantia = lerNumeroDigitado(estado.conversor.texto);
    // Ao inverter, o resultado atual vira a nova entrada (como numa calculadora de câmbio)
    if (c && Number.isFinite(quantia)) {
      const convertido = estado.conversor.invertido ? quantia / c.bid : quantia * c.bid;
      const destino = estado.conversor.invertido ? par.de : par.para;
      const casas = MOEDAS[destino].tipo === 'cripto' ? 8 : 2;
      estado.conversor.texto = formatarParaCampo(Number(convertido.toFixed(casas)));
    }
    estado.conversor.invertido = !estado.conversor.invertido;
    renderConversor();
    anunciar(`Convertendo de ${el.convDeNome.textContent} agora.`);
  });
  el.convAtalhos.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-valor]');
    if (!chip) return;
    estado.conversor.texto = chip.dataset.valor;
    renderConversor();
  });

  // Período do histórico
  el.periodo.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dias]');
    if (!b) return;
    estado.historico.dias = Number(b.dataset.dias);
    carregarHistorico();
  });

  // Voltar/avançar do navegador ou link com #PAR
  window.addEventListener('hashchange', () => {
    const id = lerParDaUrl();
    if (id) selecionarPar(id);
  });

  // Atualizar quando a aba volta a ficar visível e os dados estão velhos
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && estado.segundosRestantes <= 0) carregarCotacoes();
  });
}

/** Contagem regressiva da atualização automática (pausa com a aba oculta,
 *  para não gastar requisições à toa). */
function iniciarRelogio() {
  setInterval(() => {
    if (document.hidden || estado.buscando) return;
    estado.segundosRestantes = Math.max(0, estado.segundosRestantes - 1);
    if (estado.segundosRestantes === 0) carregarCotacoes();
    else renderStatus();
  }, 1000);
}

/* ---------------------------------------------------------------------
   8. INÍCIO
   --------------------------------------------------------------------- */
montarSeletor();
montarPainelGeral();
ligarEventos();
render();
carregarCotacoes();
carregarHistorico();
iniciarRelogio();
