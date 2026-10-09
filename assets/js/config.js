/* =====================================================================
   config.js — DADOS FIXOS DA APLICAÇÃO
   ---------------------------------------------------------------------
   Tudo o que é "configuração" fica aqui, separado da lógica.
   Para adicionar um par novo basta incluir um objeto em PARES — o
   seletor, o painel geral e o conversor se adaptam sozinhos.
   ===================================================================== */

/** Endereço base da AwesomeAPI (sempre HTTPS para evitar "mixed content"). */
const API_BASE = 'https://economia.awesomeapi.com.br/json';

/** Intervalo de atualização automática, em segundos.
 *  A API guarda as cotações em cache por 1 minuto para quem não usa
 *  chave, então atualizar mais rápido do que isso não traria dado novo. */
const INTERVALO_ATUALIZACAO = 60;

/** Tempo máximo de espera por uma resposta da API, em milissegundos. */
const TEMPO_LIMITE_API = 10000;

/** Período padrão do gráfico de histórico, em dias. */
const DIAS_HISTORICO_PADRAO = 15;

/** Informações de cada moeda: nome por extenso e casas decimais.
 *  - Fiat (BRL, USD): 2 casas, como em qualquer extrato bancário.
 *  - Cripto (BTC, ETH): até 8 casas (1 satoshi = 0,00000001 BTC). */
const MOEDAS = {
  BTC: { nome: 'Bitcoin',          tipo: 'cripto', casas: 8 },
  ETH: { nome: 'Ethereum',         tipo: 'cripto', casas: 8 },
  BRL: { nome: 'Real Brasileiro',  tipo: 'fiat',   casas: 2 },
  USD: { nome: 'Dólar Americano',  tipo: 'fiat',   casas: 2 },
};

/** Pares de comparação.
 *  - id:      formato usado na URL da API (ex.: BTC-BRL)
 *  - de/para: moeda cotada e moeda de referência
 *  - grupo:   'missao' = exigido no enunciado; 'extra' = bônus com ETH
 *  - atalhos: valores rápidos do conversor (na moeda "de") */
const PARES = [
  { id: 'BTC-BRL', de: 'BTC', para: 'BRL', grupo: 'missao', atalhos: [0.001, 0.01, 0.1, 1] },
  { id: 'BTC-USD', de: 'BTC', para: 'USD', grupo: 'missao', atalhos: [0.001, 0.01, 0.1, 1] },
  { id: 'BRL-USD', de: 'BRL', para: 'USD', grupo: 'missao', atalhos: [50, 100, 200, 1000] },
  { id: 'ETH-BRL', de: 'ETH', para: 'BRL', grupo: 'extra',  atalhos: [0.01, 0.1, 0.5, 1] },
  { id: 'ETH-USD', de: 'ETH', para: 'USD', grupo: 'extra',  atalhos: [0.01, 0.1, 0.5, 1] },
];

/** Par aberto na primeira visita. */
const PAR_PADRAO = 'BTC-BRL';
