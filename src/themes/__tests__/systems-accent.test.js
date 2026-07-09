import { getCardAccent, getTheme, SYSTEM_THEMES } from "../index";

/* AC-6: the selection-screen accent for a themed system derives from the SAME
 * registry that themes it inside. `App.jsx`'s SYSTEMS array spreads
 * `getCardAccent(id)` verbatim for every system present in SYSTEM_THEMES, so
 * asserting on the resolver here IS asserting on the card accent — without
 * importing App.jsx (which would drag Firebase into jsdom). */

describe("getCardAccent — single source of truth (AC-6)", () => {
  it("OP keeps its distinct arcane purple (card identity), not gold", () => {
    const { accent, accentText } = getCardAccent("op");
    expect(accent).toBe("#b030d8");
    expect(accentText).toBe("#d870f8");
    // ...while the IN-SYSTEM chrome stays gold — the two are deliberately different
    expect(getTheme("op").colors.accent).toBe("#c9a84c");
  });

  it("D&D card accent === its theme accent (red), fixing the old blue divergence", () => {
    expect(getCardAccent("dnd").accent).toBe(getTheme("dnd").colors.accent);
    expect(getCardAccent("dnd").accent).toBe("#c0392b");
    expect(getCardAccent("dnd").accent).not.toBe("#4a6fa5"); // the old hardcoded blue
  });

  it("Tormenta card accent === its theme accent (verdant green)", () => {
    expect(getCardAccent("tormenta").accent).toBe(getTheme("tormenta").colors.accent);
    expect(getCardAccent("tormenta").accent).toBe("#2e7d32");
  });

  it("falls back to `accent` for any themed system lacking `cardAccent`", () => {
    for (const id of Object.keys(SYSTEM_THEMES)) {
      const c = getTheme(id).colors;
      const expected = c.cardAccent || c.accent;
      expect(getCardAccent(id).accent).toBe(expected);
    }
  });

  it("always returns a usable rgba glow", () => {
    expect(getCardAccent("dnd").accentGlow).toMatch(/^rgba\(\d+,\d+,\d+,0\.32\)$/);
  });
});
