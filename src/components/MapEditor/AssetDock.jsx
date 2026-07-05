/* Dock da biblioteca de assets (spec 0013 AC-2..AC-5). Abas por tipo, busca por nome,
 * chips de tag e grid de miniaturas. Arrastar (dataTransfer) ou clicar coloca na cena. */
import { useState } from 'react';
import { ASSET_TYPES, ASSET_TYPE_LABEL, filterAssets, assetTags } from './assets/assetLib.js';

const TAB_ICON = { map: '🗺', prop: '📦', mount: '🐴', character: '🧙', attachment: '⚔', note: '📝' };

export default function AssetDock({ assets, onPlace, onDelete, onClose }) {
  const [type, setType]   = useState('character');
  const [q,    setQ]      = useState('');
  const [tag,  setTag]    = useState(null);

  const ofType   = (assets || []).filter(a => a.type === type);
  const tags     = assetTags(ofType);
  const shown    = filterAssets(ofType, { q, tag });
  const countBy  = (t) => (assets || []).filter(a => a.type === t).length;

  const chip = (active) => ({
    padding: '3px 10px', borderRadius: 999, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
    border: '1px solid ' + (active ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.12)'),
    background: active ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.04)',
    color: active ? '#c79bf2' : 'rgba(255,255,255,0.6)',
  });

  return (
    <div onClick={e => e.stopPropagation()} style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40, maxHeight: 260,
      background: 'rgba(18,18,30,0.97)', backdropFilter: 'blur(18px)',
      borderTop: '1px solid rgba(255,255,255,0.14)', display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter,system-ui,sans-serif',
    }}>
      {/* Cabeçalho: abas por tipo + busca + fechar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'Cinzel,serif', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginRight: 4 }}>🎒 Biblioteca</span>
        {ASSET_TYPES.map(t => (
          <button key={t} onClick={() => { setType(t); setTag(null); }} title={ASSET_TYPE_LABEL[t]}
            style={{ ...chip(type === t), display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{TAB_ICON[t]}</span><span>{ASSET_TYPE_LABEL[t]}</span>
            <span style={{ opacity: 0.5 }}>{countBy(t)}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 12px', color: '#fff', fontSize: 12, width: 150, outline: 'none' }} />
        <button onClick={onClose} title="Fechar" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>✕</button>
      </div>

      {/* Chips de tag */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '0 12px 6px', flexWrap: 'wrap' }}>
          <button onClick={() => setTag(null)} style={chip(!tag)}>todas</button>
          {tags.map(t => <button key={t} onClick={() => setTag(tag === t ? null : t)} style={chip(tag === t)}>#{t}</button>)}
        </div>
      )}

      {/* Grid de miniaturas */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8, alignContent: 'start' }}>
        {shown.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            Nenhum asset aqui ainda. Use “🎒 Salvar na biblioteca” num token ou imagem.
          </div>
        )}
        {shown.map(a => (
          <div key={a.id} draggable
            onDragStart={e => { e.dataTransfer.setData('application/x-nexus-asset', a.id); e.dataTransfer.effectAllowed = 'copy'; }}
            onClick={() => onPlace(a, null)}
            title={`${a.name}${a.tags?.length ? ' · #' + a.tags.join(' #') : ''} — clique ou arraste para a cena`}
            style={{ position: 'relative', cursor: 'grab', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ width: '100%', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {a.data
                ? <img src={a.data} alt={a.name} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 28 }}>{TAB_ICON[a.type] || '📄'}</span>}
            </div>
            <div style={{ padding: '3px 6px', fontSize: 10, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
            <button onClick={e => { e.stopPropagation(); if (window.confirm(`Remover “${a.name}” da biblioteca?`)) onDelete(a.id); }}
              title="Remover da biblioteca"
              style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 6, border: 'none', background: 'rgba(0,0,0,0.55)', color: 'rgba(248,113,113,0.9)', cursor: 'pointer', fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
