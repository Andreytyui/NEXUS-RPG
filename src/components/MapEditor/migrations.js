/* Migração de cenas para o schema v2 (spec 0009 / ADR 0006). Funções puras. */
import { SCHEMA_V, DEFAULT_LAYERS_V2, defaultGrid, defaultFog, defaultPermissions } from './schema';

/* v1 → v2: layer-objects→Prop, layer-tokens→Personagem; Mapa e Desenho mantêm o id. */
const LAYER_REMAP = { 'layer-objects': 'layer-prop', 'layer-tokens': 'layer-character' };

/* fogCells ["c,r", ...] → shapes rect (op:add) com merge horizontal por linha. */
export function fogCellsToShapes(cells, gridSize) {
  if (!cells || !cells.length) return [];
  const byRow = new Map();
  for (const key of cells) {
    const [c, r] = key.split(',').map(Number);
    if (!byRow.has(r)) byRow.set(r, []);
    byRow.get(r).push(c);
  }
  const shapes = [];
  let i = 0;
  for (const [r, cols] of [...byRow.entries()].sort((a, b) => a[0] - b[0])) {
    cols.sort((a, b) => a - b);
    let start = cols[0], prev = cols[0];
    const flush = (end) => shapes.push({
      id: `fog_m${i++}`, op: 'add', type: 'rect',
      x: start * gridSize, y: r * gridSize, w: (end - start + 1) * gridSize, h: gridSize,
    });
    for (let k = 1; k < cols.length; k++) {
      if (cols[k] === prev + 1) { prev = cols[k]; continue; }
      flush(prev); start = prev = cols[k];
    }
    flush(prev);
  }
  return shapes;
}

/* Migra UMA cena (qualquer versão ≤ v2) para v2. Idempotente. */
export function migrateSceneV2(sc) {
  if (sc.schemaV >= SCHEMA_V) return sc;
  const gridSize = sc.gridSize || 70;

  const layers = DEFAULT_LAYERS_V2.map(def => {
    const legacyId = Object.keys(LAYER_REMAP).find(k => LAYER_REMAP[k] === def.id) || def.id;
    const old = (sc.layers || []).find(l => l.id === def.id || l.id === legacyId);
    return old ? { ...def, visible: old.visible !== false, locked: !!old.locked, opacity: old.opacity ?? 1 } : def;
  });

  const elements = (sc.elements || []).map((el, i) => ({
    ...el,
    layerId: el.type === 'note' ? 'layer-note' : (LAYER_REMAP[el.layerId] || el.layerId || 'layer-prop'),
    ownerId: el.ownerId ?? null,
    parentId: el.parentId ?? null,
    z: el.z ?? i,
    rotation: el.rotation ?? 0,
  }));

  const { fogCells: _f, gridSize: _g, ...rest } = sc;
  return {
    ...rest,
    schemaV: SCHEMA_V,
    layers, elements,
    grid: sc.grid || { ...defaultGrid(), size: gridSize },
    fog: sc.fog?.v === 2 ? sc.fog : { ...defaultFog(), shapes: fogCellsToShapes(sc.fogCells, gridSize) },
    permissions: sc.permissions || defaultPermissions(),
    bgSize: sc.bgSize || { w: 3000, h: 2000 },
  };
}
