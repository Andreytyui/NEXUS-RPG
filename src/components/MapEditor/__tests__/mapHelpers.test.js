import { cellCenterSnap, layerZIndex, collectOrphanImageIds } from '../mapHelpers';

describe('cellCenterSnap (AC-9)', () => {
  it('snaps to cell CENTER, not to the grid intersection', () => {
    // gs=70 → centros em 35, 105, 175… (nunca em múltiplos de 70)
    expect(cellCenterSnap(10, 10, 70)).toEqual({ x: 35, y: 35 });
    expect(cellCenterSnap(69, 1, 70)).toEqual({ x: 35, y: 35 });
    expect(cellCenterSnap(71, 71, 70)).toEqual({ x: 105, y: 105 });
  });
  it('is idempotente sobre um centro de célula', () => {
    const c = cellCenterSnap(200, 200, 70);
    expect(cellCenterSnap(c.x, c.y, 70)).toEqual(c);
  });
  it('tolera gridSize inválido (fallback 70)', () => {
    expect(cellCenterSnap(10, 10, 0)).toEqual({ x: 35, y: 35 });
  });
});

describe('layerZIndex (AC-3)', () => {
  it('a ordem da camada domina o z do elemento', () => {
    // qualquer elemento de uma camada acima fica sobre qualquer um da camada abaixo
    expect(layerZIndex(1, -49999)).toBeGreaterThan(layerZIndex(0, 49999));
  });
  it('dentro da mesma camada, maior z fica na frente', () => {
    expect(layerZIndex(2, 5)).toBeGreaterThan(layerZIndex(2, 4));
  });
  it('z é clampado para não invadir a camada vizinha', () => {
    expect(layerZIndex(0, 1e9)).toBeLessThan(layerZIndex(1, -1e9));
  });
  it('tolera entradas inválidas', () => {
    expect(layerZIndex(NaN, NaN)).toBe(50000);
  });
});

describe('collectOrphanImageIds (AC-11)', () => {
  const scenes = [
    { id: 's1', elements: [{ id: 'e1', imageId: 'img_a' }, { id: 'e2', type: 'token' }] },
    { id: 's2', elements: [{ id: 'e3', imageId: 'img_b' }] },
  ];
  it('lista só os ids não referenciados por nenhum elemento', () => {
    const store = { img_a: 'x', img_b: 'y', img_orphan: 'z' };
    expect(collectOrphanImageIds(scenes, store)).toEqual(['img_orphan']);
  });
  it('preserva fundo legado chaveado pelo id da cena', () => {
    const store = { s1: 'bg', img_a: 'x', img_b: 'y' };
    expect(collectOrphanImageIds(scenes, store)).toEqual([]);
  });
  it('retorna vazio quando tudo é usado ou store vazio', () => {
    expect(collectOrphanImageIds(scenes, {})).toEqual([]);
    expect(collectOrphanImageIds([], { a: 1 })).toEqual(['a']);
  });
});
