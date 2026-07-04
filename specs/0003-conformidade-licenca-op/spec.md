---
name: spec-0003-conformidade-licenca-op
description: Contrato da feature (critérios de aceite). Base enquanto a feature está ativa.
alwaysApply: true
---

# Spec — Conformidade com a Licença da Comunidade de Ordem Paranormal

> **Fonte da verdade.** Status: aprovado (Andre, 2026-07-02 — aprovação do plano F1 na auditoria FASE 0)
> Referência legal: https://ordemparanormal.com.br/licenca (lida em 2026-07-02).

## Resumo
O produto passa a exibir o selo "Conteúdo Não Oficial" e o texto obrigatório da Licença da
Comunidade de Ordem Paranormal, deixa de sugerir oficialidade/endosso e sinaliza material
gerado por IA — sem alterar nenhum dado persistido existente.

## Critérios de aceite

### AC-1: Rodapé global exibe o aviso de não-oficialidade quando o sistema ativo é OP
- **Dado** um usuário logado com o sistema Ordem Paranormal ativo (`activeSystem.id === "op"`)
- **Quando** qualquer tela com o layout principal é exibida (dashboard, fichas, mapa, campanha…)
- **Então** o rodapé global exibe o selo (imagem `public/selo-conteudo-nao-oficial.png`) e o texto
  exato: *"Este é um conteúdo não oficial, publicado sob a Licença da Comunidade de Ordem
  Paranormal."*, legível, opacidade 100%.

### AC-2: Ficha OP exibe selo + texto obrigatório
- **Dado** uma ficha de Ordem Paranormal aberta (logada ou via link público `/p/:id`)
- **Quando** a ficha é renderizada
- **Então** o selo aparece com largura ≥ 10% do container da ficha (mín. 48px), opacidade 100%,
  acompanhado do texto obrigatório, sem exigir interação para ficar visível.

### AC-3: Nenhum texto do produto sugere oficialidade/endosso
- **Dado** as bibliotecas de conteúdo (Habilidades, Inventário, modais)
- **Quando** o usuário as abre
- **Então** o rótulo "✦ Conteúdo oficial de Ordem Paranormal" não existe mais em lugar nenhum do
  bundle; é substituído por "✦ Conteúdo do livro base — material não oficial" (e variações
  descritivas equivalentes), mantendo a distinção visual entre conteúdo do livro e homebrew.

### AC-4: Material gerado por IA é sinalizado
- **Dado** o retrato do personagem
- **Quando** ele foi gerado pelo botão "Gerar com IA" (novo flag `form.avatarAI === true`)
- **Então** o texto *"Contém material gerado por inteligência artificial."* aparece junto ao
  retrato na ficha; o mesmo aviso aparece (estático) no modal de geração de retrato por IA e no
  painel do Assistente do Mestre (conteúdo textual de IA). Upload manual de imagem limpa o flag.

### AC-5: Checklist de conformidade documentada
- **Dado** a pasta `docs/product/`
- **Quando** a feature é concluída
- **Então** existe `docs/product/conformidade-licenca-op.md` com cada obrigação da licença,
  status (atendida/pendente/N-A) e o arquivo:linha que a implementa — incluindo as pendências
  jurídicas fora de escopo (IA × conteúdo comercial).

## Matriz de decisão — onde o aviso aparece

| Sistema ativo | Contexto                      | Selo | Texto obrigatório | Aviso IA | AC |
|---------------|-------------------------------|------|-------------------|----------|----|
| op            | rodapé global (layout logado) | sim (pequeno) | sim      | —        | AC-1 |
| op            | ficha OP (logada ou pública)  | sim (≥10%)    | sim      | se `avatarAI` | AC-2, AC-4 |
| op            | modal "Gerar com IA" / MasterAssistant | —    | —        | sim (estático) | AC-4 |
| dnd / outros  | qualquer tela                 | não  | não               | —        | AC-1 (borda) |

## Casos de borda e erros
- Ficha antiga sem `avatarAI` (undefined) → sem aviso de IA (não presumir procedência).
- Locale `en` ativo → o texto legal permanece em pt-BR (texto exato exigido pela licença).
- Imagem do selo falha ao carregar → o texto obrigatório continua visível (o texto não depende da imagem).
- Sistema ativo ≠ op → nada de selo/texto OP (não poluir módulos de outros sistemas).

## Fora de escopo
> Vinculante. Não implemente nada aqui.
- Decisão jurídica sobre IA em conteúdo comercial (registrada como pendência na checklist; postura
  atual aprovada: aviso obrigatório + tratar geração de IA como recurso não vendido até validação).
- Gating de features de IA por plano (fase F2/F5 do plano aprovado).
- Alterações em firestore.rules, pagamentos ou LGPD (fase F2).
- Revisão do texto das descrições em `src/data/ordemParanormal/*.json` (pendência na checklist).

## Rastreabilidade
- Auditoria FASE 0 (2026-07-02, sessão com Claude) — achado crítico nº 1.
- ADRs relacionados: ADR-0004 (inline styles — o componente novo segue o padrão).
