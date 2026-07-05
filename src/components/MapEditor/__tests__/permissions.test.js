import { canMove, canCreate, canDelete } from '../permissions';

const scene = {
  layers: [
    { id: 'layer-character', locked: false },
    { id: 'layer-map', locked: true },
    { id: 'layer-prop', locked: false },
  ],
  permissions: {
    'layer-character': { update: 'owner', delete: 'owner' },
    'layer-prop': { update: 'all', create: true },
  },
};
const own   = { id: 'a', layerId: 'layer-character', ownerId: 'p1', locked: false };
const alien = { id: 'b', layerId: 'layer-character', ownerId: 'p2', locked: false };

describe('canMove', () => {
  it('mestre sempre pode', () => expect(canMove(scene, alien, 'gm', true)).toBe(true));
  it('dono move o próprio em camada owner', () => expect(canMove(scene, own, 'p1', false)).toBe(true));
  it('não move token alheio em camada owner', () => expect(canMove(scene, alien, 'p1', false)).toBe(false));
  it('modo all libera qualquer membro', () =>
    expect(canMove(scene, { ...alien, layerId: 'layer-prop' }, 'p1', false)).toBe(true));
  it('camada sem permissão bloqueia', () =>
    expect(canMove(scene, { ...own, layerId: 'layer-map' }, 'p1', false)).toBe(false));
  it('elemento locked bloqueia', () => expect(canMove(scene, { ...own, locked: true }, 'p1', false)).toBe(false));
  it('camada locked bloqueia mesmo com owner', () =>
    expect(canMove({ ...scene, layers: [{ id: 'layer-character', locked: true }] }, own, 'p1', false)).toBe(false));
});

describe('canCreate / canDelete', () => {
  it('create true na camada libera', () => expect(canCreate(scene, 'layer-prop', 'p1', false)).toBe(true));
  it('create ausente bloqueia', () => expect(canCreate(scene, 'layer-character', 'p1', false)).toBe(false));
  it('delete owner só do dono', () => {
    expect(canDelete(scene, own, 'p1', false)).toBe(true);
    expect(canDelete(scene, alien, 'p1', false)).toBe(false);
  });
  it('mestre deleta qualquer', () => expect(canDelete(scene, alien, 'gm', true)).toBe(true));
});
