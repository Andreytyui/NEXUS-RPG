---
name: context-map
description: Bounded contexts e relações. Puxe ao modelar ou cruzar contextos.
alwaysApply: false
---

# Context Map

> Visão DDD estratégica: os bounded contexts do sistema e como se relacionam.
> Atualize quando uma feature cria/move fronteiras. Combine com diagramas C4 se útil.

## Bounded Contexts
| Contexto          | Subdomínio              | Responsabilidade                                    | Dono  |
|-------------------|-------------------------|-----------------------------------------------------|-------|
| **Identidade**    | supporting              | Auth, perfil, plano do usuário                      | Andre |
| **Ficha**         | **core**                | Personagens, atributos, cálculos de regras por sistema | Andre |
| **Campanha**      | **core**                | Campanhas, membros, chat em tempo real              | Andre |
| **Monetização**   | supporting              | Planos, cobrança PIX, limites por plano             | Andre |
| **Tabletop**      | **core** *(futuro)*     | Grid, tokens, fog of war, iniciativa, mapas         | Andre |
| **IA**            | **core** *(futuro)*     | Assistente, mestre de voz, NPCs com memória         | Andre |

## Relações entre contextos
> Padrões atuais inferidos do código — fronteiras ainda implícitas (tudo em App.jsx).

```
[Identidade] ──(Customer/Supplier)──► [Ficha]
[Identidade] ──(Customer/Supplier)──► [Campanha]
[Identidade] ──(Customer/Supplier)──► [Monetização]
[Ficha]      ──(Shared Kernel)──────► [Campanha]
[Monetização]──(Conformist)─────────► [Ficha]
[Monetização]──(Conformist)─────────► [Campanha]
```

| Upstream       | Downstream   | Padrão              | Por quê |
|----------------|--------------|---------------------|---------|
| Identidade     | Ficha        | Customer/Supplier   | Ficha precisa do UID do usuário |
| Identidade     | Campanha     | Customer/Supplier   | Campanha usa UID como masterId/memberId |
| Ficha          | Campanha     | Shared Kernel       | DossierCard compartilha estrutura de Character |
| Monetização    | Ficha        | Conformist          | Limites de personagem por plano validados no App.jsx |

## Diagramas
Os diagramas de arquitetura de alto nível (contexto C4, containers, mapa de contextos) ficam em
[`diagrams.md`](./diagrams.md) — gere/atualize com a skill `/diagramar`.
