/* Helpers puros do Editor de Mapas (spec 0019) — sem React, sem DOM, testáveis.
 * Extraídos para corrigir bugs de snap, empilhamento e vazamento de imagens. */

/** Snap ao CENTRO da célula (não à interseção das linhas) — para tokens (x,y = centro). */
export function cellCenterSnap(x, y, gs) {
  const g = gs > 0 ? gs : 70;
  return {
    x: Math.round(x / g - 0.5) * g + g / 2,
    y: Math.round(y / g - 0.5) * g + g / 2,
  };
}

/** zIndex de render: a ordem da camada domina; o `z` do elemento desempata dentro dela.
 *  Assim "trazer para frente/enviar para trás" tem efeito mesmo entre tipos diferentes,
 *  e a ordem das camadas é sempre respeitada (spec 0019 AC-3). */
export function layerZIndex(layerIdx, z = 0) {
  const li = Number.isFinite(layerIdx) ? Math.max(0, Math.floor(layerIdx)) : 0;
  const zz = Number.isFinite(z) ? z : 0;
  // z fica numa janela de ±50000 para não invadir a camada vizinha.
  const clamped = Math.max(-49999, Math.min(49999, zz));
  return li * 100000 + 50000 + clamped;
}

/** IDs de imagem em `imageStore` que nenhum elemento (nem id de cena legado) referencia mais.
 *  Usado para varrer órfãos e não estourar a quota do localStorage (spec 0019 AC-11). */
export function collectOrphanImageIds(scenes, imageStore) {
  const used = new Set();
  for (const sc of scenes || []) {
    if (sc && sc.id) used.add(sc.id); // fundo legado por id de cena
    for (const el of (sc && sc.elements) || []) {
      if (el && el.imageId) used.add(el.imageId);
    }
  }
  return Object.keys(imageStore || {}).filter((id) => !used.has(id));
}
