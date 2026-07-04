---
name: spec-0006-rules-fiel-ao-oficial
description: Contrato da feature (critérios de aceite). Base enquanto a feature está ativa.
alwaysApply: true
---

# Spec — rules.js fiel ao livro oficial (F5 da missão SaaS)

> **Fonte da verdade.** Status: aprovado (Andre, 2026-07-02 — "rules.js fiel ao livro oficial,
> com migração de máximos" nas decisões de produto da auditoria FASE 0).
> Método: testes de `rules.js` ANTES (≥80% do módulo), depois correção das divergências.

## Verificação contra o oficial (2026-07-03)

Fórmulas verificadas contra fontes secundárias do livro (wiki oficial da comunidade, guias e
resumos do livro de regras v1.1). Resultado por item da auditoria FASE 0:

| Item auditado | Veredito | Oficial |
|---|---|---|
| PV/PE somam atributo a cada NEX | **CÓDIGO JÁ CORRETO** (auditoria refutada) | Por NEX: Combatente +4+VIG / +2+PRE · Especialista +3+VIG / +3+PRE · Ocultista +2+VIG / +4+PRE; SAN +3/+4/+5 sem atributo |
| `peTurno = 1 + nexLevel` | **CÓDIGO JÁ CORRETO** (auditoria refutada) | Limite de PE por rodada = NEX/5 (5%→1, 50%→10, 99%→20) — idêntico a `1+nexLevel` |
| DT de rituais é campo manual | **DIVERGE — corrigir** | DT = 10 + (NEX/5) + Presença. Exemplos oficiais: NEX 5%/PRE 3 → 14; NEX 99%/PRE 5 → 35 |
| `ELEMENT_UNLOCK_NEX=50` vs ladder no 15 | **Constante correta; ladder errado — corrigir** | Afinidade elemental é escolhida no NEX 50% |
| PATENTES "reconstruída de memória" | **DIVERGE — corrigir** | 5 patentes por Pontos de Prestígio (tabela abaixo) |
| Deslocamento `6+AGI` (achado novo) | **DIVERGE — corrigir** | Deslocamento padrão = 9 m (6 quadrados); AGI não altera |
| `cargaMaxima = 5 + 5×FOR` | **CÓDIGO JÁ CORRETO** | 5 espaços + 5 por ponto de Força |
| Defesa `10 + AGI` | **CÓDIGO JÁ CORRETO** | 10 + Agilidade + equipamento |

**Consequência: a "migração de máximos" prevista na decisão de produto NÃO é necessária** —
as fórmulas de PV/PE/SAN não mudam. A única migração real é a da DT de rituais (AC-2).

### Tabela oficial de patentes
| Patente | Prestígio (PP) | Limite de crédito | Itens I | II | III | IV |
|---|---|---|---|---|---|---|
| Recruta | 0 | Baixo | 2 | — | — | — |
| Operador | 20 | Médio | 3 | 1 | — | — |
| Agente especial | 50 | Médio | 3 | 2 | 1 | — |
| Oficial de operações | 100 | Alto | 3 | 3 | 2 | 1 |
| Agente de elite | 200 | Ilimitado | 3 | 3 | 3 | 2 |

## Critérios de aceite

### AC-1: Fórmulas de classe travadas por teste
- **Dado** as três classes em NEX 5/50/99 com atributos de exemplo
- **Quando** `nexStats(nex, classId, attrs)` é chamado
- **Então** devolve exatamente os valores do livro (ex.: Ocultista NEX 99, VIG 2, PRE 5:
  PV 90, PE 180, SAN 115) e `deriveStats().peTurno` devolve NEX/5 (1 no 5%, 10 no 50%, 20 no 99%).

### AC-2: DT de rituais calculada (com bônus e migração)
- **Dado** uma ficha com NEX e PRE
- **Quando** a aba Rituais renderiza
- **Então** a DT exibida é `10 + (nexLevel+1) + PRE + dtRituaisBonus` via novo `dtRituais(nex, attrs, bonus)`
  em rules.js; o input manual de DT é substituído por um input de **bônus**.
- **Migração:** ficha legada com `dtRituais` manual salvo e ≠ da base calculada ⇒ na primeira
  carga `dtRituaisBonus = dtRituais_salvo − base` (DT exibida não muda para o jogador);
  `dtRituais` continua persistido com o TOTAL calculado (compat de leitura).

### AC-3: Deslocamento oficial
- **Dado** qualquer ficha OP
- **Quando** o painel de combate renderiza
- **Então** exibe `9+bônus m / floor((9+bônus)/1.5) q` (AGI não entra); `deriveStats().deslocamento`
  devolve "9m / 6q" com bônus 0. `deslocamentoBonus` persistido é mantido como está (em metros).

### AC-4: Patente por Pontos de Prestígio
- **Dado** `inventario.pontos_prestigio` (campo já existente, editável)
- **Quando** a aba Inventário renderiza
- **Então** patente, limites de itens e limite de crédito vêm da tabela oficial via novo
  `patenteForPrestigio(pp)` (PP ausente ⇒ 0 ⇒ Recruta). `patenteForNex` é removido.
  O selo "NEX x%" ao lado da patente passa a mostrar "PP".

### AC-5: NEX_LADDER com marcos oficiais
- **Dado** o modal de progressão e o tier de clearance
- **Quando** `NEX_LADDER` é consumido
- **Então** os marcos batem com `CLASS_BASE_ABILITIES`: habilidade de trilha em 10/40/65/99;
  aumento de atributo em 20/50/80/95; grau de treinamento em 35/70; **afinidade elemental
  apenas no 50** (nenhuma menção a elemento no 15).

### AC-6: Cobertura
- `rules.js` com cobertura de linhas ≥80% no gate executável.

## Casos de borda e erros
- `pontos_prestigio` ausente/undefined/negativo ⇒ trata como 0 (Recruta).
- `dtRituais` legado igual à base calculada ⇒ bônus 0 (sem escrita extra).
- `dtRituaisBonus` já presente ⇒ migração não roda de novo (idempotente).
- NEX 99 ⇒ termo NEX/5 = 20 (mesmo arredondamento do `peTurno`).
- Classe desconhecida em `nexStats` ⇒ mantém fallback atual (ocultista).

## Fora de escopo
> Vinculante.
- Trilhas de Especialista faltantes (Infiltrador, Técnico) e revisão dos TEXTOS de poderes/
  trilhas (paráfrase × cópia — já no backlog da licença, spec 0003).
- Esquiva/bloqueio como reações (campo `esquiva`/`bloqueio` de deriveStats não é consumido).
- FullSheet legado do App.jsx (serve outros sistemas; campos livres).
- Concessão automática de PP (continua manual, mestre decide).
- Ganho retroativo de PV ao aumentar VIG em marcos de atributo (regra de aumento é manual no app).

## Rastreabilidade
- Missão SaaS F5 (plano F1→F7 aprovado 2026-07-02); auditoria FASE 0 (frente "rules.js diverge").
- Fontes: ordemparanormal.fandom.com (sistema, classes, rituais), resumos do livro v1.1
  (patentes/equipamento cap. 3), guias da comunidade (MRPG). Exemplos numéricos de DT conferidos
  contra dois exemplos independentes.
- Specs relacionadas: 0003 (licença — textos), 0005 (fases — mesmo padrão de migração aditiva).
