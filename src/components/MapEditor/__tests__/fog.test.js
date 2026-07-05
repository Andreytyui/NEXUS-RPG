import {
  simplify, strokeToPoly, shapeBBox, containsShape, pruneContained,
  pointInShape, hitFogShape,
} from '../fog';

const rect = (id, x, y, w, h, op = 'add') => ({ id, op, type: 'rect', x, y, w, h });
const circ = (id, cx, cy, r, op = 'add') => ({ id, op, type: 'circle', cx, cy, r });
const poly = (id, points, op = 'add') => ({ id, op, type: 'poly', points });

describe('simplify / strokeToPoly (Douglas-Peucker)', () => {
  it('colapsa pontos colineares e preserva cantos', () => {
    const pts = [
      { x: 0, y: 0 }, { x: 10, y: 0.5 }, { x: 20, y: 0 }, { x: 40, y: 1 },
      { x: 100, y: 0 }, { x: 100, y: 100 },
    ];
    const out = simplify(pts, 4);
    expect(out.length).toBeLessThan(pts.length);
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[out.length - 1]).toEqual({ x: 100, y: 100 });
    expect(out).toContainEqual({ x: 100, y: 0 }); // canto preservado
  });
  it('traço degenerado (<3 vértices) → []', () => {
    expect(strokeToPoly([{ x: 0, y: 0 }, { x: 50, y: 1 }, { x: 100, y: 0 }], 4)).toEqual([]);
  });
  it('traço válido fecha como polígono arredondado', () => {
    const tri = [{ x: 0, y: 0 }, { x: 100.4, y: 0 }, { x: 50, y: 90.6 }];
    expect(strokeToPoly(tri, 4)).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 91 }]);
  });
});

describe('shapeBBox / pointInShape', () => {
  it('bbox por tipo', () => {
    expect(shapeBBox(rect('a', 10, 20, 30, 40))).toEqual({ x: 10, y: 20, w: 30, h: 40 });
    expect(shapeBBox(circ('b', 50, 50, 10))).toEqual({ x: 40, y: 40, w: 20, h: 20 });
    expect(shapeBBox(poly('c', [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 8 }])))
      .toEqual({ x: 0, y: 0, w: 10, h: 8 });
  });
  it('point-in-poly funciona em polígono CÔNCAVO', () => {
    const u = poly('u', [ // formato de U
      { x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 30 }, { x: 20, y: 30 },
      { x: 20, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 30 }, { x: 0, y: 30 },
    ]);
    expect(pointInShape(u, 5, 20)).toBe(true);    // perna esquerda
    expect(pointInShape(u, 15, 20)).toBe(false);  // vão do U
    expect(pointInShape(u, 15, 5)).toBe(true);    // topo
  });
});

describe('containsShape', () => {
  it('rect contém rect/círculo/poly por vértices; poly nunca é contêiner', () => {
    const big = rect('big', 0, 0, 100, 100);
    expect(containsShape(big, rect('s', 10, 10, 20, 20))).toBe(true);
    expect(containsShape(big, rect('s', 90, 90, 20, 20))).toBe(false);
    expect(containsShape(big, circ('c', 50, 50, 40))).toBe(true);
    expect(containsShape(big, poly('p', [{ x: 1, y: 1 }, { x: 9, y: 1 }, { x: 5, y: 9 }]))).toBe(true);
    expect(containsShape(poly('p', [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 100, y: 200 }]), rect('s', 90, 10, 5, 5))).toBe(false);
  });
  it('círculo contém círculo por distância+raio (exato)', () => {
    expect(containsShape(circ('o', 0, 0, 100), circ('i', 30, 0, 50))).toBe(true);
    expect(containsShape(circ('o', 0, 0, 100), circ('i', 60, 0, 50))).toBe(false);
  });
});

describe('pruneContained (AC-6)', () => {
  it('add contido em add é podado', () => {
    const shapes = [rect('big', 0, 0, 100, 100), rect('in', 10, 10, 20, 20)];
    expect(pruneContained(shapes).map(s => s.id)).toEqual(['big']);
  });
  it('cut entre os adds na ordem IMPEDE a poda (semântica sequencial)', () => {
    const shapes = [rect('big', 0, 0, 100, 100), rect('hole', 5, 5, 30, 30, 'cut'), rect('in', 10, 10, 20, 20)];
    expect(pruneContained(shapes).map(s => s.id)).toEqual(['big', 'hole', 'in']);
  });
  it('cuts nunca são podados; sem contenção devolve o MESMO array', () => {
    const shapes = [rect('a', 0, 0, 50, 50), rect('c', 10, 10, 10, 10, 'cut')];
    expect(pruneContained(shapes)).toBe(shapes);
  });
});

describe('hitFogShape (AC-7)', () => {
  it('devolve a forma topmost (última na ordem) e null fora de todas', () => {
    const shapes = [rect('below', 0, 0, 100, 100), circ('top', 50, 50, 20)];
    expect(hitFogShape(shapes, 50, 50)?.id).toBe('top');
    expect(hitFogShape(shapes, 5, 5)?.id).toBe('below');
    expect(hitFogShape(shapes, 500, 500)).toBeNull();
  });
});
