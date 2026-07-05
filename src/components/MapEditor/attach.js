/* Auto-grudar estilo Owlbear (spec 0011): anexo→personagem, personagem→montaria.
 * Funções puras sobre elements[] com parentId/z. */

export const ATTACH_RULES = {
  'layer-attachment': ['layer-character'],
  'layer-character': ['layer-mount'],
};

/* Âncora do elemento: token tem (x,y) no centro; os demais usam o centro do bbox. */
export const anchorOf = (el) =>
  el.type === 'token' ? { x: el.x, y: el.y } : { x: el.x + (el.w || 0) / 2, y: el.y + (el.h || 0) / 2 };

/* Ids da subárvore (raiz incluída). Tolera ciclos em dados corrompidos. */
export function subtreeIds(elements, rootId) {
  const childrenOf = new Map();
  elements.forEach(e => {
    if (!e.parentId) return;
    if (!childrenOf.has(e.parentId)) childrenOf.set(e.parentId, []);
    childrenOf.get(e.parentId).push(e.id);
  });
  const out = [], seen = new Set(), stack = [rootId];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id); out.push(id);
    (childrenOf.get(id) || []).forEach(c => stack.push(c));
  }
  return out;
}

/* Vincular childId a parentId fecharia ciclo? (parentId dentro da subárvore do child) */
export const wouldCycle = (elements, childId, parentId) =>
  subtreeIds(elements, childId).includes(parentId);

function hit(target, x, y) {
  if (target.type === 'token') {
    return Math.hypot(x - target.x, y - target.y) <= (target.size || 36) / 2;
  }
  const w = target.w || 0, h = target.h || 0;
  return x >= target.x && x <= target.x + w && y >= target.y && y <= target.y + h;
}

/* Alvo de anexação no ponto (x,y): camada permitida pela regra, visível, fora da própria
 * subárvore; empate resolve pelo maior z (topmost). Null = sem alvo (desanexa). */
export function findAttachTarget(scene, elements, el, x, y) {
  const allowed = ATTACH_RULES[el.layerId];
  if (!allowed) return null;
  const layerVisible = Object.fromEntries((scene?.layers || []).map(l => [l.id, l.visible !== false]));
  const forbidden = new Set(subtreeIds(elements, el.id));
  const candidates = elements.filter(t =>
    t.id !== el.id && allowed.includes(t.layerId) && !t.hidden
    && layerVisible[t.layerId] !== false && !forbidden.has(t.id) && hit(t, x, y));
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => (b.z ?? 0) - (a.z ?? 0))[0];
}

/* Duplica a subárvore com ids novos e vínculos remapeados; a cópia da raiz nasce solta. */
export function dupSubtree(elements, rootId, idGen, offset = 30) {
  const ids = subtreeIds(elements, rootId);
  const map = {};
  ids.forEach(id => { map[id] = idGen(); });
  return ids.map(id => {
    const el = elements.find(e => e.id === id);
    return {
      ...el, id: map[id], x: el.x + offset, y: el.y + offset,
      parentId: id === rootId ? null : (map[el.parentId] ?? null),
      z: (el.z ?? 0) + 1,
    };
  });
}
