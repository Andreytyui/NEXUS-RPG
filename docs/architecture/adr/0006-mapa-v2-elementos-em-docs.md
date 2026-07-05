---
name: adr-0006-mapa-v2-elementos-em-docs
description: Decisão — mapa v2 no Firestore: elementos em docs individuais, multi-cena com doc ponteiro, imagens content-addressed, canal efêmero live_{uid}, permissões por camada e fog por shapes. Puxar ao mexer em mapa/VTT/sync.
alwaysApply: false
---

# ADR 0006 — Mapa v2: elementos em documentos próprios, multi-cena e canal efêmero

- **Status:** aceito (plano mestre Owlbear aprovado pelo Andre em 2026-07-04)
- **Substitui parcialmente:** ADR 0005 (mantém: MapEditor como motor único, imagens dataURL no
  Firestore, rejeição de Storage e de RTDB; muda: formato do doc da cena e fluxo de escrita).
- **Contexto:** o plano de paridade com o Owlbear Rodeo (specs 0009–0016) exige jogador movendo
  o próprio token, múltiplas cenas por campanha, fog por formas e biblioteca de assets. O modelo
  do ADR 0005 (cena inteira num doc único `map/scene`) bloqueia tudo isso: rules do Firestore
  não validam diff de array (impossível autorizar "só o próprio token"), o doc único impõe teto
  de 1 MB à cena e o autosave regrava a cena inteira a cada 1.2s.

## Decisão

1. **Elementos viram documentos individuais** em `campaigns/{id}/map/{sceneId}/elements/{elId}`
   com `{ type, layerId, ownerId, parentId, z, ...geometria }`. É a única forma de as rules
   validarem escrita por elemento. Remove o teto de 1 MB da cena; escritas passam a ser só dos
   docs alterados (batch). IDs client-side `el_<ts>_<rand>`.
   *Rejeitado:* doc separado de "posições de jogador" mesclado no cliente — dois donos da mesma
   verdade, conflitos de merge, não escala para permissões por camada.
2. **Undo/redo continua local do mestre**; `sync/elementDiff.js` difere o estado presente do
   último publicado e emite batch writes (add/update/delete), debounce ~300 ms, chunks de 400
   ops (limite 500/batch). Last-write-wins por elemento.
3. **Multi-cena:** cada cena é um doc `campaigns/{id}/map/{sceneId}` (`kind:'scene'`, id com
   prefixo `s_`) contendo só metadados (`name, layers, grid, fog, permissions, bgSize`);
   ponteiro `campaigns/{id}/map/state` (`{ v:2, activeSceneId }`). Troca de cena = 1 campo.
4. **Imagens imutáveis e content-addressed:** novos ids `img_a_<hash16>` (SHA-256 via
   `crypto.subtle`); docs `img_*` legados continuam válidos. Fim do `onSnapshot` da coleção
   inteira — imagens são lidas por `getDoc` on-demand com cache em memória. Reuso entre cenas
   por referência (`imageId`), sem duplicar. *Reafirmado:* Firebase Storage segue rejeitado.
5. **Canal efêmero** (ping/apontador/câmera/régua — consumido pela spec 0010): doc por usuário
   `campaigns/{id}/map/live_{uid}` (`kind:'live'`), throttle 250 ms no cliente, receptor ignora
   payload com `at` mais velho que 6 s. *Reafirmada a rejeição de RTDB* — nova superfície de
   billing/rules não se justifica; revisitar só se o custo de writes aparecer.
6. **Permissões por camada** no doc da cena:
   `permissions: { [layerId]: { create:bool, update:'none'|'owner'|'all', delete:'none'|'owner' } }`,
   default `{ 'layer-character': { update:'owner' } }`. Rules leem a cena via `get()` (1 read
   extra por write de jogador — aceito). No modo `'owner'`, update de jogador é restrito a
   `affectedKeys().hasOnly(['x','y','rotation'])` e `ownerId == request.auth.uid`. Dono = quem
   criou; mestre (write total) reatribui.
7. **Fog v2 = lista ordenada de formas** no doc da cena:
   `fog: { v:2, fillAll:bool, shapes:[{ id, op:'add'|'cut', type:'rect'|'circle'|'poly'|'free', ...geom em coords de mundo }] }`.
   Render por **SVG `<mask>` sequencial** (base branca se `fillAll`; `add` pinta branco, `cut`
   pinta preto, na ordem). Semântica correta sem geometria booleana e independente do tipo de
   grid (hex na 0014 sem retrabalho). *Rejeitado:* `fill-rule: evenodd` — dois `add` sobrepostos
   abririam buraco.
8. **Versão de schema `schemaV:2` + migração idempotente executada pelo mestre ao abrir**
   (batch): cria `state`, converte `map/scene` legado em cena `s_legacy`, explode `elements[]`
   em docs, converte `fogCells`→rects merged por linha, remapeia 4→6 camadas
   (`layer-objects`→Prop, `layer-tokens`→Personagem; Montaria/Anexo/Nota novas;
   `layer-drawing` permanece) e `gridSize`→objeto `grid`. O doc legado vira tombstone
   `{ migratedTo:'s_legacy' }` só após sucesso. Cenas do localStorage (modo pessoal) migram
   puro na fase 3 do `migrateScene` — modo pessoal continua com `elements[]` inline.
9. **Custo Firestore estimado:** carga inicial ≈ 2 + N elementos + M imagens reads/cliente
   (cena 150 el + 10 img, 5 clientes ≈ 800 reads); sessão de 4h intensa ≈ 2–4k writes de drag
   (throttle 300 ms) + 1–2k de pings. Confortável no free tier (50k reads / 20k writes por dia).

## Consequências

- Ordem de rollout obrigatória: **deploy das rules (retrocompatíveis) → deploy do app →
  migração lazy pelo mestre**. Cliente antigo aberto durante o skew vê o tombstone (mesa vazia
  com aviso) até recarregar.
- Ordem visual dos elementos deixa de ser a posição no array e passa ao campo `z`
  (docs não têm ordem); a montagem client-side ordena por `z`.
- O jogador continua read-only no cliente até a spec 0010; as rules já permitem o caminho
  owner-update (dormente).
- `campaignSync.js` (v1) é removido ao fim da 0009; `splitMapDocs` some junto.
