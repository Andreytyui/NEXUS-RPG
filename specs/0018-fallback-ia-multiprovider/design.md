---
name: design
description: Technical Design Doc — pipeline de fallback multi-provider do proxy de IA (Groq → NVIDIA), pure module testável + orquestração no serverless. Puxe ao implementar.
alwaysApply: false
---

# Technical Design Doc — Fallback de IA multi-provider

> **Tier:** arquitetural · **Status:** rascunho (aguardando aprovação do Andre)
> **Autor:** Claude · **Revisores:** Andre · **Data:** 2026-07-09
> Responde: **como** no nível de sistema. **Aprovação obrigatória antes de implementar.**

## Links e artefatos

| Artefato                 | Onde          | Link                                     |
|--------------------------|---------------|-------------------------------------------|
| Spec · Product           | repositório   | `./spec.md` · `./product.md`               |
| Proxy de IA atual        | repositório   | `api/ai.js`, `api/_lib.js`                 |
| Cliente do proxy         | repositório   | `src/App.jsx` (`callGemini`, ~L5608)       |
| Spec relacionada         | repositório   | `specs/0004-seguranca-pagamentos/spec.md` (AC-6 — auth do proxy, não alterada aqui) |

## Contexto da funcionalidade

`/api/ai` (Vercel serverless, `api/ai.js`) hoje é um proxy autenticado para **um único
provedor**: Groq (`llama-3.3-70b-versatile`). A chave `GROQ_KEY` fica só no servidor; o
cliente (`callGemini` em `App.jsx`) manda `{ messages, model, temperature, max_tokens }` e
recebe `{ reply }`. Auth (Firebase ID token) + rate limit por uid (20 req/min) já existem
(spec 0004 AC-6) e **não mudam**.

Se a Groq falhar (rate limit da conta, outage, degradação), o Ajudante do Mestre fica
totalmente fora do ar — não há segundo provedor. A NVIDIA disponibiliza endpoints gratuitos
OpenAI-compatíveis (`integrate.api.nvidia.com/v1/chat/completions`) numa **conta separada**,
o que os torna um fallback de disponibilidade real (não cai junto com um rate-limit da Groq).

**Restrição de teste descoberta e verificada nesta sessão** (não presumida): o Jest do CRA
tem `roots: ['<rootDir>/src']` **hardcoded** em `node_modules/react-scripts/scripts/utils/
createJestConfig.js` — `testMatch` é sobrescrevível via `package.json`, mas `roots` não está
na lista de chaves suportadas. Ou seja, **um teste em `api/__tests__/` nunca seria descoberto**
pelo `npm test` atual sem ejetar ou adicionar uma 2ª config de Jest (o que contraria o
precedente "zero deps novas" já decidido na spec 0017). Por isso a lógica pura de decisão do
fallback mora em `src/server/` (não em `api/`) — ver "Arquitetura base" abaixo.

## Goals / Non-goals

**Goals**
- O proxy tenta até N provedores em cascata; cada falha de **disponibilidade** (429, 5xx,
  timeout/erro de rede) cai para o próximo; falha de **requisição** (4xx ≠ 429) não cascateia
  (é bug de config/input, repetiria em todo provedor — falhar rápido é melhor).
- Contrato de resposta ao cliente **inalterado no caminho feliz** (`{ reply }`), com campo
  `provider` adicional (aditivo, não quebra clientes que ignoram campos extras).
- Lógica de decisão pura e testada por unidade (padrão já usado em `themes/motion.js`, spec 0017).
- Zero dependências novas (mesma disciplina da spec 0017).

**Non-goals**
- Fallback no caminho de dev local direto (`callGemini` sem `API_BASE`) — ver `product.md`.
- Roteamento por qualidade/custo de resposta — é fallback de disponibilidade, não seleção.
- Observabilidade formal (dashboard) — fica para quando o Nexus tiver analytics.
- Adicionar o 3º elo (ex.: DeepSeek) **nesta onda** — motivo em "Questões em aberto".

## Glossário (da funcionalidade)

