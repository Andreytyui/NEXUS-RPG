/* Render da fog v2 (spec 0012 / ADR 0006 §7) — mask SVG sequencial extraída do index.jsx:
 * base branca se fillAll; add pinta branco (cobre), cut pinta preto (revela), na ordem.
 * Também desenha o draft (polígono/traço pendente) e o contorno da forma selecionada. */
import { memo } from 'react';

function shapeSvg(s, fill) {
  if (s.type === 'circle') return <circle key={s.id} cx={s.cx} cy={s.cy} r={s.r} fill={fill} />;
  if (s.type === 'poly' || s.type === 'free') {
    return <polygon key={s.id} points={(s.points || []).map(p => `${p.x},${p.y}`).join(' ')} fill={fill} />;
  }
  return <rect key={s.id} x={s.x} y={s.y} width={s.w} height={s.h} fill={fill} />;
}

function shapeOutline(s, stroke, scale) {
  const p = { fill: 'none', stroke, strokeWidth: 2 / scale, strokeDasharray: `${6 / scale},${4 / scale}` };
  if (s.type === 'circle') return <circle cx={s.cx} cy={s.cy} r={s.r} {...p} />;
  if (s.type === 'poly' || s.type === 'free') {
    return <polygon points={(s.points || []).map(pt => `${pt.x},${pt.y}`).join(' ')} {...p} />;
  }
  return <rect x={s.x} y={s.y} width={s.w} height={s.h} {...p} />;
}

const FogLayer = memo(function FogLayer({ fog, mapW, mapH, gridHalf, asViewer, draft, selectedId, scale = 1 }) {
  const shapes = fog?.shapes || [];
  const hasFog = fog?.fillAll || shapes.length > 0;
  const F = gridHalf;
  const selected = selectedId ? shapes.find(s => s.id === selectedId) : null;
  const draftColor = draft?.op === 'cut' ? '#f87171' : '#fbbf24';

  return (
    <>
      {hasFog && (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: mapW, height: mapH, pointerEvents: 'none', zIndex: 200, overflow: 'visible' }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="nx-fog-mask" maskUnits="userSpaceOnUse" x={-F} y={-F} width={mapW + 2 * F} height={mapH + 2 * F}>
              <rect x={-F} y={-F} width={mapW + 2 * F} height={mapH + 2 * F} fill={fog.fillAll ? '#fff' : '#000'} />
              {shapes.map(s => shapeSvg(s, s.op === 'add' ? '#fff' : '#000'))}
            </mask>
          </defs>
          <rect x={-F} y={-F} width={mapW + 2 * F} height={mapH + 2 * F} fill={asViewer ? 'rgba(0,0,0,0.98)' : 'rgba(0,0,0,0.88)'} mask="url(#nx-fog-mask)" />
        </svg>
      )}
      {(draft || selected) && (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: mapW, height: mapH, pointerEvents: 'none', zIndex: 206, overflow: 'visible' }} xmlns="http://www.w3.org/2000/svg">
          {selected && shapeOutline(selected, '#a855f7', scale)}
          {draft && (() => {
            const pts = draft.pts || [];
            const all = draft.cursor ? [...pts, draft.cursor] : pts;
            return (
              <g>
                <polyline points={all.map(p => `${p.x},${p.y}`).join(' ')} fill={`${draftColor}22`}
                  stroke={draftColor} strokeWidth={2 / scale} strokeDasharray={`${6 / scale},${4 / scale}`} />
                {pts[0] && draft.type === 'poly' && (
                  <circle cx={pts[0].x} cy={pts[0].y} r={6 / scale} fill="none" stroke={draftColor} strokeWidth={2 / scale} />
                )}
              </g>
            );
          })()}
        </svg>
      )}
    </>
  );
});

export default FogLayer;
