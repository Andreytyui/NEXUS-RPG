/* ════════════════════════════════════════════════════════════════════════
 *  NEXUS RPG — MOTION TOKENS  (spec 0017 · AC-1, AC-7)
 *  ------------------------------------------------------------------------
 *  Single source of truth for the app's motion language. Easings, durations
 *  and stagger live HERE so timing is tuned in one place and regressions are
 *  caught by test, not by eye. Pure module — no framework, no I/O — so it
 *  obeys the layered dependency rule and is trivially unit-testable.
 *
 *  Animate ONLY transform/opacity with these (GPU-friendly). Glow/shadow go
 *  through pseudo-elements animating opacity, never `box-shadow` directly.
 * ════════════════════════════════════════════════════════════════════════ */

/** Entrances: decelerating ease-out-expo — content settles into place. */
export const EASE_ENTER = "cubic-bezier(0.16, 1, 0.3, 1)";
/** Hovers / reversible states: symmetric ease-in-out. */
export const EASE_HOVER = "cubic-bezier(0.65, 0, 0.35, 1)";

/** Micro-interactions (focus, hover, tap feedback), ms. */
export const DUR_MICRO = 200;
/** Element entrances (stagger items, card reveals), ms. */
export const DUR_ENTER = 450;
/** Ambient loops (fog, embers, shimmer), ms. */
export const DUR_LOOP = 6000;

/** Default delay between staggered siblings, ms. */
export const STAGGER_STEP = 70;

/**
 * Delay for the Nth item in a staggered entrance, in ms.
 * Monotonic non-decreasing; never negative; tolerant of bad input.
 *
 * @param {number} index  0-based position in the sequence.
 * @param {number} [step] ms between consecutive items (default STAGGER_STEP).
 * @param {number} [base] ms before the first item starts (default 0).
 * @returns {number} delay in ms, clamped to >= 0.
 */
export function staggerDelay(index, step = STAGGER_STEP, base = 0) {
  const i = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  const s = Number.isFinite(step) ? step : STAGGER_STEP;
  const b = Number.isFinite(base) ? base : 0;
  return Math.max(0, b + i * s);
}

/** CSS media query string for users who asked for less motion. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Whether the current environment prefers reduced motion. Guards JS-driven
 * effects (tilt/parallax) that CSS `@media` can't reach. SSR/old-browser safe.
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