| Termo                | Descrição                                                              |
|-----------------------|-------------------------------------------------------------------------|
| Cascata de provedores | Lista ordenada de provedores de IA que o proxy tenta em sequência       |
| Elo (da cascata)      | Um provedor+modelo específico na cascata (ex.: "Groq", "NVIDIA-Mistral")|
| Falha de disponibilidade | 429 (rate limit), 5xx, timeout ou erro de rede — dispara o próximo elo |
| Falha de requisição   | 4xx ≠ 429 — não cascateia, retorna erro direto (repetiria em todo elo)  |

## Design proposto

### Componentes

1. **`src/server/aiFallback.js`** (novo, puro, **CommonJS** — `module.exports`, não ESM).
   Zero I/O, zero `fetch`, zero acesso a `process.env` dentro das funções exportadas (env é
   lido só na orquestração, em `api/ai.js`). CommonJS por dois motivos verificados: (a) é o
   estilo já usado por `api/_lib.js`/`api/ai.js`, que farão `require()` direto deste arquivo
   sem passar por bundler/Babel — Vercel roda essas functions como Node puro; (b) evita
   qualquer dependência do comportamento de transpilação ESM do builder da Vercel para
   arquivos fora de `api/`, que não está documentado/testado neste projeto.
   Exporta:
   - `PROVIDER_CHAIN` — array ordenado de `{ id, url, keyEnv, model, extraParams, timeoutMs }`.
   - `shouldFallback(status)` — `(status) => status === 429 || status >= 500`.
   - `buildRequestBody(provider, { messages, temperature, max_tokens })` — monta o payload
     específico do provedor (aplica `provider.extraParams`, ex.: `reasoning_effort` só na
     NVIDIA — a Groq rejeitaria o campo).

2. **`api/ai.js`** (modificado) — o miolo do `fetch` único vira um laço pela `PROVIDER_CHAIN`:
   para cada elo, pula se `process.env[provider.keyEnv]` não estiver setada (loga aviso, não
   quebra — permite configurar a NVIDIA depois sem redeploy quebrado); chama com
   `AbortSignal.timeout(provider.timeoutMs)`; em erro de rede/timeout ou `shouldFallback(status)`
   → tenta o próximo; em sucesso → retorna `{ reply, provider: provider.id }`; em 4xx≠429 →
   retorna o erro imediatamente (não cascateia). Se todos os elos falharem → `503` com
   mensagem amigável. Auth + rate-limit (spec 0004 AC-6) **envolvem o laço inteiro**, sem
   mudança de comportamento.

3. **Env var nova:** `NVIDIA_API_KEY` (Vercel, server-side apenas — nunca no cliente).
   Documentada em `.env.example` junto das demais.

4. **Cliente (`callGemini`)** — **sem alteração obrigatória**. O `model` que ele já manda no
   corpo passa a ser **ignorado pelo servidor** (a cascata decide o modelo por elo); isso é
   retrocompatível porque hoje esse campo sempre valia o mesmo literal que já é o elo 1.
   Cleanup opcional (task não-bloqueante): remover o campo do corpo enviado, já que não tem
   mais efeito.

### Cascata da MVP (Onda 1 desta feature)

```
1. Groq · llama-3.3-70b-versatile          (já em produção, GROQ_KEY existente)
2. NVIDIA · mistralai/mistral-medium-3.5-128b (confirmado por Andre; reasoning_effort:"low")
```

**Só 2 elos nesta onda** — ver "Questões em aberto" (Q1) sobre o 3º elo.

## Cobertura dos 5 eixos

### 1. Tech stack
Nenhuma dependência nova (mesma disciplina da spec 0017). Usa `fetch`/`AbortSignal.timeout`
nativos do runtime Node da Vercel — já usados hoje em `api/ai.js` e `api/_lib.js`.

### 2. Arquitetura base
**Desvio documentado e intencional** da regra de camadas do `CLAUDE.md`: o módulo puro
`src/server/aiFallback.js` mora em `src/` (árvore do app React) mas é consumido por `api/`
(fronteira serverless, fora do app React) — puramente para ser descoberto pelo `roots` fixo
do Jest do CRA (ver "Contexto"). Não é `domain/` (não é regra de jogo) nem `themes/` — é
infraestrutura de resiliência do proxy de IA, sem I/O, testável isoladamente. `api/ai.js`
continua sendo a única borda que fala com serviços externos (Groq/NVIDIA) e com Firebase Auth.

