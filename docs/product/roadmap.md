---
name: roadmap
description: Prioridades atuais em horizontes Now/Next/Later. alwaysApply true.
alwaysApply: true
---

# Roadmap — Nexus RPG

> Plano incremental. Gerado no kickoff (2026-06-22).
> Princípio: **quick wins de baixo risco primeiro** para ganhar velocidade sem quebrar o que existe.

## Objetivo do roadmap
Evoluir o Nexus RPG de SPA monolítica sem testes para uma plataforma social de RPG com IA,
passando primeiro por uma base técnica sustentável e depois pelas features de imersão.

## Horizontes

### 🟢 Agora (próximas 4–6 semanas)
| # | Item | Valor | Esforço | Dono | Depende de | Pronto quando |
|---|------|-------|---------|------|------------|---------------|
| 1 | **Split de App.jsx** — extrair hooks e contextos (Auth, Campaign, Character) | alto | médio | Andre | — | App.jsx < 400 linhas, hooks isolados |
| 2 | **CI/CD GitHub Actions** — build + lint em cada PR | alto | baixo | Andre | — | PR bloqueado se build falha |
| 3 | **Testes de regras OP** — cobrir `rules.js` com React Testing Library | alto | médio | Andre | Split App.jsx | ≥ 80% cobertura em rules.js |
| 4 | **Melhoria de UX da ficha** — hierarquia visual, legibilidade, contraste | alto | médio | Andre | — | Feedback positivo de jogadores |

### 🟡 Próximo (depois do Agora)
| # | Item | Valor | Esforço | Dono | Depende de |
|---|------|-------|---------|------|------------|
| 5 | **Tabletop MVP** — grid hexagonal + tracker de iniciativa | muito alto | alto | Andre | Split App.jsx |
| 6 | **Dados 3D animados** (d4–d100) | alto | médio | Andre | — |
| 7 | **Fog of war básico** | alto | alto | Andre | Tabletop MVP |
| 8 | **Tokens com status e aura** | médio | médio | Andre | Tabletop MVP |
| 9 | **Editor de mapas + upload de mapa** | alto | alto | Andre | Tabletop MVP |
| 10 | **Observabilidade mínima** — remover fail-silent, adicionar logs estruturados | alto | baixo | Andre | — |

### ⚪ Depois (hipóteses / a validar)
| # | Item | Por que esperar |
|---|------|-----------------|
| 11 | **Mestre de voz IA** (Whisper + GPT-4o + ElevenLabs) | Custo alto; validar disposição de pagar antes |
| 12 | **NPCs com memória persistente** | Depende de infraestrutura de IA definida |
| 13 | **Geração de mapa por texto** | Validar demanda pós-tabletop |
| 14 | **Multiplayer até 8 jogadores** | Tabletop MVP precisa estar sólido primeiro |
| 15 | **Paywall Stripe (Free / Pro / Mestre)** | Definir tiers após validar proposta de valor |
| 16 | **Marketplace de assets** | Só faz sentido com base grande de usuários |
| 17 | **Suporte a outros sistemas** (D&D, Tormenta) | Primeiro dominar OP; expansão por demanda |

## Adoção do SDD (brownfield)
- [x] ADRs retroativos criados para decisões estruturais (Firebase, CRA, inline styles)
- [x] Vision, assessment e context-map documentados
- [ ] Próxima feature nasce com `spec.md` em `specs/NNNN-<nome>/`
- [ ] Glossário preenchido com termos que causam confusão
- [ ] `context-map.md` validado com o time após split de App.jsx

## Como rodar
- **Cadência de revisão do roadmap:** a cada 2 semanas ou após entrega de item grande
- **Quem decide prioridade:** Andre (solo por enquanto)
- **Definition of Done:** ver `CLAUDE.md` e `docs/engineering/TESTING.md`
