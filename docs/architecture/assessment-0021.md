---
name: assessment-0021
description: Backlog priorizado do programa "Nexus impecável" — achados das 3 auditorias (regras OP, mapas, bug-hunt geral), 2026-07-09. Puxe ao continuar as correções.
alwaysApply: false
---

# Assessment 0021 — Backlog de qualidade (OP + Mapas + geral)

> Origem: 3 subagentes de auditoria (2026-07-09). Andre decidiu: **manter homebrew do Cellbit**
> (Esquiva 10+AGI+Reflexos e Proficiência +2..+6 FICAM — NÃO mexer) e **regras de OP primeiro**.
> Cada item: severidade + arquivo:linha + correção. Marque `[FEITO spec NNNN]` ao fechar.

## A. Ordem Paranormal — regras (PRIORIDADE 1)

- **[FEITO spec 0021]** Condições contaminadas por D&D reescritas fiéis ao livro (`App.jsx` `OP_CONDICOES`):
  Abalado (-2 perícia), Apavorado (-5 perícia+fugir), Atordoado (desprevenido+sem ações),
  Cego (desprevenido+lento+camuflagem total), removido "Exposto" (inexistente) → **Desprevenido**
  (-5 Defesa); adicionadas Agarrado, Alquebrado, Caído, Confuso, Indefeso, Petrificado, Sangrando.
  Fontes: Guia Rápido de Regras (Scribd/Studocu). Textos são de referência (app não auto-aplica).
- **[FEITO spec 0021] Sobrecarga com efeito + teto** · `Tabs/InventarioTab.jsx`. Helper puro novo
  `cargaTeto(attrs)` = 2× carga máxima (`rules.js`, testado). A barra de carga agora mostra o teto
  absoluto ("Teto absoluto: N espaços (2× o máximo)"), o efeito da sobrecarga (−5 Atletismo/Furtividade,
  −3m deslocamento) quando `cargaAtual > max`, e o estado "ACIMA DO TETO / não pode carregar mais nada"
  quando `> teto`. App não trava (só informa).
- **[FEITO spec 0021 · aviso, não trava] Aviso de círculo de ritual por NEX** · `Tabs/RituaisTab.jsx`.
  Helper puro novo `circuloMaxNex(nex)` (1º=5%,2º=25%,3º=55%,4º=85%; `rules.js`, testado). O `RitualCard`
  mostra badge "⚠ NEX BAIXO" + tooltip quando `círculo > circuloMaxNex(nex)`, SEM impedir de adicionar
  (decisão Andre: autonomia do jogador/mestre). `nex` propagado da sheet → RituaisTab.
- **[FEITO spec 0021] `deriveStats().esquiva`/`.bloqueio` mortos removidos** · `rules.js`. Só `.peTurno`
  é consumido pela ficha; `.defesa`/`.deslocamento` ficam (cobertos por teste). Esquiva homebrew
  (10+AGI+Reflexos) segue recalculada na própria ficha (`OrdemParanormalSheet.jsx:385`), intocada.
- **[RESOLVIDO — sem ação] Perícia "Sobrevivência" destreinada?** · Andre confirmou: **NÃO** é usável
  destreinada. O código (`rules.js` `Sobrevivência*`) já está correto. Nenhuma mudança.
- **NÃO MEXER (decisão Andre = manter homebrew):** Esquiva passiva (`OrdemParanormalSheet.jsx:385`),
  Proficiência +2..+6 (`:386`). Ficam.

## B. Mapas (PRIORIDADE 2)

- **[FEITO spec 0021] Editor com toque (Pointer Events)** · `index.jsx`. Container + `onElementDown` +
  alças de resize/rotate + nota migrados de `onMouse*` para `onPointer*`; `touch-action:none` no container;
  `setPointerCapture` no container em todo down (elemento e canvas) → o arrasto sobrevive ao sair da
  viewport, **eliminando o bug de "solta ao encostar na toolbar"** (o `onMouseLeave={onUp}` foi removido).
  Adicionado **pinch-zoom + pan de 2 dedos** (refs `pointersRef`/`pinchRef`, helpers `beginPinch`/
  `applyPinch`) — sem isso o `touch-action:none` deixaria o mapa não-navegável por gesto (os botões
  +/−/⌂ continuam). Gestos soltam o Sync View (AC-6). Gates: 9 suítes/67 testes MapEditor + build exit 0.
  Follow-up: double-tap (ping) no toque não garantido — fora de escopo.
