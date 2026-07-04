# Task — F3: Observabilidade (catches silenciosos do App.jsx)

**Data:** 2026-07-03 · **Aprovação:** Andre ("sim", fase F3 do plano da auditoria FASE 0) · **Tier:** trivial (1 arquivo)

## O quê
Eliminar todos os `catch` fail-silent de `src/App.jsx` (auditoria FASE 0 contou ~30; 24 sítios reais):
- Operações Firestore/dados (fs* helpers, admin de campanha, sync do mapa antigo, bestiário, IndexedDB) → `console.error("[contexto] ...", e)`.
- Mídia/autoplay/clipboard (rejeições esperadas de `play()`, cópia de convite) → `console.warn`.
- Cleanups genuinamente best-effort (osciladores WebAudio já parados, `destroy()` de player YT) → catch documentado com comentário de intenção (não é mais silêncio acidental).

## Gate
- `grep 'catch (_) {}|catch {}|.catch(()=>{})'` em App.jsx → **0 ocorrências** ✅
- `CI=false npm run build` → compila
- Comportamento preservado (só logging adicionado; nenhum fluxo de controle alterado)
