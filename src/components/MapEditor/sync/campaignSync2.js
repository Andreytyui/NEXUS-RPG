/* Sync v2 do mapa da mesa (spec 0009 / ADR 0006).
 * Firestore: campaigns/{id}/map/state (ponteiro) + map/{sceneId} (kind:'scene', meta sem
 * elements) + map/{sceneId}/elements/{elId} (um doc por elemento) + map/img_* (imagens
 * imutáveis; novos ids content-addressed img_a_<hash16>). */
import {
  collection, doc, onSnapshot, getDoc, getDocs, setDoc, writeBatch,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { diffElements, chunkOps } from './elementDiff';
import { newScene, newSceneId } from '../schema';
import { migrateSceneV2 } from '../migrations';

/* Firestore não aceita undefined — clone JSON remove. */
const clean = (x) => JSON.parse(JSON.stringify(x));

const mapDoc = (db, cid, ...segs) => doc(db, 'campaigns', cid, 'map', ...segs);

/* ── Assinaturas ─────────────────────────────────────────────────────────── */

export function subscribeMapState(db, cid, cb) {
  return onSnapshot(mapDoc(db, cid, 'state'),
    (snap) => cb(snap.exists() ? snap.data() : null),
    (e) => console.error('[mesa] snapshot do state falhou:', e));
}

/* Metadados de todas as cenas (painel do mestre + cena ativa de todos). */
export function subscribeScenes(db, cid, cb) {
  return onSnapshot(query(collection(db, 'campaigns', cid, 'map'), where('kind', '==', 'scene')),
    (snap) => cb(snap.docs.map(d => ({ ...d.data(), id: d.id })), snap.metadata.hasPendingWrites),
    (e) => console.error('[mesa] snapshot de cenas falhou:', e));
}

export function subscribeElements(db, cid, sceneId, cb) {
  return onSnapshot(collection(db, 'campaigns', cid, 'map', sceneId, 'elements'),
    (snap) => cb(snap.docs.map(d => d.data()), snap.metadata.hasPendingWrites),
    (e) => console.error('[mesa] snapshot de elementos falhou:', e));
}

/* ── Imagens (imutáveis → getDoc on-demand + cache de módulo) ────────────── */

const imgCache = new Map();

export async function getImage(db, cid, imageId) {
  const key = `${cid}/${imageId}`;
  if (imgCache.has(key)) return imgCache.get(key);
  try {
    const snap = await getDoc(mapDoc(db, cid, imageId));
    const data = snap.exists() ? snap.data().data : null;
    if (data) imgCache.set(key, data);
    return data;
  } catch (e) { console.error('[mesa] getImage falhou:', e); return null; }
}

const DOC_SAFE = 900_000;

function downscale(dataUrl, maxDim, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * r));
      c.height = Math.max(1, Math.round(img.height * r));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/* SHA-256 → 16 hex (ids img_a_*); fallback aleatório se crypto.subtle indisponível. */
export async function hashDataUrl(dataUrl) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl));
    return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
}

/* Sobe imagem reduzida. Com imageId (fluxo legado img_/img_tok_) preserva o id; sem, usa
 * content-addressing img_a_<hash16> com dedup (getDoc antes de setDoc — base p/ 0013). */
export async function saveImage(db, cid, imageId, dataUrl) {
  let data = dataUrl;
  if (data.length > DOC_SAFE) data = (await downscale(data, 1600, 0.82)) || data;
  if (data.length > DOC_SAFE) data = (await downscale(data, 1200, 0.7)) || data;
  if (data.length > DOC_SAFE) {
    alert('Imagem grande demais para a mesa mesmo após redução — use um arquivo menor.');
    return null;
  }
  let id = imageId;
  if (!id) {
    id = 'img_a_' + await hashDataUrl(data);
    const existing = await getDoc(mapDoc(db, cid, id)).catch(() => null);
    if (existing?.exists()) return { imageId: id, data };
  }
  try {
    await setDoc(mapDoc(db, cid, id), { kind: 'image', data, updatedAt: serverTimestamp() });
  } catch (e) { console.error('[mesa] save de imagem falhou:', e); return null; }
  imgCache.set(`${cid}/${id}`, data);
  return { imageId: id, data };
}

/* ── Escrita de cena/elementos (mestre) ──────────────────────────────────── */

/* Meta da cena (sem elements). */
export function saveSceneMeta(db, cid, uid, scene) {
  const { elements: _e, ...meta } = scene;
  return setDoc(mapDoc(db, cid, scene.id), {
    kind: 'scene', ...clean(meta), updatedAt: serverTimestamp(), updatedBy: uid,
  }).catch((e) => console.error('[mesa] save da cena falhou:', e));
}

