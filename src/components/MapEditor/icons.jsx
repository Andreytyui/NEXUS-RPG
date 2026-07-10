/* Ícones SVG do Editor de Mapas (spec 0019 AC-12) — substituem os emojis ilegíveis.
 * Stroke em currentColor, viewBox 24. Um único componente <MapIcon name="..." />. */

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

const PATHS = {
  // ── Ferramentas ──
  select:  <><path d="M4 3l7 17 2-7 7-2z" /></>,                                   // seta de seleção
  token:   <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /></>, // disco
  draw:    <><path d="M16 4l4 4L8 20l-4 1 1-4z" /><path d="M14 6l4 4" /></>,        // lápis
  fog:     <><path d="M6 16a4 4 0 010-8 5 5 0 019.6-1.5A3.5 3.5 0 0118 16z" /></>,  // nuvem (cobrir)
  reveal:  <><path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18" /><circle cx="12" cy="12" r="3.2" /></>, // sol/lanterna (revelar)
  note:    <><path d="M5 4h14v10l-5 5H5z" /><path d="M14 19v-5h5" /><path d="M8 9h8M8 13h4" /></>, // nota dobrada
  measure: <><path d="M3 8h18v8H3z" /><path d="M7 8v3M11 8v4M15 8v3M19 8v4" /></>, // régua
  pointer: <><path d="M8 12V5.5a1.5 1.5 0 013 0V11m0-1v-.5a1.5 1.5 0 013 0V11m0-.5a1.5 1.5 0 013 0V15a5 5 0 01-5 5h-1.5a4 4 0 01-3-1.4L6 15a1.6 1.6 0 012.4-2z" /></>, // mão apontando

  // ── Barra lateral / câmera ──
  cast:    <><path d="M3 12a9 9 0 019 9M3 16a5 5 0 015 5M3 20h.01" /><path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-8" /></>, // transmitir
  follow:  <><path d="M3 12a9 9 0 019 9M3 16a5 5 0 015 5M3 20h.01" /></>,           // seguir câmera
  zoomIn:  <><circle cx="11" cy="11" r="7" /><path d="M11 8v6M8 11h6M20 20l-3.5-3.5" /></>,
  zoomOut: <><circle cx="11" cy="11" r="7" /><path d="M8 11h6M20 20l-3.5-3.5" /></>,
  grid:    <><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M4 10h16M4 15h16M10 4v16M15 4v16" /></>,
  snap:    <><path d="M7 4v7a5 5 0 0010 0V4" /><path d="M5 4h4M15 4h4" /></>,        // ímã
  revealAll:<><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2 2M17.1 17.1l2 2M19.1 4.9l-2 2M6.9 17.1l-2 2" /></>, // sol cheio
  coverAll:<><path d="M20 14A8 8 0 019.5 4 8 8 0 1020 14z" /></>,                   // lua (cobrir tudo)
  panel:   <><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M9 4v16" /></>, // painel lateral
  library: <><path d="M6 4h11a1 1 0 011 1v14l-4-2-4 2V5a1 1 0 00-1-1z" /><path d="M6 4a1 1 0 00-1 1v13" /></>, // acervo

  // ── Top bar ──
  back:    <><path d="M15 18l-6-6 6-6" /></>,
  undo:    <><path d="M9 7L4 12l5 5" /><path d="M4 12h11a5 5 0 010 10h-1" /></>,
  redo:    <><path d="M15 7l5 5-5 5" /><path d="M20 12H9a5 5 0 000 10h1" /></>,
  image:   <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="M21 16l-5-5L5 20" /></>,
  fit:     <><path d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4" /></>,

  // ── Barra de ação / painel ──
  eye:     <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff:  <><path d="M4 5l16 14" /><path d="M9.5 9.5A3 3 0 0014.5 14.5M6.5 6.7C3.9 8.2 2 12 2 12s3.5 7 10 7a10 10 0 004-.8M17.5 17.3C20.1 15.8 22 12 22 12s-3.5-7-10-7a10 10 0 00-1.7.15" /></>,
  lock:    <><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  unlock:  <><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V8a4 4 0 017.5-2" /></>,
  duplicate:<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V4a1 1 0 011-1h11" /></>,
  text:    <><path d="M5 6h14M5 6V5M19 6V5M12 6v13M9 19h6" /></>,                   // "Tt" → rótulo
  spectre: <><path d="M6 20V9a6 6 0 0112 0v11l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5z" /><circle cx="9.5" cy="10" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="10" r="1" fill="currentColor" stroke="none" /></>, // fantasma
  trash:   <><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" /></>,
  chevUp:  <><path d="M6 15l6-6 6 6" /></>,
  chevDown:<><path d="M6 9l6 6 6-6" /></>,
  collapseL:<><path d="M13 6l-6 6 6 6M19 6l-6 6 6 6" /></>, // « recolher painel
  expandR: <><path d="M11 6l6 6-6 6M5 6l6 6-6 6" /></>,     // » expandir painel
  // Alinhamento
  alignL:  <><path d="M4 4v16M8 8h10M8 16h6" /></>,
  alignCX: <><path d="M12 4v16M7 8h10M9 16h6" /></>,
  alignR:  <><path d="M20 4v16M6 8h10M10 16h6" /></>,
  alignT:  <><path d="M4 4h16M8 8v10M16 8v6" /></>,
  alignCY: <><path d="M4 12h16M8 7v10M16 9v6" /></>,
  alignB:  <><path d="M4 20h16M8 6v10M16 10v6" /></>,
  brush:   <><path d="M4 20c2-1 3-3 3-5l6-6 3 3-6 6c-2 0-4 1-5 3z" /><path d="M13 7l4-4 3 3-4 4" /></>, // borracha de fog / editar
};

export function MapIcon({ name, size = 18, style }) {
  const body = PATHS[name];
  if (!body) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...P} style={{ display: 'block', ...style }} aria-hidden="true">
      {body}
    </svg>
  );
}

export default MapIcon;
