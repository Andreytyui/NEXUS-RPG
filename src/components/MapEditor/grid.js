/* Math de grid (spec 0009). Só quadrado por ora — hex/fórmulas chegam na 0014. */

export const cellSize = (scene) => scene?.grid?.size || 70;

export function snapPoint(scene, x, y) {
  const g = cellSize(scene);
  return { x: Math.round(x / g) * g, y: Math.round(y / g) * g };
}

export function cellRect(scene, c, r) {
  const g = cellSize(scene);
  return { x: c * g, y: r * g, w: g, h: g };
}

/* Distância entre dois pontos de mundo, em células e na unidade da cena. */
export function measure(scene, a, b) {
  const g = cellSize(scene);
  const cells = Math.hypot(b.x - a.x, b.y - a.y) / g;
  const scale = scene?.grid?.scale || { value: 1.5, unit: 'm' };
  return { cells: Math.round(cells * 10) / 10, dist: Math.round(cells * scale.value * 10) / 10, unit: scale.unit };
}