/* Publica só o diff de elementos em batches. Devolve true se algo foi escrito. */
export async function publishElements(db, cid, sceneId, prevById, nextById) {
  const { adds, updates, deletes } = diffElements(prevById, nextById);
  if (!adds.length && !updates.length && !deletes.length) return false;
  const ops = [
    ...[...adds, ...updates].map(el => (b) => b.set(doc(db, 'campaigns', cid, 'map', sceneId, 'elements', el.id), clean(el))),
    ...deletes.map(id => (b) => b.delete(doc(db, 'campaigns', cid, 'map', sceneId, 'elements', id))),
  ];
  for (const chunk of chunkOps(ops)) {
    const b = writeBatch(db);
    chunk.forEach(f => f(b));
    await b.commit().catch((e) => console.error('[mesa] batch de elementos falhou:', e));
  }
  return true;
}

/* Membros da campanha p/ "Atribuir a…" (spec 0010 AC-2). */
export async function getCampaignMembers(db, cid) {
  try {
    const snap = await getDoc(doc(db, 'campaigns', cid));
    const d = snap.data() || {};
    return (d.members || []).map(m => ({ uid: m, name: d.memberNames?.[m] || m.slice(0, 6) }));
  } catch (e) { console.error('[mesa] membros falhou:', e); return []; }
}

/* Update de posição do PRÓPRIO elemento (jogador, spec 0010): merge só de x/y(/rotation)
 * — exatamente o affectedKeys que as rules v2 autorizam no modo 'owner'. */
export function updateElementPos(db, cid, sceneId, elId, pos) {
  return setDoc(doc(db, 'campaigns', cid, 'map', sceneId, 'elements', elId), pos, { merge: true })
    .catch((e) => console.error('[mesa] update de posição negado/falhou:', e));
}

export function setActiveScene(db, cid, uid, sceneId) {
  return setDoc(mapDoc(db, cid, 'state'), {
    v: 2, activeSceneId: sceneId, updatedAt: serverTimestamp(), updatedBy: uid,
  }).catch((e) => console.error('[mesa] setActiveScene falhou:', e));
}

export async function createScene(db, cid, uid, name) {
  const sc = newScene(name || 'Nova cena', newSceneId());
  await saveSceneMeta(db, cid, uid, sc);
  return sc.id;
}

export async function deleteScene(db, cid, sceneId) {
  try {
    const els = await getDocs(collection(db, 'campaigns', cid, 'map', sceneId, 'elements'));
    const ops = [
      ...els.docs.map(d => (b) => b.delete(d.ref)),
      (b) => b.delete(mapDoc(db, cid, sceneId)),
    ];
    for (const chunk of chunkOps(ops)) {
      const b = writeBatch(db);
      chunk.forEach(f => f(b));
      await b.commit();
    }
  } catch (e) { console.error('[mesa] deleteScene falhou:', e); }
}

/* ── Migração lazy v1→v2 (só mestre; idempotente — state.v2 é o marcador) ── */

export async function migrateFirestoreV2(db, cid, uid) {
  const stateSnap = await getDoc(mapDoc(db, cid, 'state')).catch(() => null);
  if (stateSnap?.exists() && stateSnap.data().v >= 2) return stateSnap.data();

  const legacySnap = await getDoc(mapDoc(db, cid, 'scene')).catch(() => null);
  const legacy = legacySnap?.exists() && legacySnap.data().scene && !legacySnap.data().migratedTo
    ? legacySnap.data().scene : null;

  const sceneId = legacy ? 's_legacy' : newSceneId();
  const sceneV2 = legacy
    ? { ...migrateSceneV2(legacy), id: sceneId }
    : newScene('Cena 1', sceneId);
  const { elements, ...meta } = sceneV2;

  // Cena + elementos primeiro; state (marcador de conclusão) + tombstone no último batch.
  const ops = [
    (b) => b.set(mapDoc(db, cid, sceneId), { kind: 'scene', ...clean(meta), updatedAt: serverTimestamp(), updatedBy: uid }),
    ...elements.map(el => (b) => b.set(doc(db, 'campaigns', cid, 'map', sceneId, 'elements', el.id), clean(el))),
    (b) => b.set(mapDoc(db, cid, 'state'), { v: 2, activeSceneId: sceneId, updatedAt: serverTimestamp(), updatedBy: uid }),
  ];
  if (legacy) ops.push((b) => b.set(mapDoc(db, cid, 'scene'), {
    engine: 'scene', migratedTo: sceneId, scene: null, updatedAt: serverTimestamp(), updatedBy: uid,
  }));
  for (const chunk of chunkOps(ops)) {
    const b = writeBatch(db);
    chunk.forEach(f => f(b));
    await b.commit();
  }
  return { v: 2, activeSceneId: sceneId };
}
