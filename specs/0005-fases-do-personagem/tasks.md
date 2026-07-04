---
name: tasks-0005-fases-do-personagem
description: Decomposição e gates da feature. Puxe ao implementar.
alwaysApply: false
---

# Tasks — Fases do personagem

> Gate executável: `npm test` (novo teste de `getActiveAvatar`) + `CI=false npm run build`.

## Plano
| # | Task                                                                     | Cobre AC   | Depende de | Gate                        | Status |
|---|--------------------------------------------------------------------------|------------|------------|-----------------------------|--------|
| 1 | `src/domain/character.js`: `getActiveAvatar` + `isActiveAvatarAI` puros   | AC-1,4,5   | —          | `npm test -- character`     | todo   |
| 2 | Teste unitário do helper (legado, fase ativa, fallback, IA)               | AC-1,4,5   | 1          | idem                        | todo   |
| 3 | Ficha OP: retrato usa helper + galeria de fases no modal (CRUD + ativa)   | AC-2,3     | 1          | build + verificação manual  | todo   |
| 4 | Ficha OP: upload/IA aplicam na fase ativa (downscale, `imageAI`)          | AC-3,5     | 3          | build + verificação manual  | todo   |
| 5 | `DossierCard.jsx` usa `getActiveAvatar` `[P]`                             | AC-4       | 1          | build + dashboard           | todo   |
| 6 | App.jsx: MestrePanel/SharedSheets/SheetList/cards usam helper `[P]`       | AC-4       | 1          | build + telas afetadas      | todo   |
| 7 | STATE.md + verificação manual do fluxo completo                           | todos      | 1–6        | checklist                   | todo   |

## Plano de teste
- Unidade: helper com ficha legada (sem phases) ⇒ avatar; fase ativa válida ⇒ imagem da fase;
  id inexistente/sem imagem ⇒ avatar; `imageAI`/`avatarAI` ⇒ flag correta; aceita `form` solto.
- Aceite manual: criar fase "Exausto" com upload → trocar no retrato → conferir dashboard,
  MestrePanel e /p/:id refletindo; remover fase ativa → volta "Normal"; ficha antiga intacta.

## Divergências (SPEC_DEVIATION)
- [ ] (nenhuma)

## Checklist de Definition of Done
- [ ] AC verdes pelo gate; teste do helper passando
- [ ] Sem catch silencioso novo; spec fiel; `docs/STATE.md` atualizado
