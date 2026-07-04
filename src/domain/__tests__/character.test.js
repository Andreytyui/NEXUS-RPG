import { getActiveAvatar, isActiveAvatarAI } from "../character";

const legado = { form: { avatar: "data:av" } };

// AC-1 (spec 0005): ficha legada sem phases devolve o avatar, sem IA presumida.
test("ficha legada sem phases devolve o avatar", () => {
  expect(getActiveAvatar(legado)).toBe("data:av");
  expect(isActiveAvatarAI(legado)).toBe(false);
});

// AC-4: fase ativa com imagem vence o avatar.
test("fase ativa com imagem vence o avatar", () => {
  const c = { form: { avatar: "data:av", phases: [{ id: "p1", label: "Exausto", image: "data:ex" }], activePhaseId: "p1" } };
  expect(getActiveAvatar(c)).toBe("data:ex");
});

test("fallbacks: id inexistente, fase sem imagem, activePhaseId normal", () => {
  const base = { avatar: "data:av", phases: [{ id: "p1", label: "X", image: "" }] };
  expect(getActiveAvatar({ form: { ...base, activePhaseId: "nao-existe" } })).toBe("data:av");
  expect(getActiveAvatar({ form: { ...base, activePhaseId: "p1" } })).toBe("data:av");
  expect(getActiveAvatar({ form: { ...base, activePhaseId: "normal" } })).toBe("data:av");
});

// AC-5: aviso de IA acompanha a fase ativa, não o avatar base.
test("flag de IA acompanha a fase ativa", () => {
  const c = { form: { avatar: "data:av", avatarAI: true, phases: [{ id: "p1", image: "data:ex", imageAI: false }], activePhaseId: "p1" } };
  expect(isActiveAvatarAI(c)).toBe(false);
  c.form.activePhaseId = null;
  expect(isActiveAvatarAI(c)).toBe(true);
});

test("aceita o form solto (sem wrapper)", () => {
  expect(getActiveAvatar({ avatar: "data:av" })).toBe("data:av");
});
