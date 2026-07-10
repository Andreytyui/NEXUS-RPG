---
name: spec-0020-arsenal-op
description: Contrato do Arsenal v2 da ficha de Ordem Paranormal — modal de edição de ataque rico (dano extra, multiplicador de crítico, tipo de dano, perícia, imagem, anotações) + lista colapsável e rolagem com breakdown.
alwaysApply: true
---

# Spec — Arsenal v2 (editor de ataques OP)

> **Fonte da verdade.** Status: em implementação (2026-07-09). Tier: Pequeno.
> Origem: Andre pediu que o editor de ataques (hoje card inline apertado) vire um modal
> completo, melhor que a referência de outro app que ele mandou.

## Critérios de aceite

### AC-1: Modal de edição rico
- **Dado** a aba Combate → Arsenal, ao criar ("Novo Ataque") ou editar um ataque
- **Então** abre um modal com: Nome; Dano; Crítico (margem); Multiplicador; Ataque Bônus;
  Perícia; Atributo de Dano; Tipo de Dano (dropdown); Alcance; lista de **Dano Extra**
  ({dano, tipo} com Adicionar/Remover); Imagem; Anotações (rich-text B/I/U); Salvar/Cancelar.
- Reusa `ModalShell` e `RichTextEditor` já existentes.

### AC-2: Crítico com margem e multiplicador (mecânica correta)
- **Dado** um ataque com Crítico=19 e Multiplicador=3
- **Quando** o d20 mantido é ≥ 19
- **Então** é crítico e o dano da arma é multiplicado por 3; d20 mantido < 19 não é crítico.
- **Gate:** `critMargin`, `isCritical`, `combineDamage` testados.

### AC-3: Dano extra somado por tipo
- **Dado** um ataque com dano base + itens de dano extra de tipos diferentes
- **Quando** rolado
- **Então** o total soma base + extras; e há um breakdown por tipo (ex.: Balístico X, Fogo Y).
- **Gate:** `combineDamage` testado (soma + agrupamento por tipo; extras não multiplicam no crit).

### AC-4: Retrocompatível
- **Dado** um ataque salvo antes desta feature (shape antigo `{name,dano,critico,tipo,alcance,attr}`)
- **Quando** rolado ou editado
- **Então** funciona sem erro (campos novos assumem defaults: multiplicador 2, sem extras).
- **Gate:** teste de `combineDamage` com defaults.

### AC-5: Lista colapsável com resumo e thumb
- **Dado** a lista do Arsenal
- **Então** cada ataque aparece colapsado (thumb se houver + nome + "Dano · Crítico margem/xMult" +
  botão de rolar) e expande mostrando perícia, ataque bônus, tipo, alcance, atributo de dano,
  dano extra e anotações, com Editar/Remover. Verificação visual documentada.

### AC-6: Rolagem com breakdown
- **Dado** rolar um ataque
- **Então** o resultado mostra o teste (dados + bônus + crítico se margem batida) e o dano total
  com breakdown por tipo. Verificação visual documentada.

## Fora de escopo (vinculante)
- Alvos/DT automáticos, condições aplicadas no alvo, munição.
- Migração destrutiva do shape antigo (é aditivo).
- Outros sistemas (D&D) — só Ordem Paranormal.

## Rastreabilidade
- Reusa: `rollOP`/`rollExpr` (rules.js), `ModalShell`/`RichTextEditor` (Tabs/shared),
  `fireRoll`/`skillTreino`/`PERICIAS` (sheet). Relaciona-se à spec 0006 (rules fiel).
