---
name: spec-biblioteca-assets
description: Contrato da biblioteca de assets (users/{uid}/assets, dock por tipo, tags/busca, arrastar p/ cena com dedup por hash). Fase 5 do plano Owlbear.
alwaysApply: true
---

# Spec — Mapa: biblioteca de assets

> **Fonte da verdade.** Status: aprovado (plano mestre Owlbear, 2026-07-04). Tier: Pequeno + rules.
> Depende da 0009 (imagens content-addressed `img_a_<hash16>` + `saveImage` com dedup já
> existem em `sync/campaignSync2.js`). Design: [ADR 0006](../../docs/architecture/adr/0006-mapa-v2-elementos-em-docs.md) §4.

## Resumo

Biblioteca de assets por conta do usuário (`users/{uid}/assets/{assetId}`), reutilizável entre
campanhas e cenas. Dock inferior com abas por tipo (mapa/prop/montaria/personagem/anexo/nota),
busca por nome e filtro por tag. Arrastar (ou clicar) um asset o coloca na cena, criando o
elemento na camada certa; em campanha, a imagem é copiada para a campanha com dedup por hash
(jogadores leem da campanha, nunca de `users/`). "Salvar na biblioteca" a partir de qualquer
imagem/token da cena.

## Critérios de aceite

### AC-1: Salvar na biblioteca
- **Quando** o mestre usa "Salvar na biblioteca" num elemento image/token com imagem
- **Então** cria `users/{uid}/assets/{assetId}` com `{ type, name, tags:[], folder:null, data,
  hash, w, h }` (imagem reduzida pelo pipeline existente)

### AC-2: Dock por tipo + reuso entre campanhas
- **Dado** assets salvos, **quando** o mestre abre a dock
- **Então** vê abas por tipo com miniaturas; um asset salvo numa campanha aparece na dock de
  qualquer outra (a coleção é do usuário, não da campanha)

### AC-3: Colocar na cena
- **Quando** arrasta (ou clica) um asset para o canvas
- **Então** cria o elemento na camada correspondente ao tipo (mapa/prop/montaria→image;
  personagem/anexo→token com imagem; nota→note) na posição solta/centro

### AC-4: Dedup por hash na campanha
- **Quando** coloca o mesmo asset 2× na mesma campanha
- **Então** existe **um** doc `img_a_<hash16>` (segunda vez reusa via getDoc antes de setDoc);
  o jogador vê a imagem (leu de `campaigns/.../map`, não de `users/`)

### AC-5: Busca e tags
- **Quando** digita no campo de busca ou seleciona uma tag
- **Então** a dock filtra por nome (case-insensitive) e/ou tag (client-side)

### AC-6: Rules
- **Então** (validação manual documentada): só o dono lê/escreve `users/{uid}/assets/*`

### AC-7: assetLib.js puro e testado
- `assetTypeForElement`, `layerForAssetType`, `filterAssets(assets, {q, tag})`,
  `newAssetId`, `assetTags(assets)` com testes

## Casos de borda

- Asset sem imagem (ex.: nota pura) → tipo `note`, colocado como note com o texto do `name`
- Teto de assets: constante `ASSET_SOFT_CAP` (ex. 300); ao exceder, avisa e não salva
  (gancho para plano/paywall — refino futuro)
- Modo pessoal (sem campaignId): coloca do asset direto no `imageStore` local (sem Firestore
  de campanha)

## Fora de escopo (vinculante)

- Pastas/coleções hierárquicas profundas (só tag + busca nesta fase) · import/export de
  biblioteca · grid hex (0014) · texto rico (0015) · integração fina com tiers de plano

## Rastreabilidade

- Design: ADR 0006 §4 · Antecessoras: 0009–0012 · Plano mestre Owlbear (seção 0013)
