import { renderHook } from "@testing-library/react";
import { useAuth } from "../useAuth";

jest.mock("../../firebase", () => ({ auth: {}, db: {} }));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth, cb) => { cb(null); return () => {}; },
  signOut: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(undefined),
}));

describe("useAuth", () => {
  it("retorna currentUser null e authLoading false após resolver", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.currentUser).toBeNull();
    expect(result.current.authLoading).toBe(false);
    expect(result.current.userName).toBe("Agente");
    expect(result.current.userPhoto).toBe("");
    expect(typeof result.current.logout).toBe("function");
  });
});
