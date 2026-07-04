---
name: tasks-0003-conformidade-licenca-op
description: Decomposição e gates da feature. Puxe ao implementar.
alwaysApply: false
---

# Tasks — Conformidade com a Licença da Comunidade de Ordem Paranormal

> Cada task mapeia para um ou mais `AC-N` da `spec.md`. Gate executável: `CI=false npm run build`
> (CRA) + teste do componente via `npm test`. `[P]` = paralelizável.

## Plano
| #  | Task                                                                 | Cobre AC | Depende de | Gate (comando)                    | Status |
|----|----------------------------------------------------------------------|----------|------------|-----------------------------------|--------|
| 1  | Copiar selo → `public/selo-conteudo-nao-oficial.png`                 | AC-1,2   | —          | arquivo presente no `build/`      | todo   |
| 2  | Componente `src/components/LicencaOP.jsx` (selo + texto, variantes)  | AC-1,2   | 1          | `npm test -- LicencaOP`           | todo   |
| 3  | Rodapé global (App.jsx `.nexus-footer`) exibe aviso quando OP `[P]`  | AC-1     | 2          | build + verificação manual        | todo   |
| 4  | Selo/texto na `OrdemParanormalSheet.jsx` (rodapé da ficha) `[P]`     | AC-2     | 2          | build + verificação manual        | todo   |
| 5  | Renomear rótulos "Conteúdo oficial" (3 pontos + texto vazio) `[P]`   | AC-3     | —          | grep sem ocorrências no src       | todo   |
| 6  | Aviso IA: flag `form.avatarAI` + aviso na ficha/modal/MasterAssistant| AC-4     | —          | build + verificação manual        | todo   |
| 7  | `docs/product/conformidade-licenca-op.md` (checklist) + STATE.md     | AC-5     | 1–6        | `/validar` (revisão da checklist) | todo   |

## Plano de teste
- Unidade: `LicencaOP` renderiza o texto obrigatório exato e o `<img>` do selo (Testing Library).
- Aceite: AC-1/2/4 verificados manualmente (dashboard OP, ficha OP, ficha dnd sem selo, geração IA);
  AC-3 verificado por grep ("Conteúdo oficial de Ordem Paranormal" → 0 ocorrências em `src/`).
- Regressão: ficha existente sem `avatarAI` não exibe aviso de IA; build CRA verde.

## Divergências (SPEC_DEVIATION)
- [ ] (nenhuma)

## Checklist de Definition of Done
- [ ] Todos os AC verdes pelo gate executável
- [ ] Nenhum `SPEC_DEVIATION` pendente
- [ ] Sem novo `catch` silencioso
- [ ] Spec reflete o que foi construído
- [ ] `docs/STATE.md` atualizado
