import { renderHook } from "@testing-library/react";
import { useCharacter } from "../useCharacter";

jest.mock("../../firebase", () => ({ db: {} }));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
}));

describe("useCharacter", () => {
  it("retorna array vazio e charsLoading false quando uid é null", () => {
    const { result } = renderHook(() => useCharacter(null, null));
    expect(result.current.characters).toEqual([]);
    expect(result.current.charsLoading).toBe(false);
    expect(typeof result.current.saveCharacter).toBe("function");
    expect(typeof result.current.deleteCharacter).toBe("function");
  });
});
