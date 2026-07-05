/* Permissões client-side do mapa (spec 0010 / ADR 0006 §6). Espelham as rules —
 * o gate real é o Firestore; aqui é UX (bloquear drag/cursor). Funções puras. */

const perm = (scene, layerId, action) => scene?.permissions?.[layerId]?.[action] ?? false;
const layerOf = (scene, layerId) => (scene?.layers || []).find(l => l.id === layerId);

export function canMove(scene, el, uid, isMaster) {
  if (isMaster) return true;
  if (!el || el.locked || !uid) return false;
  if (layerOf(scene, el.layerId)?.locked) return false;
  const p = perm(scene, el.layerId, 'update');
  if (p === 'all') return true;
  if (p === 'owner') return el.ownerId === uid;
  return false;
}

export function canCreate(scene, layerId, uid, isMaster) {
  if (isMaster) return true;
  if (!uid) return false;
  if (layerOf(scene, layerId)?.locked) return false;
  return perm(scene, layerId, 'create') === true;
}

export function canDelete(scene, el, uid, isMaster) {
  if (isMaster) return true;
  if (!el || el.locked || !uid) return false;
  if (layerOf(scene, el.layerId)?.locked) return false;
  return perm(scene, el.layerId, 'delete') === 'owner' && el.ownerId === uid;
}
