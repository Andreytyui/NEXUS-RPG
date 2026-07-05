import {
  layerForAssetType, assetTypeForElement, assetPlacesAsToken, assetPlacesAsNote,
  filterAssets, assetTags, newAssetId, ASSET_TYPES,
} from '../assetLib';

describe('mapeamento tipo↔camada', () => {
  it('layerForAssetType cobre os 6 tipos', () => {
    expect(ASSET_TYPES.map(layerForAssetType)).toEqual([
      'layer-map', 'layer-prop', 'layer-mount', 'layer-character', 'layer-attachment', 'layer-note',
    ]);
    expect(layerForAssetType('desconhecido')).toBe('layer-prop');
  });
  it('assetTypeForElement deriva do layerId (e note por tipo)', () => {
    expect(assetTypeForElement({ type: 'token', layerId: 'layer-character' })).toBe('character');
    expect(assetTypeForElement({ type: 'image', layerId: 'layer-map' })).toBe('map');
    expect(assetTypeForElement({ type: 'note', layerId: 'layer-note' })).toBe('note');
    expect(assetTypeForElement({ type: 'token', layerId: 'layer-desconhecida' })).toBe('character');
  });
  it('classificadores de colocação', () => {
    expect(assetPlacesAsToken('character')).toBe(true);
    expect(assetPlacesAsToken('attachment')).toBe(true);
    expect(assetPlacesAsToken('map')).toBe(false);
    expect(assetPlacesAsNote('note')).toBe(true);
  });
});

describe('filterAssets', () => {
  const assets = [
    { id: 'a', name: 'Goblin', tags: ['monstro', 'comum'] },
    { id: 'b', name: 'Golem de Pedra', tags: ['monstro'] },
    { id: 'c', name: 'Baú', tags: ['prop'] },
  ];
  it('busca por nome case-insensitive', () => {
    expect(filterAssets(assets, { q: 'GO' }).map(a => a.id)).toEqual(['a', 'b']); // Goblin, Golem
    expect(filterAssets(assets, { q: 'gol' }).map(a => a.id)).toEqual(['b']);     // só Golem
  });
  it('filtra por tag', () => {
    expect(filterAssets(assets, { tag: 'monstro' }).map(a => a.id)).toEqual(['a', 'b']);
  });
  it('combina busca + tag', () => {
    expect(filterAssets(assets, { q: 'golem', tag: 'monstro' }).map(a => a.id)).toEqual(['b']);
  });
  it('sem filtro devolve tudo', () => {
    expect(filterAssets(assets, {})).toHaveLength(3);
  });
});

describe('assetTags / newAssetId', () => {
  it('união ordenada de tags', () => {
    expect(assetTags([{ tags: ['b', 'a'] }, { tags: ['a', 'c'] }, {}])).toEqual(['a', 'b', 'c']);
  });
  it('ids únicos com prefixo as_', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newAssetId()));
    expect(ids.size).toBe(50);
    expect([...ids][0]).toMatch(/^as_/);
  });
});
