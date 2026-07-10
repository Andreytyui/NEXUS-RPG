import { historyReducer } from '../reducer';

function freshState() {
  // duas camadas mínimas, sem localStorage
  const scenes = [{ id: 's1', schemaV: 2, elements: [], layers: [
    { id: 'layer-map', name: 'Mapa', type: 'map', visible: true, locked: true, opacity: 1 },
    { id: 'layer-character', name: 'Personagens', type: 'character', visible: true, locked: false, opacity: 1 },
  ], fog: { v: 2, fillAll: false, shapes: [] }, grid: { size: 70 }, bgSize: { w: 100, h: 100 } }];
  return { past: [], present: scenes, future: [], coalesceKey: null };
}

describe('historyReducer — coalescência (spec 0019 AC-7)', () => {
  it('passos com o MESMO coalesceKey viram UM único passo de undo', () => {
    let st = freshState();
    st = historyReducer(st, { type: 'SET_LAYER_PROP', sceneId: 's1', layerId: 'layer-character', prop: 'opacity', value: 0.8, coalesceKey: 'op:layer-character' });
    st = historyReducer(st, { type: 'SET_LAYER_PROP', sceneId: 's1', layerId: 'layer-character', prop: 'opacity', value: 0.6, coalesceKey: 'op:layer-character' });
    st = historyReducer(st, { type: 'SET_LAYER_PROP', sceneId: 's1', layerId: 'layer-character', prop: 'opacity', value: 0.4, coalesceKey: 'op:layer-character' });
    expect(st.past).toHaveLength(1);                 // só o estado pré-arrasto ficou no histórico
    expect(st.present[0].layers[1].opacity).toBe(0.4);
    const undone = historyReducer(st, { type: 'UNDO' });
    expect(undone.present[0].layers[1].opacity).toBe(1); // um Ctrl+Z reverte o arrasto inteiro
  });

  it('coalesceKeys DIFERENTES não se fundem', () => {
    let st = freshState();
    st = historyReducer(st, { type: 'PATCH_SCENE', sceneId: 's1', coalesceKey: 'fog_1', patch: { fog: { v: 2, fillAll: false, shapes: [{ id: 'a' }] } } });
    st = historyReducer(st, { type: 'PATCH_SCENE', sceneId: 's1', coalesceKey: 'fog_2', patch: { fog: { v: 2, fillAll: false, shapes: [{ id: 'a' }, { id: 'b' }] } } });
    expect(st.past).toHaveLength(2); // dois arrastos distintos = dois passos
  });

  it('ação sem coalesceKey sempre empilha', () => {
    let st = freshState();
    st = historyReducer(st, { type: 'ADD_ELEMENT', sceneId: 's1', element: { id: 'e1', type: 'token', layerId: 'layer-character', x: 0, y: 0 } });
    st = historyReducer(st, { type: 'ADD_ELEMENT', sceneId: 's1', element: { id: 'e2', type: 'token', layerId: 'layer-character', x: 0, y: 0 } });
    expect(st.past).toHaveLength(2);
  });
});

describe('historyReducer — REORDER_LAYERS (spec 0019 AC-2)', () => {
  it('substitui a ordem das camadas e entra no histórico', () => {
    let st = freshState();
    const swapped = [st.present[0].layers[1], st.present[0].layers[0]];
    st = historyReducer(st, { type: 'REORDER_LAYERS', sceneId: 's1', layers: swapped });
    expect(st.present[0].layers.map(l => l.id)).toEqual(['layer-character', 'layer-map']);
    expect(st.past).toHaveLength(1);
    const undone = historyReducer(st, { type: 'UNDO' });
    expect(undone.present[0].layers.map(l => l.id)).toEqual(['layer-map', 'layer-character']);
  });
});
