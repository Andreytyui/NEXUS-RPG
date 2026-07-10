---
name: tasks-0020-arsenal-op
description: Decomposição e gates do Arsenal v2. Puxe ao implementar.
alwaysApply: false
---

# Tasks — Arsenal v2 (editor de ataques OP)

| # | Task | Cobre AC | Arquivos | Status |
|---|---|---|---|---|
| 1 | `rules.js`: `TIPOS_DANO`, `ALCANCES`, `critMargin`, `isCritical`, `combineDamage`, `resolveAttack` + testes | AC-2/AC-3/AC-4 | rules.js, rules.test.js | done |
| 2 | `AttackModal` (ModalShell + RichTextEditor + imagem downscale + lista de dano extra) | AC-1 | OrdemParanormalSheet.jsx | done |
| 3 | `ArsenalCard` v2 colapsável + "Novo Ataque" abre modal | AC-5 | OrdemParanormalSheet.jsx | done |
| 4 | `rollAttack` usa `resolveAttack`; corner card com breakdown de dano | AC-6 | OrdemParanormalSheet.jsx | done |
| 5 | Gates + regressão | todos | — | done |

## Plano de teste
- Unidade (gate): `critMargin` (19/"19-20"/"20"/lixo), `isCritical` (limites), `combineDamage`
  (multiplicador no crit, extras somados e agrupados por tipo, extras não multiplicam). `npm test`.
- Aceite AC-1/5/6 (UI): checklist manual do Andre.

## Checklist manual (Andre)
- [ ] Novo Ataque abre modal; salvar cria na lista.
- [ ] Editar abre modal preenchido; dano extra adiciona/remove; imagem e anotações salvam.
- [ ] Rolar: crítico na margem multiplica o dano; breakdown por tipo aparece.
- [ ] Ataque antigo (pré-v2) continua rolando sem erro.

## Definition of Done
- [ ] AC-2/3/4 verdes por teste; AC-1/5/6 por checklist
- [ ] `npm run build` verde + suíte sem regressão
- [ ] `docs/STATE.md` atualizado
