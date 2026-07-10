---
name: spec-fallback-ia-multiprovider
description: Contrato do fallback de IA multi-provider (Groq → NVIDIA) no proxy /api/ai. Cascata de disponibilidade, testável por unidade.
alwaysApply: true
---

# Spec — Fallback de IA multi-provider

> **Fonte da verdade.** Status: **implementado** (2026-07-09) — AC-1 a AC-7 verificados por
> teste de unidade (`npm test`, 13/13) e smoke test end-to-end com fetch mockado. Falta apenas
> a passada com Groq/NVIDIA reais em produção, bloqueada até o Andre configurar
> `NVIDIA_API_KEY` na Vercel (ver `tasks.md`).

## Resumo
`/api/ai` passa a tentar até 2 provedores em cascata (Groq → NVIDIA-Mistral) antes de
reportar erro ao usuário do Ajudante do Mestre, cada falha de disponibilidade (429/5xx/
timeout) do elo atual cai para o próximo; falha de requisição (4xx≠429) não cascateia.

## Critérios de aceite

### AC-1: Sucesso no primeiro elo (caminho feliz, sem regressão)
- **Dado** o proxy `/api/ai` com `GROQ_KEY` configurada e um usuário autenticado dentro do
  rate limit
- **Quando** a Groq responde com sucesso (200)
- **Então** o proxy responde `{ reply, provider: "groq" }` — mesmo comportamento de hoje
  para o campo `reply`; `provider` é aditivo e não quebra clientes que ignoram campos extras.

### AC-2: Groq falha por disponibilidade → cai para NVIDIA
- **Dado** o proxy com `GROQ_KEY` e `NVIDIA_API_KEY` configuradas
- **Quando** a chamada à Groq retorna 429, qualquer 5xx, ou estoura o timeout do elo (erro
  de rede/timeout)
- **Então** o proxy tenta a NVIDIA (`mistralai/mistral-medium-3.5-128b`) em seguida; se
  a NVIDIA responder 200, o proxy responde `{ reply, provider: "nvidia-mistral" }`.

### AC-3: Falha de requisição não cascateia
- **Dado** o proxy com ambas as chaves configuradas
- **Quando** a Groq retorna um 4xx que **não** é 429 (ex.: 400 por payload malformado)
- **Então** o proxy responde o erro imediatamente ao cliente **sem tentar a NVIDIA** — evita
  latência e créditos gastos num erro que se repetiria em todo elo.

### AC-4: Todos os elos falham
- **Dado** o proxy com ambas as chaves configuradas
- **Quando** Groq **e** NVIDIA falham por disponibilidade (429/5xx/timeout em ambos)
- **Então** o proxy responde `503` com uma mensagem amigável (não a mensagem crua de erro de
  nenhum provedor) — o usuário sabe que é temporário, não um bug do app.

### AC-5: Elo sem chave configurada é pulado, não quebra
- **Dado** o proxy com `GROQ_KEY` configurada mas **sem** `NVIDIA_API_KEY`
- **Quando** a Groq falha por disponibilidade
- **Então** o proxy pula o elo NVIDIA (log de aviso, não erro fatal) e responde o erro da
  Groq — comportamento idêntico ao proxy de hoje (antes desta feature), sem quebra por causa
  de uma env var ainda não configurada.

### AC-6: Auth e rate-limit existentes continuam valendo (sem regressão da spec 0004 AC-6)
- **Dado** uma requisição sem `Authorization: Bearer <token>` válido, ou um uid acima do
  rate limit (20 req/min)
- **Quando** chega em `/api/ai`, **antes** de qualquer tentativa na cascata
- **Então** responde `401` (sem token válido) ou `429` (rate limit por uid) exatamente como
  hoje — a cascata só começa depois que auth+rate-limit passam.

### AC-7: Lógica de decisão pura e testada por unidade
- **Dado** os módulos `shouldFallback` e `buildRequestBody` em `src/server/aiFallback.js`
- **Então** existem testes que comprovam: `shouldFallback(429)===true`,
  `shouldFallback(500)===true`, `shouldFallback(503)===true`, `shouldFallback(400)===false`,
  `shouldFallback(200)===false`; e que `buildRequestBody` aplica `extraParams` (ex.:
  `reasoning_effort`) **só** para o elo NVIDIA, nunca para o elo Groq — rodando em `npm test`.

## Matriz de decisão — quando cascatear

| Status/erro do elo atual      | Cascateia para o próximo? | Resposta ao cliente se for o último elo | AC   |
|--------------------------------|----------------------------|--------------------------------------------|------|
| 200 (sucesso)                   | — (retorna já)             | `{ reply, provider }`                       | AC-1 |
| 429 (rate limit do provedor)    | sim                         | 503 amigável                                | AC-2, AC-4 |
| 5xx (erro do provedor)          | sim                         | 503 amigável                                | AC-2, AC-4 |
| timeout / erro de rede          | sim                         | 503 amigável                                | AC-2, AC-4 |
| 4xx ≠ 429 (ex.: 400, 401 do provedor) | **não**               | erro do provedor repassado direto           | AC-3 |
| env var da chave ausente        | pula o elo (nem tenta)      | erro do último elo tentado                  | AC-5 |
| sem auth Firebase válida        | não chega a cascatear       | 401                                         | AC-6 |
| uid acima do rate limit interno | não chega a cascatear       | 429 (do Nexus, não de provedor)             | AC-6 |

## Casos de borda e erros
- Cliente antigo/cacheado ainda manda `model: "llama-3.3-70b-versatile"` no corpo → ignorado
  pelo servidor (a cascata decide o modelo por elo); sem erro, sem quebra.
- `NVIDIA_API_KEY` configurada só depois do deploy (Andre esqueceu no primeiro deploy) → elo
  2 começa a funcionar assim que a env var existir, sem precisar mudar código (AC-5 cobre o
  caso "ausente"; o caso "presente depois" é o mesmo código, só muda o ambiente).
- Ambas as chaves ausentes (`GROQ_KEY` e `NVIDIA_API_KEY`) → mesmo comportamento de erro que
  o proxy já tinha antes desta feature (`500`, "GROQ_KEY não configurada") — não piora.
- Timeout de um elo não derruba a function inteira — cada tentativa usa `AbortSignal.timeout`
  isolado; a falha vira "tenta o próximo", não uma exceção não tratada.

## Fora de escopo
> Vinculante. Não implemente nada aqui.
- 3º elo da cascata (DeepSeek/GLM/MiniMax) — pendente confirmação de ID exato (Q1 do `design.md`).
- Fallback no caminho de dev local direto (`callGemini` sem `API_BASE`).
- Qualquer UI nova para mostrar "qual IA respondeu" — o campo `provider` é só para log/debug.
- Observabilidade/métricas formais.
- Alterar auth ou rate-limit (spec 0004 AC-6 permanece como está).

## Rastreabilidade
- Product: `./product.md`
- Design: `./design.md`
- Domínio: `./domain.md`
- Spec relacionada: `../0004-seguranca-pagamentos/spec.md` (AC-6 — não modificada, apenas
  reafirmada em AC-6 desta spec como "continua valendo").