- **[JÁ RESOLVIDO — 0019 AC-11] `replaceImage()` com downscale** · `index.jsx:499-516` já faz o cap
  2048/JPEG igual ao `loadBg` (o fix veio na 0019, depois deste assessment ser escrito). Sem ação.
- **[FEITO spec 0021] Clima sincroniza/persiste** · movido de state local para `scene.weather`
  (`index.jsx`): o menu de clima agora faz `dispatch(PATCH_SCENE {weather})` — mesmo caminho do `loadBg`,
  que `saveSceneMeta` propaga p/ a mesa. Mestre liga chuva/neve/névoa → jogador vê e persiste no reload.
- **[incômodo] Re-render global por frame** no arraste/resize/rotate · `setDragTick` (`index.jsx:894,901,926`).
- **[incômodo] Top-bar corta em tela estreita** · `index.jsx:1114-1137` (a AC-13 só tratou toolbar/painel).
- **[incômodo] `window.prompt/alert`** p/ nota/renomear/rótulo/salvar-asset (`index.jsx:859,619,653,534`) →
  modais in-app (ModalShell).
- **[FEITO spec 0021] Estado vazio correto p/ viewer** · `index.jsx`: o jogador agora vê "AGUARDANDO O
  MESTRE PREPARAR A CENA" em vez de "Arraste/Adicionar Imagem" (que ele não pode).
- **[incômodo] Sem loading no modo campanha** até 1ª hidratação Firestore · `index.jsx:301-317`.
- **[polish] Emojis residuais**: context-menus (`index.jsx:1652-1726`), condições de token (`:39-43`),
  sub-toolbars Desenho/Fog (`:1497,1516`), permissão de camada 👤👥🚷 (`:1188`), chrome (⚔🗺✏✕) → `MapIcon`.
- **[polish] `aria-label`** nos botões só-ícone (MapIcon é aria-hidden).
- **[FEITO spec 0021] Fallback `DEFAULT_LAYERS_V2`** · `index.jsx` agora importa e usa `DEFAULT_LAYERS_V2`
  (7 camadas do schema) em todos os fallbacks `scene.layers || …`, no lugar das 4 v1 antigas do
  `reducer.js` (que quebravam zIndex/lock se o fallback disparasse com ids de camada divergentes).

## C. Geral / transversal (PRIORIDADE 3)

- **[grave] Save de ficha engole erro do Firestore** · `hooks/useCharacter.js:10,18` (`catch(_){}`) —
  sync falha calada. Logar + flag de "falha ao salvar" p/ toast.
- **[incômodo] Carga de fichas: erro vira "nenhum personagem"** · `hooks/useCharacter.js:28,49-55`.
  Distinguir "sem dados" de "erro de carga".
- **[incômodo] Arquivar campanha 100% silencioso** · `App.jsx:2507` (`catch(e){}` vazio).
- **[incômodo] `charsLoading` buscado mas descartado** — Dashboard sem spinner · `App.jsx:11722`.
- **[incômodo] Uploads de capa engolem falha de resize** · `App.jsx:208,1498,2485,3878,4353`.
- **[incômodo] i18n EN incompleto** cai p/ PT misturado · `i18n/useLocale.js:21-30` (auditar en.js vs pt.js).
- **[DECISÃO ANDRE = É BUG, consertar] PIX desligado** · `createPixPayment`/`fsGetUserPlan` nunca
  chamados (`App.jsx:84,75`); a UI manda pro Catarse externo. Andre: era pra funcionar → **consertar
  o fluxo de pagamento PIX** (front chama `createPixPayment` → backend `/api/create-payment` já existe;
  ativar plano via webhook `/api/payment-webhook`). Tarefa maior — investigar o fluxo ponta a ponta
  (front `PlansScreen` + backend Vercel + `MERCADOPAGO_*` env vars). TODO prioritário.
- **[polish] Lint**: `no-dupe-keys` (`App.jsx:8927,9230`), array morto D&D (`DungeonsAndDragonsSheet.jsx:383-386`),
  vários `no-unused-vars` (features meio-implementadas: `setShowAddSkill`/`newSkillName` L8202/8231),
  `exhaustive-deps` em auto-save (`App.jsx:8284,8318` — verificar closure obsoleta).

## O que está CERTO (não retrabalhar)
Fórmulas PV/PE/SAN, peTurno=NEX/5, dtRituais, patentes, cargaMaxima=5+5×FOR, deslocamento 9m/6q,
defesa 10+AGI, atributos-base das 28 perícias, treino 5/10/15 na rolagem, rolagem de ataque/crítico
(0006+0020). Login/campanha/`/api/ai` têm loading+erro. Nav mobile existe (`MobileBottomNav`).