### 3. Infra
**Recurso novo:** nenhum (mesma function Vercel `api/ai.js`, um provedor a mais na chamada).
**Custo:** NVIDIA free-tier — sem cobrança enquanto dentro da cota gratuita; sujeito a mudança
pela NVIDIA (fora do nosso controle, documentado como risco).
**Reversão:** remover o 2º elo da `PROVIDER_CHAIN` (1 linha) — a Groq sozinha continua
funcionando exatamente como hoje; nenhuma migração de dado, nenhum estado a desfazer.
**Timeout da function:** `vercel.json` **não define `maxDuration`** hoje (confirmado lendo o
arquivo) — os defaults da Vercel se aplicam, e variam por plano (Hobby é mais restrito que
Pro). Não sei qual plano a conta usa — ver Questão em aberto Q2. Os timeouts por elo abaixo
foram dimensionados para o cenário mais conservador possível.

| Elo              | Timeout | Pior caso acumulado (se o elo 1 esgotar o timeout e cair pro 2) |
|-------------------|---------|----------------------------------------------------------------|
| 1. Groq           | 4000ms  | 4s                                                              |
| 2. NVIDIA-Mistral  | 5000ms  | 9s                                                              |

Pior caso total ≈ **9s** — dimensionado para caber sob o teto mais apertado conhecido de
planos serverless comuns (10s), com folga mínima. Em uso real, Groq responde em ~1-2s; o
timeout só é exercitado quando o provedor está de fato degradado.

### 4. Qualidade
- **Unidade (gate: `npm test -- --watchAll=false --testPathPattern=aiFallback`):**
  `shouldFallback` (limites 429/500/599/399), `buildRequestBody` (aplica `extraParams` só do
  provedor certo, não vaza `reasoning_effort` pra Groq), `PROVIDER_CHAIN` (2 elos, campos
  obrigatórios presentes, `keyEnv` distintos).
- **Integração:** sem teste automatizado do `fetch` real (a suíte do projeto não mocka rede
  hoje — mesma lacuna que `api/ai.js` já tinha antes desta feature; não piora, não é escopo
  resolver aqui). Verificação manual: forçar cada elo a falhar (env var ausente / URL errada
  temporária) e confirmar que cai pro próximo — checklist em `tasks.md`.
- **Build:** `npm run build` verde (gate padrão do projeto).

### 5. Observabilidade
Sem telemetria formal (não há analytics no repo — mesma realidade da spec 0017). "Prova" =
`console.log`/`console.error` com o `provider.id` que respondeu ou falhou em cada elo (já é o
padrão de log do `api/ai.js` atual — `console.error("[api/ai] erro:", ...)`), visível nos
logs de function da Vercel. Formalizar métricas fica de fora (non-goal do `product.md`).

## Mapa de dependências

| Dependência                  | Tipo        | Descrição                              | Métodos-chave |
|-------------------------------|-------------|------------------------------------------|----------------|
| Groq API                      | REST (HTTP) | Provedor primário (já em produção)       | `POST /openai/v1/chat/completions` |
| NVIDIA NIM (`integrate.api.nvidia.com`) | REST (HTTP) | Provedor de fallback, conta separada | `POST /v1/chat/completions` |
| `AbortSignal.timeout`         | Web/Node API| Timeout por tentativa                    | nativo (Node ≥ 18, já usado no runtime da Vercel) |

## Solução

| # | Bloco                                          | Descrição                                   | Status     |
|---|--------------------------------------------------|-----------------------------------------------|------------|
| 1 | `src/server/aiFallback.js` + testes              | tokens/chain puros, `shouldFallback`, `buildRequestBody` | definido |
| 2 | `api/ai.js` — laço de cascata                    | substitui o `fetch` único pelo laço pela `PROVIDER_CHAIN` | definido |
| 3 | `NVIDIA_API_KEY` na Vercel + `.env.example`      | env var nova, server-side                     | definido (config manual do Andre) |
| 4 | Cleanup opcional em `callGemini`                 | remover `model` do corpo (sem efeito, não bloqueia) | opcional |
| 5 | 3º elo da cascata (ex.: DeepSeek)                | pendente confirmação do ID exato no catálogo NVIDIA | indefinido |

## Alternativas consideradas

