/* ════════════════════════════════════════════════════════════════════════
 *  NEXUS RPG — THEME PROVIDER
 *  ------------------------------------------------------------------------
 *  Bridges the SYSTEM_THEMES registry to the running app.
 *
 *  • <ThemeStyles/>      — render ONCE. Injects all per-system CSS-variable
 *                          blocks (scoped to :root[data-nexus-system="<id>"])
 *                          plus the Google-font @imports every system needs.
 *  • <ThemeProvider>     — sets data-nexus-system on <html> so the matching
 *                          variable block wins, and exposes the active theme
 *                          object through React context.
 *  • useTheme()          — read the active theme object anywhere.
 *
 *  This deliberately drives the SAME variable names the existing UI already
 *  consumes (--bg, --gold, --text, --border, ...), so no component needs to
 *  change for the re-theme to take effect — switching systems repaints the
 *  whole app.
 * ════════════════════════════════════════════════════════════════════════ */

import { createContext, useContext, useEffect, useMemo } from "react";
import { SYSTEM_THEMES, getTheme, DEFAULT_THEME_ID } from "./index";

const ThemeContext = createContext(getTheme(DEFAULT_THEME_ID));

/** Read the currently active system theme object. */
export const useTheme = () => useContext(ThemeContext);

/* hex (#abc | #aabbcc) → rgba() with alpha */
const rgba = (hex, a) => {
  const h = String(hex).replace("#", "");
  const n = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

/* Flatten a theme into the global CSS custom properties the app reads. */
const toVars = (t) => {
  const c = t.colors;
  const f = t.fonts;
  return [
    `--bg:${c.bg}`,
    `--surface:${c.surface}`,
    `--card:${c.card}`,
    `--card2:${c.card2}`,
    `--border:${c.border}`,
    `--border2:${c.border2}`,
    `--gold:${c.accent}`,
    `--gold2:${c.accent2}`,
    `--gold3:${c.accentDim}`,
    `--gold-glow:${rgba(c.accent, 0.22)}`,
    `--gold-dim:${rgba(c.accent, 0.09)}`,
    `--accent:${c.accent}`,
    `--accent2:${c.accent2}`,
    `--accent-dim:${c.accentDim}`,
    `--purple:${c.secondary}`,
    `--purple2:${c.secondaryText}`,
    `--purple-glow:${rgba(c.secondary, 0.3)}`,
    `--purple-dim:${rgba(c.secondary, 0.12)}`,
    `--paranormal:${c.paranormal}`,
    `--paranormal-text:${c.paranormalText}`,
    `--paranormal-glow:${rgba(c.paranormal, 0.45)}`,
    `--danger:${c.danger}`,
    `--danger-text:${c.dangerText}`,
    `--glitch:${c.glitch}`,
    `--text:${c.text}`,
    `--muted:${c.muted}`,
    `--muted2:${c.muted2}`,
    `--font-display:${f.display}`,
    `--font-title:${f.title}`,
    `--font-body:${f.body}`,
    `--font-data:${f.data}`,
  ].join(";");
};

/**
 * Injects every system's variable block + font imports. Render exactly once,
 * high in the tree (next to the existing global <style>). Inert until an
 * ancestor sets [data-nexus-system] on <html>.
 */
export function ThemeStyles() {
  const css = useMemo(() => {
    const imports = Array.from(
      new Set(Object.values(SYSTEM_THEMES).map((t) => t.googleFonts))
    )
      .map((g) => `@import url('https://fonts.googleapis.com/css2?${g}&display=swap');`)
      .join("\n");
    const blocks = Object.values(SYSTEM_THEMES)
      .map((t) => `:root[data-nexus-system="${t.id}"]{${toVars(t)}}`)
      .join("\n");
    return `${imports}\n${blocks}`;
  }, []);
  return <style data-nexus-theme>{css}</style>;
}

/**
 * Activates a system theme: tags <html> and provides the theme via context.
 * @param {{ systemId?: string, children: React.ReactNode }} props
 */
export function ThemeProvider({ systemId, children }) {
  const theme = useMemo(() => getTheme(systemId), [systemId]);
  useEffect(() => {
    document.documentElement.dataset.nexusSystem = theme.id;
  }, [theme.id]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
