import { useState, useEffect, useRef, useReducer } from 'react';
import { historyReducer, initialHistoryState, DEFAULT_LAYERS } from './reducer.js';
import { subscribeCampaignMap, saveScene, saveImage } from './campaignSync.js';

const TOOLS = [
  { id: 'select',  label: 'Selecionar (V)', ch: '↖' },
  { id: 'token',   label: 'Token (T)',      ch: '⬤' },
  { id: 'draw',    label: 'Desenhar (D)',   ch: '✏' },
  { id: 'fog',     label: 'Névoa (F)',      ch: '☁' },
  { id: 'reveal',  label: 'Revelar (R)',    ch: '👁' },
  { id: 'note',    label: 'Nota (N)',       ch: '📝' },
  { id: 'measure', label: 'Medir (M)',      ch: '📏' },
];
const COLORS = ['#4ade80','#60a5fa','#f87171','#fbbf24','#c084fc','#f472b6','#34d399','#fb923c','#e2e8f0','#a3e635'];

/* Condições de token (spec 0008 AC-4) e espessuras de desenho (AC-1). */
const CONDICOES = [
  { e: '☠️', n: 'Morto' }, { e: '😵', n: 'Atordoado' }, { e: '🩸', n: 'Ferido' },
  { e: '🛡️', n: 'Protegido' }, { e: '💤', n: 'Inconsciente' }, { e: '🔥', n: 'Em chamas' },
  { e: '☣️', n: 'Envenenado' }, { e: '👁️', n: 'Marcado' },
];
const DRAW_WIDTHS = [2, 4, 7];

/* Shape de um elemento drawing — points normalizados ao bbox; rect/círculo usam só w/h. */
function DrawingShape({ d }) {
  const p = { fill: 'none', stroke: d.color, strokeWidth: d.strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (d.shape === 'line') { const a = d.points[0], b = d.points[1] || a; return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...p} />; }
  if (d.shape === 'rect') return <rect x={d.strokeWidth / 2} y={d.strokeWidth / 2} width={Math.max(1, d.w - d.strokeWidth)} height={Math.max(1, d.h - d.strokeWidth)} {...p} />;
  if (d.shape === 'circle') return <ellipse cx={d.w / 2} cy={d.h / 2} rx={Math.max(1, (d.w - d.strokeWidth) / 2)} ry={Math.max(1, (d.h - d.strokeWidth) / 2)} {...p} />;
  return <polyline points={d.points.map(pt => `${pt.x},${pt.y}`).join(' ')} {...p} />;
}

