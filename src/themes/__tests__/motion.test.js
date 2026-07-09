import {
  EASE_ENTER, EASE_HOVER,
  DUR_MICRO, DUR_ENTER, DUR_LOOP, STAGGER_STEP,
  staggerDelay, prefersReducedMotion, REDUCED_MOTION_QUERY,
} from "../motion";

describe("motion tokens (AC-1)", () => {
  it("expose the agreed easings", () => {
    expect(EASE_ENTER).toBe("cubic-bezier(0.16, 1, 0.3, 1)");
    expect(EASE_HOVER).toBe("cubic-bezier(0.65, 0, 0.35, 1)");
  });

  it("durations sit in the spec bands", () => {
    expect(DUR_MICRO).toBeGreaterThanOrEqual(150);
    expect(DUR_MICRO).toBeLessThanOrEqual(250);
    expect(DUR_ENTER).toBeGreaterThanOrEqual(300);
    expect(DUR_ENTER).toBeLessThanOrEqual(600);
    expect(DUR_LOOP).toBeGreaterThanOrEqual(3000);
    expect(DUR_LOOP).toBeLessThanOrEqual(8000);
    expect(STAGGER_STEP).toBeGreaterThanOrEqual(40);
    expect(STAGGER_STEP).toBeLessThanOrEqual(100);
  });
});

describe("staggerDelay (AC-7)", () => {
  it("is base + index*step", () => {
    expect(staggerDelay(0, 70, 0)).toBe(0);
    expect(staggerDelay(1, 70, 0)).toBe(70);
    expect(staggerDelay(3, 60, 100)).toBe(280);
  });

  it("defaults to STAGGER_STEP and base 0", () => {
    expect(staggerDelay(2)).toBe(2 * STAGGER_STEP);
  });

  it("is monotonic non-decreasing across a sequence", () => {
    const seq = [0, 1, 2, 3, 4, 5].map((i) => staggerDelay(i));
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).toBeGreaterThanOrEqual(seq[i - 1]);
    }
  });

  it("never returns negative and tolerates bad input", () => {
    expect(staggerDelay(-3)).toBe(0);
    expect(staggerDelay(NaN)).toBe(0);
    expect(staggerDelay(undefined)).toBe(0);
    expect(staggerDelay(2.9, 10)).toBe(20); // floors the index
    expect(staggerDelay(1, NaN, NaN)).toBe(STAGGER_STEP);
  });
});

describe("prefersReducedMotion (AC-5)", () => {
  const original = global.window && global.window.matchMedia;
  afterEach(() => {
    if (global.window) global.window.matchMedia = original;
  });

  it("is false when matchMedia is unavailable (SSR-safe)", () => {
    if (global.window) delete global.window.matchMedia;
    expect(prefersReducedMotion()).toBe(false);
  });

  it("reflects the matchMedia result and uses the right query", () => {
    const calls = [];
    global.window.matchMedia = (q) => {
      calls.push(q);
      return { matches: true };
    };
    expect(prefersReducedMotion()).toBe(true);
    expect(calls[0]).toBe(REDUCED_MOTION_QUERY);
  });
});
