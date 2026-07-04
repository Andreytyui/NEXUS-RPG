/* Spec 0007 — helper puro do sync da mesa. */
import { splitMapDocs } from "../campaignSync";

describe("splitMapDocs", () => {
  it("separa doc scene de docs de imagem e ignora o legado map/current (tiles)", () => {
    const scene = { id: "s1", name: "Cena 1", elements: [], fogCells: [], gridSize: 70 };
    const { scene: sc, images } = splitMapDocs([
      { id: "current", data: { tiles: [1, 2], fog: [true], cols: 2, rows: 1 } }, // legado
      { id: "scene", data: { engine: "scene", scene } },
      { id: "img_123", data: { kind: "image", data: "data:image/jpeg;base64,AAA" } },
      { id: "img_456", data: { kind: "image" } }, // sem payload — ignorada
    ]);
    expect(sc).toEqual(scene);
    expect(images).toEqual({ img_123: "data:image/jpeg;base64,AAA" });
  });

  it("coleção vazia ou doc scene malformado ⇒ scene null, sem imagens", () => {
    expect(splitMapDocs([])).toEqual({ scene: null, images: {} });
    expect(splitMapDocs([{ id: "scene", data: { engine: "scene" } }]).scene).toBeNull();
  });
});
