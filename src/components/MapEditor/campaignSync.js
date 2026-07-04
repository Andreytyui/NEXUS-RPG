/* Sync do mapa da mesa (spec 0007 / ADR 0005).
 * Firestore: campaigns/{id}/map/scene (cena ativa) + campaigns/{id}/map/img_* (imagens).
 * O doc legado map/current (tile-based aposentado) é ignorado pelo splitMapDocs. */
import { collection, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

/* Separa os docs da subcoleção map em cena ativa e imagens. Puro (testável). */
export function splitMapDocs(docs) {
  let scene = null;
  const images = {};
  for (const d of docs) {
    if (d.id === 'scene' && d.data?.scene) scene = d.data.scene;
    else if (d.id.startsWith('img_') && d.data?.data) images[d.id] = d.data.data;
  }
  return { scene, images };
}

/* Um único onSnapshot para cena + imagens. Devolve o unsubscribe. */
export function subscribeCampaignMap(db, campaignId, { onScene, onImages }) {
  return onSnapshot(
    collection(db, 'campaigns', campaignId, 'map'),
    (snap) => {
      const fromSelf = snap.metadata.hasPendingWrites; // eco de escrita local do mestre
      const { scene, images } = splitMapDocs(snap.docs.map((d) => ({ id: d.id, data: d.data() })));
      if (Object.keys(images).length) onImages?.(images, fromSelf);
      onScene?.(scene, fromSelf);
    },
    (e) => console.error('[mesa] snapshot do mapa falhou:', e)
  );
}

export function saveScene(db, campaignId, uid, scene) {
  return setDoc(doc(db, 'campaigns', campaignId, 'map', 'scene'), {
    engine: 'scene',
    scene: JSON.parse(JSON.stringify(scene)), // remove undefined/refs — Firestore-safe
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  }).catch((e) => console.error('[mesa] save da cena falhou:', e));
}

/* Limite prático abaixo do teto de 1MB/doc do Firestore. */
const DOC_SAFE = 900_000;

function downscale(dataUrl, maxDim, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * r));
      c.height = Math.max(1, Math.round(img.height * r));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/* Sobe a imagem reduzida; devolve o dataURL efetivamente salvo (ou null se não coube). */
export async function saveImage(db, campaignId, imageId, dataUrl) {
  let data = dataUrl;
  if (data.length > DOC_SAFE) data = (await downscale(data, 1600, 0.82)) || data;
  if (data.length > DOC_SAFE) data = (await downscale(data, 1200, 0.7)) || data;
  if (data.length > DOC_SAFE) {
    alert('Imagem grande demais para a mesa mesmo após redução — use um arquivo menor.');
    return null;
  }
  try {
    await setDoc(doc(db, 'campaigns', campaignId, 'map', imageId), {
      kind: 'image', data, updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('[mesa] save de imagem falhou:', e);
    return null;
  }
  return data;
}
