/* Biblioteca de assets do usuário (spec 0013 / ADR 0006 §4).
 * users/{uid}/assets/{assetId} = { type, name, tags[], folder, data, hash, w, h }. */
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export const ASSET_TYPES = ['map', 'prop', 'mount', 'character', 'attachment', 'note'];
export const ASSET_TYPE_LABEL = {
  map: 'Mapas', prop: 'Props', mount: 'Montarias',
  character: 'Personagens', attachment: 'Anexos', note: 'Notas',
};
export const ASSET_SOFT_CAP = 300;

const TYPE_LAYER = {
  map: 'layer-map', prop: 'layer-prop', mount: 'layer-mount',
  character: 'layer-character', attachment: 'layer-attachment', note: 'layer-note',
};
const LAYER_TYPE = Object.fromEntries(Object.entries(TYPE_LAYER).map(([t, l]) => [l, t]));

export const layerForAssetType = (type) => TYPE_LAYER[type] || 'layer-prop';

/* Tipo de asset ao salvar um elemento da cena na biblioteca. */
export function assetTypeForElement(el) {
  if (el.type === 'note') return 'note';
  return LAYER_TYPE[el.layerId] || (el.type === 'token' ? 'character' : 'prop');
}

/* Elementos criados: mapa/prop/montaria = image; personagem/anexo = token com imagem; nota. */
export const assetPlacesAsToken = (type) => type === 'character' || type === 'attachment';
export const assetPlacesAsNote = (type) => type === 'note';

export function filterAssets(assets, { q = '', tag = null } = {}) {
  const needle = q.trim().toLowerCase();
  return (assets || []).filter(a =>
    (!needle || (a.name || '').toLowerCase().includes(needle)) &&
    (!tag || (a.tags || []).includes(tag)));
}

export function assetTags(assets) {
  const set = new Set();
  (assets || []).forEach(a => (a.tags || []).forEach(t => set.add(t)));
  return [...set].sort();
}

let _seq = 0;
export const newAssetId = () => `as_${Date.now()}_${(_seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/* ── Firestore ── */
export function subscribeAssets(db, uid, cb) {
  return onSnapshot(collection(db, 'users', uid, 'assets'),
    (snap) => cb(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
    (e) => console.error('[assets] snapshot falhou:', e));
}

export function saveAsset(db, uid, asset) {
  const id = asset.id || newAssetId();
  return setDoc(doc(db, 'users', uid, 'assets', id),
    { ...asset, id, updatedAt: serverTimestamp() })
    .catch((e) => console.error('[assets] save falhou:', e));
}

export function deleteAsset(db, uid, id) {
  return deleteDoc(doc(db, 'users', uid, 'assets', id))
    .catch((e) => console.error('[assets] delete falhou:', e));
}