| Alternativa                                             | Prós | Contras | Por que (não) |
|-----------------------------------------------------------|------|---------|----------------|
| A (escolhida): cascata Groq→NVIDIA, config em `src/server/` | zero deps, testável pelo Jest existente, reversível em 1 linha | só 2 elos nesta onda | **escolhida** — resolve o ponto único de falha real sem inventar IDs não verificados |
| B: cascata só dentro da conta NVIDIA (vários modelos NVIDIA) | mais "opções" na lista | **não resolve o risco real**: um outage/rate-limit da conta NVIDIA derruba todos os elos juntos | recusada — não é fallback de disponibilidade de verdade |
| C: testar `api/` com uma 2ª config de Jest (ejetar ou script extra) | lógica ficaria 100% dentro de `api/` | nova complexidade de tooling, quebra o precedente "zero deps" da 0017 | recusada — `src/server/` resolve sem custo de tooling |
| D: 3 elos já nesta onda (incluindo DeepSeek com ID "provável") | cascata mais profunda | ID do modelo não foi verificado na doc oficial da NVIDIA — arriscaria um 404 silencioso permanente | recusada — CLAUDE.md proíbe inventar API não verificada |

## Trade-offs e consequências

Ganhamos resiliência cross-provider real sem custo e sem dependência nova; aceitamos que a
cascata desta onda tem só 2 elos (não 3-4 como o brief inicial sugeria) até os IDs dos demais
modelos NVIDIA serem confirmados na doc oficial — dívida consciente, não bloqueante (a Groq
sozinha já é o comportamento de hoje; o 2º elo é estritamente uma melhoria). O módulo puro
morar em `src/server/` (fora do padrão `domain/`) é uma exceção documentada à regra de
camadas, motivada por uma restrição real e verificada do Jest do CRA.

## Riscos

| Risco                                    | Descrição                                             | Prob × Impacto | Mitigação |
|--------------------------------------------|------------------------------------------------------------|-----------------|-----------|
| Timeout da function da Vercel               | Plano desconhecido (Hobby vs Pro) pode ter teto ≤10s      | médio × médio  | timeouts por elo dimensionados a ~9s pior caso; Q2 pede confirmação do Andre |
| NVIDIA free-tier muda/desliga sem aviso     | É um free-tier, sem SLA contratual                        | baixo × médio  | reversão trivial (remover 1 linha da chain); Groq continua sendo o primário |
| `NVIDIA_API_KEY` não configurada a tempo    | 2º elo fica mudo (skip silencioso), volta ao comportamento de hoje | baixo × baixo | log de aviso quando a env var falta; não quebra nada |
| Chave da NVIDIA exposta (repetição do incidente desta sessão) | Chave colada em chat/código por engano             | baixo × alto   | só server-side (Vercel env var), nunca no cliente; `.gitignore` já cobre `.env*` |

## Roadmap da feature

| Fase        | Entrega                                       | Quando                    | Depende de |
|-------------|--------------------------------------------------|----------------------------|------------|
| 1 (MVP)     | Cascata Groq→NVIDIA-Mistral (AC-1..5)            | após aprovação deste doc   | — |
| 2           | 3º elo (DeepSeek ou outro) — após ID confirmado  | quando Andre validar o ID  | 1 |

## Questões em aberto

- [ ] **Q1 — 3º elo da cascata (DeepSeek/GLM/MiniMax):** os IDs exatos de modelo (string usada
      no campo `"model"` da API) não foram verificados na doc/catálogo oficial da NVIDIA — só
      o `mistral-medium-3.5-128b` foi confirmado (Andre colou o snippet real). Pendente: Andre
      pega o ID exato na aba "Code" da página do modelo escolhido, aí eu adiciono como Fase 2.
- [ ] **Q2 — plano da Vercel (Hobby vs Pro):** define o teto real de `maxDuration` da function
      e se os timeouts de 4s+5s (dimensionamento acima) têm folga suficiente. Se Andre confirmar
      plano Pro, posso alargar os timeouts com mais segurança. **Não bloqueia a MVP** — os
      números atuais já foram escolhidos conservadoramente para o pior cenário conhecido.

> Se um dia a lista de provedores crescer bastante (ex.: 4+), reconsiderar mover a orquestração
> para fora do `api/ai.js` — fora de escopo aqui (over-engineering para 2 elos).
