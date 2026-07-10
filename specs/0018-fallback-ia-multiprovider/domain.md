---
name: domain
description: Modelo DDD da feature. Puxe ao modelar agregados e linguagem.
alwaysApply: false
---

# Domain Model (DDD) — Fallback de IA multi-provider

> Responde: qual a **linguagem** e o **modelo** do negócio.
> DDD tático dentro do bounded context. Termos aqui devem aparecer iguais no código.

## Bounded Context
**Proxy de IA** (já existente, `api/ai.js` — subcontexto de infraestrutura/integração).
Subdomínio **generic** (compra-se pronto/usa serviço de terceiro) — não é vantagem
competitiva do Nexus, é infraestrutura de suporte ao Ajudante do Mestre. Esta feature não
cria um bounded context novo; adiciona resiliência de **disponibilidade** ao contexto
existente.

## Linguagem ubíqua
> Mesmo vocabulário entre negócio, spec e código. Promova ao `docs/glossary.md` global.

| Termo                     | Definição                                                                   | NÃO confundir com |
|----------------------------|--------------------------------------------------------------------------------|---------------------|
| **Cascata de provedores**  | Lista ordenada de provedores de IA (`PROVIDER_CHAIN`) tentados em sequência    | Roteamento por qualidade |
| **Elo**                    | Um par provedor+modelo específico dentro da cascata (ex.: Groq, NVIDIA-Mistral)| Provedor (a NVIDIA pode ter vários elos) |
| **Falha de disponibilidade** | 429, 5xx, timeout ou erro de rede — dispara o próximo elo                   | Falha de requisição |
| **Falha de requisição**    | 4xx ≠ 429 — não cascateia, é erro de config/input                             | Falha de disponibilidade |

## Agregados, entidades e value objects
Não há agregado com identidade/ciclo de vida persistido aqui — é lógica de decisão **sem
estado**, sobre uma requisição em voo. O único "modelo" é um **value object de configuração**:

- **Value object `Provider`** (elemento da `PROVIDER_CHAIN`)
  - Campos: `id`, `url`, `keyEnv`, `model`, `extraParams`, `timeoutMs`.
  - **Invariantes:** `id` único na cascata; `keyEnv` aponta para uma env var (nunca a chave
    em si — a chave nunca é um valor do domínio, só uma referência de onde lê-la em runtime);
    `timeoutMs` > 0.
  - Sem fronteira de consistência (é config estática, não transacional).

## Eventos de domínio
Não há eventos de domínio persistidos/emitidos — a cascata acontece dentro de uma única
requisição HTTP síncrona (proxy request/response), sem side-effects duráveis além do log.

## Relações com outros contextos
- **Conformist** com Groq e NVIDIA: o Nexus se adapta ao contrato OpenAI-compatível que
  ambos já expõem (nenhuma tradução/anti-corruption layer necessária — os dois falam o
  mesmo formato de `messages`/`chat/completions`).
- **Shared Kernel** com a spec 0004 (segurança): auth (Firebase ID token) e rate-limit por
  uid continuam sendo a fronteira de entrada do proxy, inalterados por esta feature.
- Não há mudança em `docs/architecture/context-map.md` — nenhum bounded context novo, nenhuma
  fronteira nova entre contextos internos do Nexus.
