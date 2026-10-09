# Checklist de requisitos — Meu jeito ninja de Investir

Cada exigência do enunciado e onde ela foi atendida no código.

## Requisitos do enunciado

| # | Requisito | Status | Onde |
|---|-----------|:------:|------|
| 1 | Aplicação web da empresa **CryptoDattebayo** | ✅ | `index.html` — marca no cabeçalho, hero e rodapé |
| 2 | Site com o nome **"Meu jeito ninja de Investir"** | ✅ | `index.html` — `<title>` e `<h1 id="titulo-site">` |
| 3 | Acompanhar a cotação de **BTC, ETH, BRL e USD** | ✅ | `assets/js/config.js` — objetos `MOEDAS` e `PARES` |
| 4 | Consultar a **AwesomeAPI** | ✅ | `assets/js/api.js` — `buscarCotacoes()` (`/json/last/…`) e `buscarHistorico()` (`/json/daily/…`) |
| 5 | Naruto **escolhe as moedas de comparação**: BTC-BRL, BTC-USD e BRL-USD | ✅ | `index.html` (`#form-pares`) + `app.js` → `montarSeletor()` e `selecionarPar()` |
| 6 | **Sempre exibir a unidade monetária** (ex.: `200 BRL`) | ✅ | `assets/js/format.js` → `formatarValor()` e `formatarValorHTML()`; usadas em **todos** os valores da tela |
| 7 | Usar o **bid (compra)** como referência de valor | ✅ | `app.js` → `renderCotacao()` (valor principal = `c.bid`, etiqueta "compra · bid") e `renderConversor()` (conversão = quantia × bid) |

## Extras (além do pedido)

| Extra | Onde |
|-------|------|
| Pares com Ethereum (ETH-BRL, ETH-USD), marcados como "extra" | `config.js` → `PARES` (grupo `extra`) |
| Calculadora de conversão nos dois sentidos, com atalhos | `index.html` (`.conversor`) + `app.js` → `renderConversor()` |
| Gráfico do histórico (7/15/30 dias) com tabela equivalente | `chart.js` + `app.js` → `renderHistorico()` |
| Painel com todos os pares | `app.js` → `montarPainelGeral()` / `renderGeral()` |
| Atualização automática a cada 60 s com contagem regressiva | `app.js` → `iniciarRelogio()` / `renderStatus()` |
| Estados de carregamento, erro e dado desatualizado | `index.html` (`#estado-*`) + `app.js` → `carregarCotacoes()` |
| Par salvo na URL (`#BTC-USD`) | `app.js` → `lerParDaUrl()` |
| Responsivo (celular, tablet, desktop) | `style.css` — seção "Responsivo" |
| Acessibilidade WCAG 2.1 AA | README, seção 7; `tools/contraste.py` |
| Heurísticas de Nielsen documentadas | README, seção 6 |

## Conferência rápida antes de entregar

- [x] Abre com dois cliques em `index.html` e com o Live Server
- [x] Nenhum erro no console (F12)
- [x] Os 3 pares do enunciado funcionam
- [x] Todo valor aparece com a sigla da moeda
- [x] Valor principal é o `bid`
- [x] Funciona no celular (sem rolagem lateral em 380 px)
- [x] Navegável só pelo teclado
- [x] Contraste aprovado (28/28)
