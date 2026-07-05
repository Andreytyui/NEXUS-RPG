import { anchorOf, findAttachTarget, subtreeIds, wouldCycle, dupSubtree } from '../attach';

const scene = { layers: [
  { id: 'layer-mount', visible: true }, { id: 'layer-character', visible: true },
  { id: 'layer-attachment', visible: true },
] };
const mount = { id: 'M', type: 'image', layerId: 'layer-mount', x: 0, y: 0, w: 200, h: 100, z: 1 };
const hero  = { id: 'H', type: 'token', layerId: 'layer-character', x: 300, y: 300, size: 70, z: 2, parentId: null };
const sword = { id: 'S', type: 'token', layerId: 'layer-attachment', x: 500, y: 500, size: 35, z: 3, parentId: null };

describe('anchorOf', () => {
  it('token usa (x,y); imagem usa centro do bbox', () => {
    expect(anchorOf(hero)).toEqual({ x: 300, y: 300 });
    expect(anchorOf(mount)).toEqual({ x: 100, y: 50 });
  });
});

describe('findAttachTarget', () => {
  const els = [mount, hero, sword];
  it('anexo sobre personagem gruda (hit circular)', () => {
    expect(findAttachTarget(scene, els, sword, 310, 310)?.id).toBe('H');
    expect(findAttachTarget(scene, els, sword, 300 + 40, 300)).toBeNull(); // fora do raio (35)
  });
  it('personagem sobre montaria gruda (hit retangular); anexo NÃO gruda em montaria', () => {
    expect(findAttachTarget(scene, els, hero, 50, 50)?.id).toBe('M');
    expect(findAttachTarget(scene, els, sword, 50, 50)).toBeNull();
  });
  it('alvo escondido ou em camada invisível não gruda', () => {
    expect(findAttachTarget(scene, [mount, { ...hero, hidden: true }, sword], sword, 300, 300)).toBeNull();
    const sc2 = { layers: [{ id: 'layer-character', visible: false }] };
    expect(findAttachTarget(sc2, els, sword, 300, 300)).toBeNull();
  });
  it('empate resolve pelo maior z e exclui a própria subárvore', () => {
    const h2 = { ...hero, id: 'H2', z: 9 };
    expect(findAttachTarget(scene, [mount, hero, h2, sword], sword, 300, 300)?.id).toBe('H2');
    const childOfSword = { ...hero, id: 'HC', parentId: 'S' };
    expect(findAttachTarget(scene, [childOfSword, sword], sword, 300, 300)).toBeNull();
  });
});

describe('subtreeIds / wouldCycle', () => {
  const els = [
    { id: 'M', parentId: null }, { id: 'H', parentId: 'M' },
    { id: 'S', parentId: 'H' }, { id: 'X', parentId: null },
  ];
  it('coleta raiz + descendentes recursivos', () => {
    expect(subtreeIds(els, 'M').sort()).toEqual(['H', 'M', 'S']);
    expect(subtreeIds(els, 'H').sort()).toEqual(['H', 'S']);
  });
  it('não trava com ciclo corrompido', () => {
    const bad = [{ id: 'A', parentId: 'B' }, { id: 'B', parentId: 'A' }];
    expect(subtreeIds(bad, 'A').sort()).toEqual(['A', 'B']);
  });
  it('wouldCycle detecta vínculo que fecharia ciclo', () => {
    expect(wouldCycle(els, 'M', 'S')).toBe(true);  // montar M em S (neto) = ciclo
    expect(wouldCycle(els, 'S', 'X')).toBe(false);
  });
});

describe('dupSubtree', () => {
  it('remapeia vínculos, aplica offset e solta a raiz', () => {
    const els = [
      { id: 'H', type: 'token', x: 10, y: 10, parentId: 'M', z: 2 },
      { id: 'S', type: 'token', x: 20, y: 20, parentId: 'H', z: 3 },
      { id: 'M', type: 'image', x: 0, y: 0, parentId: null, z: 1 },
    ];
    let n = 0;
    const copies = dupSubtree(els, 'H', () => 'n' + (n++));
    expect(copies).toHaveLength(2);
    const [h2, s2] = copies;
    expect(h2.parentId).toBeNull();          // raiz da cópia nasce solta
    expect(s2.parentId).toBe(h2.id);         // filho aponta pra cópia do pai
    expect(h2.x).toBe(40); expect(s2.y).toBe(50);
  });
});
