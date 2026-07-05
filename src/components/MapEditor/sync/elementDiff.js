/* Diff puro de elementos por id (spec 0009 AC-4 / ADR 0006 §2). */

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* prevById/nextById: { [id]: element }. Devolve { adds, updates, deletes }. */
export function diffElements(prevById, nextById) {
  const adds = [], updates = [], deletes = [];
  for (const id of Object.keys(nextById)) {
    if (!prevById[id]) adds.push(nextById[id]);
    else if (!same(prevById[id], nextById[id])) updates.push(nextById[id]);
  }
  for (const id of Object.keys(prevById)) {
    if (!nextById[id]) deletes.push(id);
  }
  return { adds, updates, deletes };
}

/* Divide uma lista de ops em chunks ≤ max (limite 500 ops/batch do Firestore). */
export function chunkOps(ops, max = 400) {
  const out = [];
  for (let i = 0; i < ops.length; i += max) out.push(ops.slice(i, i + max));
  return out;
}

export const byId = (elements) => Object.fromEntries((elements || []).map(e => [e.id, e]));
