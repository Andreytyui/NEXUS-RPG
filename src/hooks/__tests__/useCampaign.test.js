import { renderHook } from "@testing-library/react";
import { useCampaign } from "../useCampaign";

jest.mock("../../firebase", () => ({ db: {} }));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn().mockReturnValue(() => {}),
  getDocs: jest.fn().mockResolvedValue({ size: 0, docs: [] }),
  doc: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({ id: "new-id" }),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  serverTimestamp: jest.fn().mockReturnValue(null),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
}));

describe("useCampaign", () => {
  it("retorna array vazio quando uid é null", () => {
    const { result } = renderHook(() => useCampaign(null, ""));
    expect(result.current.campaigns).toEqual([]);
    expect(typeof result.current.createCampaign).toBe("function");
    expect(typeof result.current.joinCampaign).toBe("function");
    expect(typeof result.current.leaveCampaign).toBe("function");
  });
});