export default function MapEditor({ onBack, campaignId, uid, isMaster, db }) {
  // Modo campanha (spec 0007): mestre edita a mesa (Firestore), jogador vê ao vivo (read-only).
  const campaignMode = !!campaignId;
  const viewer = campaignMode && !isMaster;
  const [hst, dispatch] = useReducer(historyReducer, campaignMode ? 'campaign' : null, initialHistoryState);
  const scenes  = hst.present;
  const canUndo = hst.past.length > 0;
  const canRedo = hst.future.length > 0;

  const [activeScene,     setActiveScene]     = useState(() => scenes[0]?.id || 's1');
  const [bgImages,        setBgImages]        = useState(() => {
    if (campaignMode) return {};
    try { return JSON.parse(localStorage.getItem('nexus_scene_bgs') || '{}'); } catch { return {}; }
  });
  const [imageStore,      setImageStore]      = useState(() => {
    if (campaignMode) return {};
    try { return JSON.parse(localStorage.getItem('nexus_image_bgs') || '{}'); } catch { return {}; }
  });
  const [pan,             setPan]             = useState({ x: 60, y: 60 });
  const [scale,           setScale]           = useState(1);
  const [showGrid,        setShowGrid]        = useState(true);
  const [tool,            setTool]            = useState('select');
  const [tokColor,        setTokColor]        = useState('#4ade80');
  const [tokLabel,        setTokLabel]        = useState('');
  const [measureLine,     setMeasureLine]     = useState(null);
  const [selIds,          setSelIds]          = useState(new Set());
  const [ctxMenu,         setCtxMenu]         = useState(null);
  const [weather,         setWeather]         = useState(null);
  const [showLeft,        setShowLeft]        = useState(true);
  const [snapGrid,        setSnapGrid]        = useState(false);
  const [boxSel,          setBoxSel]          = useState(null);
  const [layerPickerOpen, setLayerPickerOpen] = useState(false);
  const [,                setDragTick]        = useState(0);
  /* spec 0008 — desenho e upgrades de token */
  const [drawMode,   setDrawMode]   = useState('free'); // free | line | rect | circle
  const [drawColor,  setDrawColor]  = useState('#f87171');
  const [drawWidth,  setDrawWidth]  = useState(4);
  const [drawLive,   setDrawLive]   = useState(null);   // preview do traço (coords de mundo)
  const [tokSize,    setTokSize]    = useState(1);      // multiplicador da célula (P/M/G/E)
  const [tokImageId, setTokImageId] = useState(null);   // imagem aplicada aos próximos tokens

  const containerRef     = useRef(null);
  const bgInputRef       = useRef(null);
  const panRef           = useRef(null);
  const fogRef           = useRef(false);
  const fogModeRef       = useRef('add');
  const measureRef       = useRef(null);
  const boxRef           = useRef(null);
  const dragRef          = useRef(null);
  const resizeRef        = useRef(null);
  const rotateRef        = useRef(null);
  const drawRef          = useRef(null);
  const fogDragRef       = useRef(null);
  const tokImgInputRef   = useRef(null);
  const migrationDoneRef = useRef(false);
  const elementDownRef   = useRef(false);
  const stateRef         = useRef({});

  const scene    = scenes.find(s => s.id === activeScene) || scenes[0];
  const elements = scene.elements || [];
  const gridSize = scene.gridSize || 70;
  const bgSize   = scene.bgSize   || { w: 3000, h: 2000 };
  const layers   = scene.layers   || DEFAULT_LAYERS;
  const layerOrder = Object.fromEntries(layers.map((l, i) => [l.id, i]));
  const mapW     = bgSize.w;
  const mapH     = bgSize.h;

  stateRef.current = { pan, scale, scene, tool, selIds, elements, gridSize, snapGrid, imageStore };

  function screenToWorld(sx, sy) {
    const { pan: p, scale: s } = stateRef.current;
    return { x: (sx - p.x) / s, y: (sy - p.y) / s };
  }
  function clientXY(e) {
    const r = containerRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function fogKey(wx, wy) {
    const gs = stateRef.current.gridSize;
    return `${Math.floor(wx / gs)},${Math.floor(wy / gs)}`;
  }
  function snap(x, y) {
    if (!stateRef.current.snapGrid) return { x, y };
    const gs = stateRef.current.gridSize;
    return { x: Math.round(x / gs) * gs, y: Math.round(y / gs) * gs };
  }

  /* Névoa por área (spec 0008 AC-5): aplica o retângulo de células entre o início do arrasto
     e o cursor sobre o conjunto-base capturado no mousedown (preview ao vivo, sem acumular). */
  function applyFogRect(wx, wy) {
    const drag = fogDragRef.current; if (!drag) return;
    const gs = stateRef.current.gridSize, sc = stateRef.current.scene;
    const c1 = Math.floor(Math.min(drag.wx, wx) / gs), c2 = Math.floor(Math.max(drag.wx, wx) / gs);
    const r1 = Math.floor(Math.min(drag.wy, wy) / gs), r2 = Math.floor(Math.max(drag.wy, wy) / gs);
    const st = new Set(drag.base);
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
      const k = `${c},${r}`;
      if (fogModeRef.current === 'add') st.add(k); else st.delete(k);
    }
    dispatch({ type: 'PATCH_SCENE', sceneId: sc.id, patch: { fogCells: [...st] } });
  }

  function upScene(patch) { dispatch({ type: 'PATCH_SCENE', sceneId: stateRef.current.scene.id, patch }); }
  function addEl(el)       { dispatch({ type: 'ADD_ELEMENT',    sceneId: stateRef.current.scene.id, element: el }); }
  function updateEl(id, p) { dispatch({ type: 'UPDATE_ELEMENT', sceneId: stateRef.current.scene.id, id, patch: p }); }
  function deleteEl(id)    { dispatch({ type: 'DELETE_ELEMENT', sceneId: stateRef.current.scene.id, id }); }
  function deleteEls(ids)  { dispatch({ type: 'DELETE_ELEMENTS', sceneId: stateRef.current.scene.id, ids }); }

  useEffect(() => { if (campaignMode) return; try { localStorage.setItem('nexus_scenes_v1', JSON.stringify(scenes)); } catch {} }, [scenes, campaignMode]);
  useEffect(() => { if (campaignMode) return; try { localStorage.setItem('nexus_scene_bgs', JSON.stringify(bgImages)); } catch {} }, [bgImages, campaignMode]);
  useEffect(() => { if (campaignMode) return; try { localStorage.setItem('nexus_image_bgs', JSON.stringify(imageStore)); } catch {} }, [imageStore, campaignMode]);

  /* ── modo campanha: hidratação + tempo real (spec 0007) ── */
  const loadedRef   = useRef(false); // 1ª carga concluída (libera autosave do mestre)
  const uploadedRef = useRef(new Set()); // imagens já persistidas (evita re-upload/eco)
  useEffect(() => {
    if (!campaignMode || !db) return;
    const unsub = subscribeCampaignMap(db, campaignId, {
      onImages: (imgs, fromSelf) => {
        Object.keys(imgs).forEach((k) => uploadedRef.current.add(k));
        if (!fromSelf) setImageStore((prev) => ({ ...prev, ...imgs }));
      },
      onScene: (remote, fromSelf) => {
        if (fromSelf) return;
        if (!remote) { loadedRef.current = true; return; } // mesa nova: mestre cria no 1º autosave
        // Mestre aplica só a 1ª carga (não clobbera edição local); jogador aplica tudo.
        if (isMaster && loadedRef.current) return;
        dispatch({ type: 'LOAD_SCENES', scenes: [remote] });
        setActiveScene(remote.id);
        loadedRef.current = true;
      },
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  /* mestre: autosave debounced da cena ativa */
  useEffect(() => {
    if (!campaignMode || !isMaster || !db || !loadedRef.current) return;
    const t = setTimeout(() => {
      const sc = scenes.find((s) => s.id === activeScene) || scenes[0];
      if (sc) saveScene(db, campaignId, uid, sc);
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, activeScene]);

  /* mestre: sobe imagens novas (reduzidas) e alinha o store local ao que foi salvo */
  useEffect(() => {
    if (!campaignMode || !isMaster || !db) return;
    Object.entries(imageStore).forEach(([id, data]) => {
      if (!id.startsWith('img_') || uploadedRef.current.has(id)) return;
      uploadedRef.current.add(id);
      saveImage(db, campaignId, id, data).then((stored) => {
        if (stored && stored !== data) setImageStore((prev) => ({ ...prev, [id]: stored }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageStore]);

  /* one-time migration: old single bgImages → image elements */
  useEffect(() => {
    if (migrationDoneRef.current || campaignMode) return;
    migrationDoneRef.current = true;
    scenes.forEach(sc => {
      const hasBg = bgImages[sc.id];
      const hasImgEl = (sc.elements || []).some(el => el.type === 'image');
      if (hasBg && !hasImgEl) {
        setImageStore(prev => ({ ...prev, [sc.id]: hasBg }));
        dispatch({ type: 'ADD_ELEMENT', sceneId: sc.id, element: {
          id: Date.now() + (Math.random() * 999 | 0),
          type: 'image', layerId: 'layer-map',
          x: 0, y: 0, w: sc.bgSize?.w || 3000, h: sc.bgSize?.h || 2000,
          rotation: 0, imageId: sc.id,
          hidden: false, locked: false, spectre: false,
        }});
      }
    });
  }, []); // eslint-disable-line

  function loadBg(file) {
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const { scene: sc } = stateRef.current;
        const imageId = 'img_' + Date.now();
        setImageStore(prev => ({ ...prev, [imageId]: ev.target.result }));
        dispatch({ type: 'PATCH_SCENE', sceneId: sc.id, patch: { bgSize: { w: img.width, h: img.height } } });
        dispatch({ type: 'ADD_ELEMENT', sceneId: sc.id, element: {
          id: Date.now() + 1, type: 'image', layerId: 'layer-map',
          x: 0, y: 0, w: img.width, h: img.height,
          rotation: 0, imageId,
          hidden: false, locked: false, spectre: false,
        }});
        const maxW = (containerRef.current?.clientWidth  || window.innerWidth  - 80) * 0.9;
        const maxH = (containerRef.current?.clientHeight || window.innerHeight - 120) * 0.9;
        setScale(Math.min(1, maxW / img.width, maxH / img.height));
        setPan({ x: 30, y: 30 });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* Token com imagem (spec 0008 AC-2): reduz a ~256px; img_tok_* sobe pelo pipeline de campanha. */
  function loadTokenImage(file) {
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const r = Math.min(1, 256 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * r));
        c.height = Math.max(1, Math.round(img.height * r));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const id = 'img_tok_' + Date.now();
        setImageStore(prev => ({ ...prev, [id]: c.toDataURL('image/jpeg', 0.85) }));
        setTokImageId(id);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function toggleCondition(id, emoji) {
    const el = stateRef.current.elements.find(e => e.id === id);
    if (!el) return;
    const cur = el.conditions || [];
    updateEl(id, { conditions: cur.includes(emoji) ? cur.filter(c => c !== emoji) : [...cur, emoji] });
  }

  function addScene() {
    const id = 's' + Date.now();
    dispatch({ type: 'ADD_SCENE', id });
    setActiveScene(id);
  }
  function deleteScene(id) {
    if (scenes.length <= 1) return;
    const next = scenes.find(s => s.id !== id);
    dispatch({ type: 'DELETE_SCENE', sceneId: id });
    setBgImages(prev => { const n = { ...prev }; delete n[id]; return n; });
    if (activeScene === id) setActiveScene(next.id);
  }
  function renameScene(id) {
    const sc = scenes.find(s => s.id === id);
    const n = window.prompt('Nome da cena:', sc?.name || 'Cena');
    if (n?.trim()) dispatch({ type: 'RENAME_SCENE', sceneId: id, name: n.trim() });
  }

  function toggleHide(id)    { const el = stateRef.current.elements.find(e => e.id === id); if (el) updateEl(id, { hidden: !el.hidden }); }
  function toggleLock(id)    { const el = stateRef.current.elements.find(e => e.id === id); if (el) updateEl(id, { locked: !el.locked }); }
  function toggleSpectre(id) { const el = stateRef.current.elements.find(e => e.id === id); if (el) updateEl(id, { spectre: !el.spectre }); }
  function dupEl(id) {
    const el = stateRef.current.elements.find(e => e.id === id);
    if (el) addEl({ ...el, id: Date.now(), x: el.x + 30, y: el.y + 30 });
  }
  function editLabel(id) {
    const el = stateRef.current.elements.find(e => e.id === id);
    const nl = window.prompt('Rótulo:', el?.label || '');
    if (nl !== null) updateEl(id, { label: nl || '?' });
  }
  function coverFog() {
    const { scene: sc } = stateRef.current;
    const cells = [];
    for (let r = 0; r < Math.ceil(sc.bgSize.h / sc.gridSize); r++)
      for (let c = 0; c < Math.ceil(sc.bgSize.w / sc.gridSize); c++) cells.push(`${c},${r}`);
    upScene({ fogCells: cells });
  }
  function autoFog() {
    const { scene: sc } = stateRef.current;
    const cols = Math.ceil(sc.bgSize.w / sc.gridSize), rows = Math.ceil(sc.bgSize.h / sc.gridSize);
    const ex = new Set(sc.fogCells);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
      if (r < 2 || c < 2 || r >= rows - 2 || c >= cols - 2) ex.add(`${c},${r}`);
    upScene({ fogCells: [...ex] });
  }
  function alignSelected(axis, dir) {
    const { elements: els, selIds: sids, scene: sc } = stateRef.current;
    const sel = els.filter(el => sids.has(el.id));
    if (sel.length < 2) return;
    let v;
    if (dir === 'min') v = Math.min(...sel.map(t => t[axis]));
    else if (dir === 'max') v = Math.max(...sel.map(t => t[axis]));
    else v = sel.reduce((s, t) => s + t[axis], 0) / sel.length;
    sel.forEach(t => dispatch({ type: 'UPDATE_ELEMENT', sceneId: sc.id, id: t.id, patch: { [axis]: v } }));
  }
  function batchToggle(prop) {
    const { elements: els, selIds: sids, scene: sc } = stateRef.current;
    const sel = els.filter(el => sids.has(el.id));
    const anyActive = sel.some(el => el[prop]);
    sel.forEach(el => dispatch({ type: 'UPDATE_ELEMENT', sceneId: sc.id, id: el.id, patch: { [prop]: !anyActive } }));
  }
  function batchSetLayer(layerId) {
    const { elements: els, selIds: sids, scene: sc } = stateRef.current;
    els.filter(el => sids.has(el.id)).forEach(el =>
      dispatch({ type: 'UPDATE_ELEMENT', sceneId: sc.id, id: el.id, patch: { layerId } })
    );
  }
  function dupSelected() {
    const { elements: els, selIds: sids, scene: sc } = stateRef.current;
    els.filter(el => sids.has(el.id)).forEach(el =>
      dispatch({ type: 'ADD_ELEMENT', sceneId: sc.id, element: { ...el, id: Date.now() + (Math.random() * 999 | 0), x: el.x + 30, y: el.y + 30 } })
    );
  }

  useEffect(() => {
    function onKey(e) {
      const { selIds: sids, elements: els, scene: sc } = stateRef.current;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); dispatch({ type: 'UNDO' }); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); dispatch({ type: 'REDO' }); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const lm = {};
        (stateRef.current.scene.layers || DEFAULT_LAYERS).forEach(l => { lm[l.id] = l; });
        setSelIds(new Set(stateRef.current.elements.filter(el => {
          const l = lm[el.layerId]; return l?.visible && !l?.locked;
        }).map(el => el.id)));
        return;
      }
      // Atalhos de ferramenta (spec 0008 AC-6) — ignorados ao digitar e no modo jogador.
      const tag = e.target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable;
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && !viewer) {
        const hot = { v: 'select', t: 'token', d: 'draw', f: 'fog', r: 'reveal', n: 'note', m: 'measure' }[e.key.toLowerCase()];
        if (hot) { setTool(hot); return; }
        if (e.key.toLowerCase() === 'g') { setShowGrid(g => !g); return; }
      }
      if (sids.size === 0) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteEls([...sids]); setSelIds(new Set()); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        [...sids].forEach(id => {
          const el = els.find(e2 => e2.id === id);
          if (el) dispatch({ type: 'ADD_ELEMENT', sceneId: sc.id, element: { ...el, id: Date.now() + (Math.random() * 999 | 0), x: el.x + 30, y: el.y + 30 } });
        });
      }
      if (e.key === 'Escape') { setSelIds(new Set()); setLayerPickerOpen(false); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line

  function onElementDown(e, el) {
    const { selIds: sids, elements: els, scene: sc } = stateRef.current;
    const lm = {};
    (sc.layers || DEFAULT_LAYERS).forEach(l => { lm[l.id] = l; });
    const layerLocked = !!(lm[el.layerId]?.locked);
    e.stopPropagation();
    elementDownRef.current = true;
    if (e.button === 2) return;
    if (e.shiftKey) {
      setSelIds(prev => { const n = new Set(prev); n.has(el.id) ? n.delete(el.id) : n.add(el.id); return n; });
      return;
    }
    if (!sids.has(el.id)) setSelIds(new Set([el.id]));
    if (!el.locked && !layerLocked) {
      const { x: sx, y: sy } = clientXY(e); const wp = screenToWorld(sx, sy);
      const sel = sids.has(el.id) ? sids : new Set([el.id]);
      const origins = {};
      const draggableIds = [];
      els.filter(e2 => sel.has(e2.id)).forEach(e2 => {
        if (e2.locked || lm[e2.layerId]?.locked) return;
        origins[e2.id] = { ox: wp.x - e2.x, oy: wp.y - e2.y };
        draggableIds.push(e2.id);
      });
      dragRef.current = { ids: draggableIds, origins, positions: null };
    }
  }

  function onDown(e) {
    if (elementDownRef.current) { elementDownRef.current = false; return; }
    setCtxMenu(null); setLayerPickerOpen(false);
    const { tool: t } = stateRef.current;
    const { x: sx, y: sy } = clientXY(e);
    const wp = screenToWorld(sx, sy);

    if (e.button === 2) { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'map' }); return; }
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      panRef.current = { mx: e.clientX, my: e.clientY, ox: stateRef.current.pan.x, oy: stateRef.current.pan.y }; return;
    }
    if (e.button !== 0) return;

    if (t === 'select') {
      if (!e.shiftKey) setSelIds(new Set());
      boxRef.current = { sx, sy };
      setBoxSel({ x1: sx, y1: sy, x2: sx, y2: sy });
      return;
    }
    if (t === 'fog' || t === 'reveal') {
      fogRef.current = true; fogModeRef.current = t === 'fog' ? 'add' : 'del';
      fogDragRef.current = { wx: wp.x, wy: wp.y, base: new Set(stateRef.current.scene.fogCells) };
      applyFogRect(wp.x, wp.y);
    } else if (t === 'token') {
      const sn = snap(wp.x, wp.y);
      addEl({ id: Date.now(), type: 'token', layerId: 'layer-tokens', x: sn.x, y: sn.y, color: tokColor, label: tokLabel || '?', size: Math.max(18, Math.round(stateRef.current.gridSize * tokSize)), imageId: tokImageId, conditions: [], hidden: false, locked: false, spectre: false });
    } else if (t === 'draw') {
      drawRef.current = { shape: drawMode, color: drawColor, strokeWidth: drawWidth, pts: [{ x: wp.x, y: wp.y }] };
      setDrawLive({ ...drawRef.current, pts: [...drawRef.current.pts] });
    } else if (t === 'note') {
      const txt = window.prompt('Texto da nota:');
      if (txt?.trim()) addEl({ id: Date.now(), type: 'note', layerId: 'layer-objects', x: wp.x, y: wp.y, text: txt.trim(), hidden: false, locked: false, spectre: false });
    } else if (t === 'measure') {
      measureRef.current = { x1: wp.x, y1: wp.y }; setMeasureLine({ x1: wp.x, y1: wp.y, x2: wp.x, y2: wp.y });
    }
  }

  function onMove(e) {
    if (panRef.current) {
      const { mx, my, ox, oy } = panRef.current;
      setPan({ x: ox + e.clientX - mx, y: oy + e.clientY - my }); return;
    }
    if (resizeRef.current) {
      const { x: sx, y: sy } = clientXY(e); const wp = screenToWorld(sx, sy);
      const { corner, startMouse, startEl } = resizeRef.current;
      let { x, y, w, h } = startEl;
      const dx = wp.x - startMouse.wx, dy = wp.y - startMouse.wy;
      if (corner.includes('E')) w = Math.max(20, startEl.w + dx);
      if (corner.includes('S')) h = Math.max(20, startEl.h + dy);
      if (corner.includes('W')) { x = startEl.x + dx; w = Math.max(20, startEl.w - dx); if (w === 20) x = startEl.x + startEl.w - 20; }
      if (corner.includes('N')) { y = startEl.y + dy; h = Math.max(20, startEl.h - dy); if (h === 20) y = startEl.y + startEl.h - 20; }
      resizeRef.current.live = { x, y, w, h };
      setDragTick(t => t + 1); return;
    }
    if (rotateRef.current) {
      const { x: sx, y: sy } = clientXY(e);
      const { cx, cy, startAngle, startRotation } = rotateRef.current;
      const angle = Math.atan2(sy - cy, sx - cx) * 180 / Math.PI;
      rotateRef.current.liveRotation = startRotation + (angle - startAngle);
      setDragTick(t => t + 1); return;
    }
    if (dragRef.current) {
      const { x: sx, y: sy } = clientXY(e); const wp = screenToWorld(sx, sy);
      const { ids, origins } = dragRef.current;
      const positions = {};
      ids.forEach(id => {
        const orig = origins[id]; if (!orig) return;
        const sn = snap(wp.x - orig.ox, wp.y - orig.oy);
        positions[id] = { x: sn.x, y: sn.y };
      });
      dragRef.current.positions = positions;
      setDragTick(t => t + 1); return;
    }
    if (boxRef.current) {
      const { x: sx, y: sy } = clientXY(e);
      setBoxSel(prev => prev ? { ...prev, x2: sx, y2: sy } : null); return;
    }
    if (fogRef.current) {
      const { x: sx, y: sy } = clientXY(e); const wp = screenToWorld(sx, sy);
      applyFogRect(wp.x, wp.y); return;
    }
    if (drawRef.current) {
      const { x: sx, y: sy } = clientXY(e); const wp = screenToWorld(sx, sy);
      const d = drawRef.current;
      if (d.shape === 'free') d.pts.push({ x: wp.x, y: wp.y });
      else d.pts[1] = { x: wp.x, y: wp.y };
      setDrawLive({ ...d, pts: [...d.pts] }); return;
    }
    if (measureRef.current) {
      const { x: sx, y: sy } = clientXY(e); const wp = screenToWorld(sx, sy);
      setMeasureLine({ ...measureRef.current, x2: wp.x, y2: wp.y });
    }
  }

  function onUp(e) {
    const wasInteracting = !!dragRef.current || !!resizeRef.current || !!rotateRef.current;
    if (resizeRef.current?.live) {
      dispatch({ type: 'UPDATE_ELEMENT', sceneId: stateRef.current.scene.id, id: resizeRef.current.elId, patch: resizeRef.current.live });
    }
    if (rotateRef.current && rotateRef.current.liveRotation !== rotateRef.current.startRotation) {
      dispatch({ type: 'UPDATE_ELEMENT', sceneId: stateRef.current.scene.id, id: rotateRef.current.elId, patch: { rotation: rotateRef.current.liveRotation } });
    }
    if (dragRef.current?.positions) {
      dispatch({ type: 'MOVE_ELEMENTS', sceneId: stateRef.current.scene.id, positions: dragRef.current.positions });
    }
    if (boxRef.current && boxSel && !wasInteracting) {
      const { x1, y1, x2, y2 } = boxSel;
      const minX = Math.min(x1, x2), maxX = Math.max(x1, x2), minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
      const { pan: p, scale: s, elements: els, scene: sc } = stateRef.current;
      const lm = {}; (sc.layers || DEFAULT_LAYERS).forEach(l => { lm[l.id] = l; });
      const hit = new Set();
      els.forEach(el => {
        const l = lm[el.layerId]; if (!l?.visible || l?.locked) return;
        const cx = el.w != null ? el.x + el.w / 2 : el.x;
        const cy = el.w != null ? el.y + (el.h || 0) / 2 : el.y;
        const ex = cx * s + p.x, ey = cy * s + p.y;
        if (ex >= minX && ex <= maxX && ey >= minY && ey <= maxY) hit.add(el.id);
      });
      if (e?.shiftKey) setSelIds(prev => { const n = new Set(prev); hit.forEach(id => n.add(id)); return n; });
      else setSelIds(hit);
    }
    if (drawRef.current) {
      const d = drawRef.current;
      if (d.pts.length > 1) {
        const xs = d.pts.map(p => p.x), ys = d.pts.map(p => p.y);
        const minX = Math.min(...xs), minY = Math.min(...ys);
        const w = Math.max(d.strokeWidth + 2, Math.max(...xs) - minX);
        const h = Math.max(d.strokeWidth + 2, Math.max(...ys) - minY);
        addEl({
          id: Date.now(), type: 'drawing', layerId: 'layer-drawing', x: minX, y: minY, w, h,
          shape: d.shape, color: d.color, strokeWidth: d.strokeWidth,
          points: d.pts.map(p => ({ x: Math.round(p.x - minX), y: Math.round(p.y - minY) })),
          hidden: false, locked: false, spectre: false,
        });
      }
      drawRef.current = null; setDrawLive(null);
    }
    elementDownRef.current = false;
    panRef.current = null; dragRef.current = null; resizeRef.current = null; rotateRef.current = null;
    fogRef.current = false; fogDragRef.current = null; measureRef.current = null; boxRef.current = null; setBoxSel(null);
  }

  function onWheel(e) {
    e.preventDefault();
    const r = containerRef.current.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    const { pan: p, scale: s } = stateRef.current;
    const ns = Math.max(0.08, Math.min(6, s * (e.deltaY < 0 ? 1.12 : 0.89)));
    setPan({ x: sx - (sx - p.x) * ns / s, y: sy - (sy - p.y) * ns / s }); setScale(ns);
  }

  const measureDist = measureLine
    ? Math.round(Math.hypot(measureLine.x2 - measureLine.x1, measureLine.y2 - measureLine.y1) / gridSize * 10) / 10
    : 0;
  const fogRects   = (scene.fogCells || []).map(k => { const [c, r] = k.split(',').map(Number); return { x: c * gridSize, y: r * gridSize }; });
  const gridHalf   = 50000; // world-px padding in each direction for "infinite" grid illusion
  const gridPatOff = gridHalf % gridSize; // aligns pattern so world (0,0) stays on a grid line
  const cursor     = panRef.current ? 'grabbing' : tool === 'fog' || tool === 'reveal' ? 'cell' : tool === 'token' || tool === 'note' || tool === 'measure' || tool === 'draw' ? 'crosshair' : 'default';
  const singleSel  = selIds.size === 1 ? elements.find(el => el.id === [...selIds][0]) : null;
  const anyHidden  = selIds.size > 0 && [...selIds].some(id => elements.find(e => e.id === id)?.hidden);
  const anyLocked  = selIds.size > 0 && [...selIds].some(id => elements.find(e => e.id === id)?.locked);
  const hasImgEls  = elements.some(el => el.type === 'image');

  const TB = active => ({
    width: 44, height: 44, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 18,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: active ? 'rgba(168,85,247,0.2)' : 'transparent',
    color: active ? '#a855f7' : 'rgba(255,255,255,0.5)',
    boxShadow: active ? 'inset 0 0 0 1px rgba(168,85,247,0.5)' : 'none',
    transition: 'all 0.12s',
  });
  const topBtn = { padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontFamily: 'Inter,system-ui,sans-serif', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' };
  const actBtn = active => ({ width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)', color: active ? '#a855f7' : 'rgba(255,255,255,0.6)', transition: 'all 0.12s' });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#1e1e2f', display: 'flex', flexDirection: 'column', userSelect: 'none', fontFamily: 'Inter,system-ui,sans-serif' }}
      onClick={() => { setCtxMenu(null); setLayerPickerOpen(false); }}>
      <style>{`@keyframes rain{0%{transform:translateY(-10px) rotate(15deg);opacity:0}10%{opacity:0.7}90%{opacity:0.7}100%{transform:translateY(110vh) rotate(15deg);opacity:0}}@keyframes snow{0%{transform:translateY(-10px) translateX(0);opacity:0}10%{opacity:0.85}50%{transform:translateY(50vh) translateX(20px)}90%{opacity:0.85}100%{transform:translateY(110vh) translateX(-10px);opacity:0}}@keyframes fogDrift{0%{transform:translateX(-5%)}50%{transform:translateX(5%)}100%{transform:translateX(-5%)}}`}</style>

      {/* TOP BAR */}
      <div style={{ height: 48, background: '#12121e', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', flexShrink: 0, zIndex: 10 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 6, transition: 'color 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
            title="Voltar">← Voltar</button>
        )}
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 11, color: '#c9a84c', letterSpacing: 2, whiteSpace: 'nowrap' }}>⚔ NEXUS</span>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>{campaignMode ? (viewer ? 'Mesa tática · ao vivo' : 'Mesa tática') : 'Editor de Mapas'}</span>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{scene.name}</span>
        <div style={{ flex: 1 }} />
        {!viewer && (<>
        <button disabled={!canUndo} onClick={() => dispatch({ type: 'UNDO' })} style={{ ...topBtn, opacity: canUndo ? 1 : 0.3 }}>↩ Desfazer</button>
        <button disabled={!canRedo} onClick={() => dispatch({ type: 'REDO' })} style={{ ...topBtn, opacity: canRedo ? 1 : 0.3 }}>↪ Refazer</button>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />
        <button style={topBtn} onClick={() => bgInputRef.current?.click()}>🖼 Adicionar Imagem</button>
        <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { loadBg(e.target.files?.[0]); e.target.value = ''; }} />
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />
        </>)}
        <button style={{ ...topBtn, padding: '5px 8px' }} onClick={() => { setScale(1); setPan({ x: 60, y: 60 }); }}>⌂</button>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', minWidth: 36 }}>{Math.round(scale * 100)}%</span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* LEFT PANEL */}
        {showLeft && !viewer && (
          <div style={{ width: 210, flexShrink: 0, background: '#12121e', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px 6px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ flex: 1, fontFamily: 'Cinzel,serif', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase' }}>Cenas</span>
              <button onClick={addScene} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }} title="Nova cena">+</button>
            </div>
            <div style={{ display: 'flex', overflowX: 'auto', padding: '0 8px 8px', gap: 6, flexShrink: 0 }}>
              {scenes.map(sc => {
                const firstImgEl = (sc.elements || []).find(el => el.type === 'image');
                const thumbSrc = firstImgEl ? imageStore[firstImgEl.imageId] : bgImages[sc.id];
                return (
                  <div key={sc.id} onClick={() => setActiveScene(sc.id)}
                    style={{ flexShrink: 0, width: 72, borderRadius: 6, cursor: 'pointer', border: `1px solid ${sc.id === activeScene ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.06)'}`, background: sc.id === activeScene ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
                    <div style={{ aspectRatio: '16/9', background: '#0d0d1a', position: 'relative', overflow: 'hidden' }}>
                      {thumbSrc ? <img src={thumbSrc} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} /> : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, opacity: 0.15 }}>🗺</div>}
                      {sc.id === activeScene && <div style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: '50%', background: '#a855f7' }} />}
                    </div>
                    <div style={{ padding: '3px 4px 4px', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ flex: 1, fontSize: 9, color: sc.id === activeScene ? '#fff' : 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sc.name}</span>
                      <button onClick={e => { e.stopPropagation(); renameScene(sc.id); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 9, padding: '1px 2px' }} title="Renomear">✏</button>
                      {scenes.length > 1 && <button onClick={e => { e.stopPropagation(); deleteScene(sc.id); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 9, padding: '1px 2px' }} title="Excluir">✕</button>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
            <div style={{ padding: '8px 12px 4px', flexShrink: 0 }}>
              <span style={{ fontFamily: 'Cinzel,serif', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase' }}>Camadas</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
              {[...layers].reverse().map(layer => {
                const cnt = elements.filter(el => el.layerId === layer.id).length;
                return (
                  <div key={layer.id} style={{ marginBottom: 4, borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 6px' }}>
                      <button onClick={() => dispatch({ type: 'SET_LAYER_PROP', sceneId: scene.id, layerId: layer.id, prop: 'visible', value: !layer.visible })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0, opacity: layer.visible ? 1 : 0.3, color: 'rgba(255,255,255,0.7)' }} title="Visibilidade">👁</button>
                      <button onClick={() => dispatch({ type: 'SET_LAYER_PROP', sceneId: scene.id, layerId: layer.id, prop: 'locked', value: !layer.locked })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0, opacity: layer.locked ? 1 : 0.3, color: 'rgba(255,255,255,0.7)' }} title="Travar">🔒</button>
                      <span style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{layer.name}</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{cnt}</span>
                    </div>
                    <div style={{ padding: '0 6px 4px' }}>
                      <input type="range" min={0} max={1} step={0.05} value={layer.opacity}
                        onChange={e => dispatch({ type: 'SET_LAYER_PROP', sceneId: scene.id, layerId: layer.id, prop: 'opacity', value: +e.target.value })}
                        style={{ width: '100%', height: 3, cursor: 'pointer', accentColor: '#a855f7' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MAP CANVAS */}
        <div ref={containerRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor }}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onWheel={onWheel} onContextMenu={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); loadBg(e.dataTransfer.files?.[0]); }} onDragOver={e => e.preventDefault()}>

          {!hasImgEls && !bgImages[scene.id] && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, pointerEvents: 'none' }}>
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.14 }} xmlns="http://www.w3.org/2000/svg">
                <defs><pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1.2" fill="#fff" /></pattern></defs>
                <rect width="100%" height="100%" fill="url(#dots)" />
              </svg>
              <div style={{ fontSize: 56, opacity: 0.15 }}>🗺️</div>
              <div style={{ fontFamily: 'Cinzel,serif', fontSize: 13, letterSpacing: 3, color: 'rgba(255,255,255,0.12)' }}>ARRASTE UMA IMAGEM AQUI</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.08)' }}>ou clique em "Adicionar Imagem" acima</div>
            </div>
          )}

          {/* viewer: elementos sem pointer-events ⇒ clique cai no container (pan/zoom apenas) */}
          <div style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${pan.x}px,${pan.y}px) scale(${scale})`, transformOrigin: '0 0', width: mapW, height: mapH, pointerEvents: viewer ? 'none' : undefined }}>

            {/* IMAGE ELEMENTS */}
            {elements.filter(el => el.type === 'image' && (!viewer || (!el.hidden && !el.spectre))).map(img => {
              const layer = layers.find(l => l.id === img.layerId);
              if (layer && !layer.visible) return null;
              const src = imageStore[img.imageId];
              if (!src) return null;
              const isSel = selIds.has(img.id);
              const isSingleSel = isSel && selIds.size === 1;
              const livePos    = dragRef.current?.positions?.[img.id];
              const liveResize = resizeRef.current?.elId === img.id ? resizeRef.current.live : null;
              const liveRot    = rotateRef.current?.elId === img.id ? rotateRef.current.liveRotation : (img.rotation || 0);
              const px = liveResize?.x ?? livePos?.x ?? img.x;
              const py = liveResize?.y ?? livePos?.y ?? img.y;
              const pw = liveResize?.w ?? img.w;
              const ph = liveResize?.h ?? img.h;
              const opacity = (img.hidden ? 0.25 : 1) * (layer?.opacity ?? 1);
              return (
                <div key={img.id}
                  style={{ position: 'absolute', left: px, top: py, width: pw, height: ph, transform: `rotate(${liveRot}deg)`, transformOrigin: 'center center', opacity, outline: isSel ? '2px solid #a855f7' : 'none', outlineOffset: 1, cursor: (img.locked || layer?.locked) ? 'default' : 'grab', zIndex: (layerOrder[img.layerId] ?? 0) * 10 + 5, pointerEvents: isSel ? 'auto' : 'none' }}
                  onMouseDown={e => onElementDown(e, img)}
                  onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setSelIds(new Set([img.id])); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'image', elId: img.id }); }}>
                  <img src={src} draggable={false} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />
                  {img.locked && <span style={{ position: 'absolute', top: 4, left: 4, fontSize: 10, background: 'rgba(0,0,0,0.7)', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔒</span>}
                  {isSingleSel && !img.locked && (<>
                    {[['NW','nw-resize',{top:-5,left:-5}],['NE','ne-resize',{top:-5,right:-5}],['SW','sw-resize',{bottom:-5,left:-5}],['SE','se-resize',{bottom:-5,right:-5}]].map(([key, cur, pos]) => (
                      <div key={key}
                        style={{ position: 'absolute', width: 10, height: 10, background: '#a855f7', border: '2px solid #fff', borderRadius: 2, cursor: cur, zIndex: 6, ...pos }}
                        onMouseDown={e => {
                          e.stopPropagation(); e.preventDefault();
                          elementDownRef.current = true;
                          const { x: sx, y: sy } = clientXY(e);
                          const wp = screenToWorld(sx, sy);
                          resizeRef.current = { elId: img.id, corner: key, startMouse: { wx: wp.x, wy: wp.y }, startEl: { x: img.x, y: img.y, w: img.w, h: img.h } };
                        }} />
                    ))}
                    <div
                      style={{ position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)', width: 12, height: 12, borderRadius: '50%', background: '#fbbf24', border: '2px solid #fff', cursor: 'crosshair', zIndex: 6 }}
                      onMouseDown={e => {
                        e.stopPropagation(); e.preventDefault();
                        elementDownRef.current = true;
                        const rect = containerRef.current.getBoundingClientRect();
                        const { pan: p, scale: s } = stateRef.current;
                        const cx = (img.x + img.w / 2) * s + p.x;
                        const cy = (img.y + img.h / 2) * s + p.y;
                        const msx = e.clientX - rect.left, msy = e.clientY - rect.top;
                        rotateRef.current = { elId: img.id, cx, cy, startAngle: Math.atan2(msy - cy, msx - cx) * 180 / Math.PI, startRotation: img.rotation || 0, liveRotation: img.rotation || 0 };
                      }} />
                  </>)}
                </div>
              );
            })}

            {/* GRID — oversized SVG gives seamless coverage 50 000 world-px beyond scene bounds */}
            {showGrid && (
              <svg style={{ position: 'absolute', top: -gridHalf, left: -gridHalf, width: mapW + 2 * gridHalf, height: mapH + 2 * gridHalf, pointerEvents: 'none', zIndex: 6 }} xmlns="http://www.w3.org/2000/svg">
                <defs><pattern id="mapgrid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse" x={gridPatOff} y={gridPatOff}><path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.8" /></pattern></defs>
                <rect width="100%" height="100%" fill="url(#mapgrid)" />
              </svg>
            )}

            {/* FOG */}
            {fogRects.length > 0 && (
              <svg style={{ position: 'absolute', top: 0, left: 0, width: mapW, height: mapH, pointerEvents: 'none', zIndex: 200 }} xmlns="http://www.w3.org/2000/svg">
                {fogRects.map(({ x, y }, i) => <rect key={i} x={x} y={y} width={gridSize} height={gridSize} fill={viewer ? 'rgba(0,0,0,0.98)' : 'rgba(0,0,0,0.88)'} />)}
              </svg>
            )}

            {/* TOKENS */}
            {elements.filter(el => el.type === 'token' && (!viewer || (!el.hidden && !el.spectre))).map(t => {
              const tokLayer = layers.find(l => l.id === t.layerId);
              if (tokLayer && !tokLayer.visible) return null;
              const isSel = selIds.has(t.id);
              const livePos = dragRef.current?.positions?.[t.id];
              const px = livePos ? livePos.x : t.x;
              const py = livePos ? livePos.y : t.y;
              const opacity = (t.hidden ? 0.25 : t.spectre ? 0.45 : 1) * (tokLayer?.opacity ?? 1);
              const tokImg = t.imageId ? imageStore[t.imageId] : null;
              return (
                <div key={t.id} style={{
                  position: 'absolute', left: px - t.size / 2, top: py - t.size / 2, width: t.size, height: t.size,
                  borderRadius: '50%', background: tokImg ? '#12121e' : t.color, opacity,
                  border: isSel ? '2.5px solid #a855f7' : `2.5px solid ${tokImg ? t.color : 'rgba(255,255,255,0.85)'}`,
                  boxShadow: isSel ? `0 0 0 3px rgba(168,85,247,0.5),0 0 14px ${t.color}99` : `0 0 14px ${t.color}99,0 2px 8px rgba(0,0,0,0.5)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.max(11, Math.round(t.size * 0.3)), fontWeight: 700, color: '#fff',
                  filter: t.spectre ? 'blur(1.5px)' : 'none', cursor: (t.locked || tokLayer?.locked) ? 'not-allowed' : 'grab', zIndex: (layerOrder[t.layerId] ?? 0) * 10 + 5,
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)', transition: 'opacity 0.2s,box-shadow 0.15s',
                }}
                  onMouseDown={e => onElementDown(e, t)}
                  onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setSelIds(new Set([t.id])); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'token', tokenId: t.id }); }}>
                  {tokImg
                    ? <img src={tokImg} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', pointerEvents: 'none' }} />
                    : (t.label || '?').charAt(0).toUpperCase()}
                  {(t.conditions || []).length > 0 && (
                    <div style={{ position: 'absolute', top: -Math.max(10, t.size * 0.22), left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 1, whiteSpace: 'nowrap', fontSize: Math.max(10, Math.round(t.size * 0.26)), filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))', pointerEvents: 'none' }}>
                      {(t.conditions || []).map((c, i) => <span key={i}>{c}</span>)}
                    </div>
                  )}
                  {tokImg && t.label && t.label !== '?' && (
                    <div style={{ position: 'absolute', bottom: -17, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.75)', borderRadius: 4, padding: '1px 6px', fontSize: 10, whiteSpace: 'nowrap', pointerEvents: 'none' }}>{t.label}</div>
                  )}
                  {t.locked && <span style={{ position: 'absolute', top: -5, right: -5, fontSize: 9, background: 'rgba(0,0,0,0.75)', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔒</span>}
                </div>
              );
            })}

            {/* DRAWINGS (spec 0008 AC-1) */}
            {elements.filter(el => el.type === 'drawing' && (!viewer || (!el.hidden && !el.spectre))).map(d => {
              const dLayer = layers.find(l => l.id === d.layerId);
              if (dLayer && !dLayer.visible) return null;
              const isSel = selIds.has(d.id);
              const livePos = dragRef.current?.positions?.[d.id];
              const px = livePos ? livePos.x : d.x;
              const py = livePos ? livePos.y : d.y;
              const opacity = (d.hidden ? 0.3 : d.spectre ? 0.5 : 1) * (dLayer?.opacity ?? 1);
              return (
                <div key={d.id}
                  style={{ position: 'absolute', left: px, top: py, width: d.w, height: d.h, opacity, zIndex: (layerOrder[d.layerId] ?? 0) * 10 + 5, outline: isSel ? '1.5px dashed #a855f7' : 'none', outlineOffset: 2, cursor: (d.locked || dLayer?.locked) ? 'default' : 'grab', pointerEvents: viewer ? 'none' : (isSel ? 'auto' : 'none'), filter: d.spectre ? 'blur(1px)' : 'none' }}
                  onMouseDown={e => onElementDown(e, d)}
                  onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setSelIds(new Set([d.id])); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'image', elId: d.id }); }}>
                  <svg width={Math.max(1, d.w)} height={Math.max(1, d.h)} style={{ display: 'block', overflow: 'visible', pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg"><DrawingShape d={d} /></svg>
                </div>
              );
            })}

            {/* preview do traço em andamento */}
            {drawLive && drawLive.pts.length > 0 && (
              <svg style={{ position: 'absolute', top: 0, left: 0, width: mapW, height: mapH, pointerEvents: 'none', zIndex: 205, overflow: 'visible' }} xmlns="http://www.w3.org/2000/svg">
                {(() => {
                  const pts = drawLive.pts, a = pts[0], b = pts[pts.length - 1];
                  const p = { fill: 'none', stroke: drawLive.color, strokeWidth: drawLive.strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: 0.9 };
                  if (drawLive.shape === 'line') return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...p} />;
                  if (drawLive.shape === 'rect') return <rect x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)} {...p} />;
                  if (drawLive.shape === 'circle') return <ellipse cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} rx={Math.abs(b.x - a.x) / 2} ry={Math.abs(b.y - a.y) / 2} {...p} />;
                  return <polyline points={pts.map(pt => `${pt.x},${pt.y}`).join(' ')} {...p} />;
                })()}
              </svg>
            )}

            {/* NOTES */}
            {elements.filter(el => el.type === 'note' && (!viewer || (!el.hidden && !el.spectre))).map(n => {
              const noteLayer = layers.find(l => l.id === n.layerId);
              if (noteLayer && !noteLayer.visible) return null;
              const isSel = selIds.has(n.id);
              const livePos = dragRef.current?.positions?.[n.id];
              const px = livePos ? livePos.x : n.x;
              const py = livePos ? livePos.y : n.y;
              return (
                <div key={n.id}
                  style={{ position: 'absolute', left: px, top: py, background: '#fbbf24', color: '#1a1500', padding: '8px 10px', borderRadius: 4, fontSize: 12, maxWidth: 160, wordBreak: 'break-word', boxShadow: isSel ? '0 0 0 2px #a855f7,3px 4px 12px rgba(0,0,0,0.5)' : '3px 4px 12px rgba(0,0,0,0.5)', zIndex: (layerOrder[n.layerId] ?? 0) * 10 + 5, opacity: (n.hidden ? 0.35 : 1) * (noteLayer?.opacity ?? 1), cursor: (n.locked || noteLayer?.locked) ? 'default' : 'grab' }}
                  onMouseDown={e => onElementDown(e, n)}>
                  {n.text}
                  {n.locked && <span style={{ position: 'absolute', top: -5, right: -5, fontSize: 9, background: 'rgba(0,0,0,0.75)', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔒</span>}
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); deleteEl(n.id); }}
                    style={{ position: 'absolute', top: -7, right: -7, width: 17, height: 17, borderRadius: '50%', background: '#222', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11 }}>×</button>
                </div>
              );
            })}

            {/* MEASURE */}
            {measureLine && (
              <svg style={{ position: 'absolute', top: 0, left: 0, width: mapW, height: mapH, pointerEvents: 'none', zIndex: 210 }} xmlns="http://www.w3.org/2000/svg">
                <line x1={measureLine.x1} y1={measureLine.y1} x2={measureLine.x2} y2={measureLine.y2} stroke="#fbbf24" strokeWidth={2 / scale} strokeDasharray={`${6 / scale},${4 / scale}`} />
                <circle cx={measureLine.x1} cy={measureLine.y1} r={5 / scale} fill="#fbbf24" />
                <circle cx={measureLine.x2} cy={measureLine.y2} r={5 / scale} fill="#fbbf24" />
                {measureDist > 0 && <text x={(measureLine.x1 + measureLine.x2) / 2} y={(measureLine.y1 + measureLine.y2) / 2 - 10 / scale} fill="#fbbf24" fontSize={13 / scale} textAnchor="middle" fontFamily="Inter,system-ui,sans-serif" fontWeight="700">{measureDist} cel</text>}
              </svg>
            )}
          </div>

          {boxSel && (
            <div style={{ position: 'absolute', left: Math.min(boxSel.x1, boxSel.x2), top: Math.min(boxSel.y1, boxSel.y2), width: Math.abs(boxSel.x2 - boxSel.x1), height: Math.abs(boxSel.y2 - boxSel.y1), border: '1.5px dashed rgba(168,85,247,0.8)', background: 'rgba(168,85,247,0.08)', pointerEvents: 'none', zIndex: 40 }} />
          )}

          {weather === 'rain' && <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 25 }}>{Array.from({ length: 80 }, (_, i) => <div key={i} style={{ position: 'absolute', left: `${(i * 13) % 100}%`, top: `${-10 - (i * 7) % 20}%`, width: 1.5, height: `${10 + (i * 3) % 15}px`, background: `rgba(174,214,241,${0.3 + (i % 5) * 0.08})`, animation: `rain ${0.5 + (i % 6) * 0.1}s linear ${(i % 10) * 0.2}s infinite` }} />)}</div>}
          {weather === 'snow' && <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 25 }}>{Array.from({ length: 60 }, (_, i) => <div key={i} style={{ position: 'absolute', left: `${(i * 17) % 100}%`, top: `${-(i * 3) % 10}%`, width: `${3 + (i % 4)}px`, height: `${3 + (i % 4)}px`, borderRadius: '50%', background: `rgba(255,255,255,${0.5 + (i % 5) * 0.1})`, animation: `snow ${2 + (i % 6) * 0.5}s ease-in-out ${(i % 8) * 0.5}s infinite` }} />)}</div>}
          {weather === 'fog' && <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 25 }}>{[0, 1, 2].map(i => <div key={i} style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse ${150 + i * 60}% ${80 + i * 30}% at ${20 + i * 30}% ${30 + i * 20}%, rgba(180,190,200,0.18) 0%, transparent 70%)`, animation: `fogDrift ${8 + i * 4}s ease-in-out ${i * 3}s infinite` }} />)}<div style={{ position: 'absolute', inset: 0, background: 'rgba(150,170,190,0.08)' }} /></div>}

          <div style={{ position: 'absolute', bottom: 10, left: 10, fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', pointerEvents: 'none' }}>{Math.round(scale * 100)}% · {gridSize}px{snapGrid ? ' · snap' : ''}</div>
        </div>

        {/* RIGHT TOOLBAR */}
        <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 30, display: 'flex', flexDirection: 'column', gap: 2, background: 'rgba(22,22,46,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, padding: 6 }}>
          {!viewer && (<>
          {TOOLS.map(t => <button key={t.id} title={t.label} onClick={() => setTool(t.id)} style={TB(tool === t.id)}>{t.ch}</button>)}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
          </>)}
          <button title="Zoom +" onClick={() => setScale(s => Math.min(6, s * 1.2))} style={TB(false)}>＋</button>
          <button title="Zoom -" onClick={() => setScale(s => Math.max(0.08, s / 1.2))} style={TB(false)}>－</button>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
          <button title="Grade" onClick={() => setShowGrid(g => !g)} style={TB(showGrid)}>⊞</button>
          {!viewer && (<>
          <button title={snapGrid ? 'Snap ativo' : 'Snap à grade'} onClick={() => setSnapGrid(g => !g)} style={TB(snapGrid)}>⊡</button>
          <button title="Revelar tudo" onClick={() => upScene({ fogCells: [] })} style={TB(false)}>☀</button>
          <button title="Cobrir tudo" onClick={coverFog} style={TB(false)}>🌑</button>
          <button title="Painel" onClick={() => setShowLeft(v => !v)} style={TB(showLeft)}>🗂</button>
          </>)}
        </div>

        {tool === 'token' && (
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 30, background: 'rgba(22,22,46,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Cor:</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{COLORS.map(c => <button key={c} onClick={() => setTokColor(c)} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: tokColor === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />)}</div>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
            <input value={tokLabel} onChange={e => setTokLabel(e.target.value)} placeholder="Rótulo" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 12px', color: '#fff', fontSize: 12, width: 100, outline: 'none' }} />
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: tokColor, border: '2px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{(tokLabel || '?').charAt(0).toUpperCase()}</div>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Tam:</span>
            {[['P', 0.5], ['M', 1], ['G', 2], ['E', 3]].map(([l, v]) => (
              <button key={l} title={`${v}× célula`} onClick={() => setTokSize(v)} style={{ ...TB(tokSize === v), width: 26, height: 26, borderRadius: 6, fontSize: 11 }}>{l}</button>
            ))}
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
            <button title="Token com imagem (retrato)" onClick={() => tokImgInputRef.current?.click()} style={{ ...TB(!!tokImageId), width: 28, height: 28, borderRadius: 6 }}>🖼</button>
            {tokImageId && imageStore[tokImageId] && (
              <img src={imageStore[tokImageId]} alt="" title="Clique para remover a imagem" onClick={() => setTokImageId(null)}
                style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${tokColor}`, cursor: 'pointer' }} />
            )}
            <input ref={tokImgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { loadTokenImage(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        )}

        {tool === 'draw' && !viewer && (
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 30, background: 'rgba(22,22,46,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {[['free', '✏', 'Traço livre'], ['line', '╱', 'Linha'], ['rect', '▭', 'Retângulo'], ['circle', '◯', 'Círculo']].map(([m, ch, tt]) => (
              <button key={m} title={tt} onClick={() => setDrawMode(m)} style={{ ...TB(drawMode === m), width: 30, height: 30, borderRadius: 8 }}>{ch}</button>
            ))}
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
            {COLORS.map(c => (
              <button key={c} onClick={() => setDrawColor(c)} style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: drawColor === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
            ))}
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
            {DRAW_WIDTHS.map(w => (
              <button key={w} title={`Espessura ${w}px`} onClick={() => setDrawWidth(w)} style={{ ...TB(drawWidth === w), width: 30, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 14, height: w, background: '#fff', borderRadius: w }} />
              </button>
            ))}
          </div>
        )}

        {(tool === 'fog' || tool === 'reveal') && (
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 30, background: 'rgba(22,22,46,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Célula:</span>
            <button onClick={() => upScene({ gridSize: Math.max(20, gridSize - 10) })} style={{ ...TB(false), width: 28, height: 28, borderRadius: 6, fontSize: 14 }}>-</button>
            <span style={{ fontSize: 13, color: '#fff', fontFamily: 'monospace', minWidth: 32, textAlign: 'center' }}>{gridSize}</span>
            <button onClick={() => upScene({ gridSize: Math.min(200, gridSize + 10) })} style={{ ...TB(false), width: 28, height: 28, borderRadius: 6, fontSize: 14 }}>+</button>
          </div>
        )}

        {measureLine && measureDist > 0 && (
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 30, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: 10, padding: '8px 18px', fontSize: 13, color: '#fbbf24', fontFamily: 'monospace' }}>
            {measureDist} cel ({Math.round(measureDist * 1.5 * 10) / 10} m)
          </div>
        )}

        {/* UNIFIED ACTION TOOLBAR */}
        {selIds.size > 0 && !measureLine && tool === 'select' && (
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: 'rgba(13,13,24,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={e => e.stopPropagation()}>

            {selIds.size > 1 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginRight: 4, whiteSpace: 'nowrap' }}>{selIds.size} sel</span>}

            <button title={anyHidden ? 'Mostrar' : 'Ocultar'} onClick={() => batchToggle('hidden')} style={actBtn(anyHidden)}>👁</button>
            <button title={anyLocked ? 'Destravar' : 'Travar'} onClick={() => batchToggle('locked')} style={actBtn(anyLocked)}>🔒</button>

            {/* Layer picker */}
            <div style={{ position: 'relative' }}>
              <button title="Mover para camada" onClick={e => { e.stopPropagation(); setLayerPickerOpen(v => !v); }}
                style={{ height: 40, padding: '0 10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, background: layerPickerOpen ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)', color: layerPickerOpen ? '#a855f7' : 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                {layers.find(l => l.id === singleSel?.layerId)?.name || 'Camada'} ▾
              </button>
              {layerPickerOpen && (
                <div style={{ position: 'absolute', bottom: '110%', left: 0, background: 'rgba(13,13,24,0.98)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '4px 0', zIndex: 60, minWidth: 130 }}
                  onClick={e => e.stopPropagation()}>
                  {layers.map(l => (
                    <button key={l.id} onClick={() => { batchSetLayer(l.id); setLayerPickerOpen(false); }}
                      style={{ display: 'block', width: '100%', padding: '7px 14px', background: singleSel?.layerId === l.id ? 'rgba(168,85,247,0.12)' : 'none', border: 'none', color: singleSel?.layerId === l.id ? '#a855f7' : 'rgba(255,255,255,0.8)', cursor: 'pointer', textAlign: 'left', fontSize: 12 }}>
                      {l.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button title="Duplicar (Ctrl+D)" onClick={dupSelected} style={actBtn(false)}>⬚</button>

            {singleSel?.type === 'token' && (<>
              <button title="Editar Rótulo" onClick={() => editLabel(singleSel.id)} style={actBtn(false)}>Tt</button>
              <button title={singleSel.spectre ? 'Remover Espectro' : 'Espectro'} onClick={() => toggleSpectre(singleSel.id)} style={actBtn(singleSel.spectre)}>👻</button>
              <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
              {[['P', 0.5], ['M', 1], ['G', 2], ['E', 3]].map(([l, v]) => (
                <button key={l} title={`Tamanho ${v}× célula`} onClick={() => updateEl(singleSel.id, { size: Math.max(18, Math.round(gridSize * v)) })}
                  style={actBtn(Math.abs(singleSel.size - gridSize * v) < 2)}>{l}</button>
              ))}
            </>)}

            {singleSel?.type === 'image' && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', padding: '0 6px' }}>{Math.round(singleSel.w)}×{Math.round(singleSel.h)}</span>
            )}

            {selIds.size > 1 && (<>
              <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
              {[
                { label: '⇤', title: 'Alinhar esquerda',       action: () => alignSelected('x', 'min') },
                { label: '↔', title: 'Centralizar horizontal',  action: () => alignSelected('x', 'mid') },
                { label: '⇥', title: 'Alinhar direita',         action: () => alignSelected('x', 'max') },
                { label: '⇡', title: 'Alinhar topo',            action: () => alignSelected('y', 'min') },
                { label: '↕', title: 'Centralizar vertical',    action: () => alignSelected('y', 'mid') },
                { label: '⇣', title: 'Alinhar base',            action: () => alignSelected('y', 'max') },
              ].map((btn, i) => (
                <button key={i} title={btn.title} onClick={btn.action} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}>{btn.label}</button>
              ))}
            </>)}

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
            <button title="Deletar (Del)" onClick={() => { deleteEls([...selIds]); setSelIds(new Set()); }}
              style={{ ...actBtn(false), color: 'rgba(248,113,113,0.75)' }}>🗑</button>

            {singleSel?.type === 'token' && (<>
              <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: singleSel.color || '#888', border: '2px solid rgba(255,255,255,0.5)' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{singleSel.label}</span>
              </div>
            </>)}

            {singleSel?.type === 'note' && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: 4 }}>{singleSel.text}</span>
            )}
          </div>
        )}

        {/* CONTEXT MENU */}
        {ctxMenu && (
          <div style={{ position: 'fixed', left: Math.min(ctxMenu.x, window.innerWidth - 220), top: Math.min(ctxMenu.y, window.innerHeight - 340), zIndex: 2000, background: 'rgba(13,13,24,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '6px 0', minWidth: 210, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', fontFamily: 'Inter,system-ui,sans-serif' }}
            onClick={e => e.stopPropagation()}>
            {ctxMenu.type === 'token' ? (<>
              {[
                { label: elements.find(e => e.id === ctxMenu.tokenId)?.hidden ? '👁 Mostrar Token' : '👁 Ocultar Token', action: () => { toggleHide(ctxMenu.tokenId); setCtxMenu(null); } },
                { label: elements.find(e => e.id === ctxMenu.tokenId)?.locked ? '🔓 Destravar' : '🔒 Travar', action: () => { toggleLock(ctxMenu.tokenId); setCtxMenu(null); } },
                { label: '⬚ Duplicar', action: () => { dupEl(ctxMenu.tokenId); setCtxMenu(null); } },
                { label: 'Tt Editar Rótulo', action: () => { editLabel(ctxMenu.tokenId); setCtxMenu(null); } },
                { label: elements.find(e => e.id === ctxMenu.tokenId)?.spectre ? '👻 Remover Espectro' : '👻 Espectro', action: () => { toggleSpectre(ctxMenu.tokenId); setCtxMenu(null); } },
              ].map((item, i) => (
                <button key={i} onClick={item.action} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 13 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>{item.label}</button>
              ))}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
              <div style={{ padding: '4px 14px 2px', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>CONDIÇÕES</div>
              <div style={{ padding: '2px 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 200 }}>
                {CONDICOES.map(c => {
                  const on = (elements.find(e2 => e2.id === ctxMenu.tokenId)?.conditions || []).includes(c.e);
                  return (
                    <button key={c.e} title={c.n} onClick={() => toggleCondition(ctxMenu.tokenId, c.e)}
                      style={{ width: 28, height: 28, borderRadius: 6, border: on ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.08)', background: on ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', fontSize: 14 }}>{c.e}</button>
                  );
                })}
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
              <button onClick={() => { deleteEl(ctxMenu.tokenId); setCtxMenu(null); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', color: 'rgba(248,113,113,0.85)', cursor: 'pointer', fontSize: 13 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>🗑 Deletar Token</button>
            </>) : ctxMenu.type === 'image' ? (<>
              {[
                { label: elements.find(e => e.id === ctxMenu.elId)?.hidden ? '👁 Mostrar' : '👁 Ocultar', action: () => { toggleHide(ctxMenu.elId); setCtxMenu(null); } },
                { label: elements.find(e => e.id === ctxMenu.elId)?.locked ? '🔓 Destravar' : '🔒 Travar', action: () => { toggleLock(ctxMenu.elId); setCtxMenu(null); } },
                { label: '⬚ Duplicar', action: () => { dupEl(ctxMenu.elId); setCtxMenu(null); } },
              ].map((item, i) => (
                <button key={i} onClick={item.action} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 13 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>{item.label}</button>
              ))}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
              <button onClick={() => { deleteEl(ctxMenu.elId); setCtxMenu(null); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', color: 'rgba(248,113,113,0.85)', cursor: 'pointer', fontSize: 13 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>🗑 Deletar Imagem</button>
            </>) : (<>
              <div style={{ padding: '6px 16px 2px', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, textTransform: 'uppercase' }}>Mapa</div>
              {[
                { label: '🖼 Adicionar Imagem', action: () => { bgInputRef.current?.click(); setCtxMenu(null); } },
                { label: '⊞ Mostrar/Ocultar Grade', action: () => { setShowGrid(g => !g); setCtxMenu(null); } },
              ].map((item, i) => (
                <button key={i} onClick={item.action} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 13 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>{item.label}</button>
              ))}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
              <div style={{ padding: '6px 16px 2px', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, textTransform: 'uppercase' }}>Clima</div>
              {[{ label: '🌧 Chuva', val: 'rain' }, { label: '❄ Neve', val: 'snow' }, { label: '🌫 Névoa Densa', val: 'fog' }, { label: '✕ Limpar Clima', val: null }].map((item, i) => (
                <button key={i} onClick={() => { setWeather(w => w === item.val ? null : item.val); setCtxMenu(null); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', background: weather === item.val && item.val ? 'rgba(168,85,247,0.1)' : 'none', border: 'none', color: weather === item.val && item.val ? '#a855f7' : 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 13 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }} onMouseLeave={e => { e.currentTarget.style.background = weather === item.val && item.val ? 'rgba(168,85,247,0.1)' : 'none'; }}>{item.label}</button>
              ))}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
              <div style={{ padding: '6px 16px 2px', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, textTransform: 'uppercase' }}>Névoa de Guerra</div>
              {[
                { label: '🌑 Cobrir com Névoa', action: () => { coverFog(); setCtxMenu(null); } },
                { label: '🌒 Auto Névoa (bordas)', action: () => { autoFog(); setCtxMenu(null); } },
                { label: '☀ Revelar Tudo', action: () => { upScene({ fogCells: [] }); setCtxMenu(null); } },
              ].map((item, i) => (
                <button key={i} onClick={item.action} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 13 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>{item.label}</button>
              ))}
            </>)}
          </div>
        )}
      </div>
    </div>
  );
}
