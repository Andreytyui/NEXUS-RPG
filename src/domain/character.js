/* Lógica pura de personagem (camada domain — não importa React nem Firebase).
 * Fases do personagem (spec 0005): a fase "Normal" é virtual e corresponde a form.avatar;
 * form.phases[] guarda apenas as fases adicionais ({ id, label, image, imageAI? }). */

export const NORMAL_PHASE_ID = "normal";

// Aceita a ficha completa ({ form, ... }) ou o form solto.
const formOf = (char) => (char && char.form) || char || {};

export function getActivePhase(char) {
  const form = formOf(char);
  const phases = Array.isArray(form.phases) ? form.phases : [];
  const id = form.activePhaseId;
  if (!id || id === NORMAL_PHASE_ID) return null;
  const phase = phases.find((p) => p && p.id === id);
  return phase && phase.image ? phase : null;
}

export function getActiveAvatar(char) {
  const phase = getActivePhase(char);
  if (phase) return phase.image;
  return formOf(char).avatar || "";
}

export function isActiveAvatarAI(char) {
  const phase = getActivePhase(char);
  if (phase) return !!phase.imageAI;
  return !!formOf(char).avatarAI;
}
