import { diffElements, chunkOps, byId } from '../sync/elementDiff';

const el = (id, x = 0) => ({ id, type: 'token', x, y: 0, layerId: 'layer-character' });

describe('diffElements', () => {
  it('detecta adds, updates e deletes', () => {
    const prev = byId([el('a'), el('b'), el('c')]);
    const next = byId([el('a'), el('b', 50), el('d')]);
    const d = diffElements(prev, next);
    expect(d.adds.map(e => e.id)).toEqual(['d']);
    expect(d.updates.map(e => e.id)).toEqual(['b']);
    expect(d.deletes).toEqual(['c']);
  });
  it('sem mudanças → tudo vazio (nenhum write)', () => {
    const prev = byId([el('a'), el('b')]);
    const d = diffElements(prev, byId([el('a'), el('b')]));
    expect(d).toEqual({ adds: [], updates: [], deletes: [] });
  });
});

describe('chunkOps', () => {
  it('divide em chunks de no máximo N', () => {
    const chunks = chunkOps(Array.from({ length: 950 }, (_, i) => i), 400);
    expect(chunks.map(c => c.length)).toEqual([400, 400, 150]);
  });
  it('lista vazia → nenhum chunk', () => {
    expect(chunkOps([], 400)).toEqual([]);
  });
});
