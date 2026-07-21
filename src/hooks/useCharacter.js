import { useState, useEffect } from "react";
import { doc, setDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

// Falhas de Firestore NÃO são mais engolidas em silêncio (assessment-0021 grupo C): estas
// funções rejeitam a Promise, e o hook loga + expõe um flag para a UI avisar o usuário —
// senão a sincronização entre dispositivos falhava calada e parecia perda de ficha.
const fsSaveChar = async (uid, character) => {
  if (!uid || !character) return;
  const charId = String(character.id || character.createdAt || Date.now());
  await setDoc(doc(db, "users", uid, "characters", charId), { ...character, _updatedAt: Date.now() });
};

const fsDeleteChar = async (uid, character) => {
  if (!uid || !character) return;
  const charId = String(character.id || character.createdAt || Date.now());
  await deleteDoc(doc(db, "users", uid, "characters", charId));
};

// Retorna [] em coleção vazia; REJEITA em erro real (para distinguir "sem fichas" de "falhou").
const fsLoadChars = async (uid, systemId) => {
  if (!uid) return [];
  const q = query(collection(db, "users", uid, "characters"), where("systemId", "==", systemId));
  const snap = await getDocs(q);
  return snap.docs.map(d => { const data = d.data(); delete data._updatedAt; return data; });
};

const isSameChar = (a, b) =>
  (a.id && a.id === b.id) || (!a.id && a.createdAt === b.createdAt);

export function useCharacter(uid, systemId) {
  const [characters, setCharacters] = useState(() => {
    if (!systemId) return [];
    try { return JSON.parse(localStorage.getItem(`nexus_characters_${systemId}`) || "[]"); }
    catch { return []; }
  });
  const [charsLoading, setCharsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);   // falha ao ler do Firestore (≠ vazio)
  const [saveError, setSaveError] = useState(null);     // mensagem de falha ao salvar (ou null)

  useEffect(() => {
    if (!systemId) { setCharacters([]); return; }
    const key = `nexus_characters_${systemId}`;
    try { setCharacters(JSON.parse(localStorage.getItem(key) || "[]")); }
    catch { setCharacters([]); }
    if (!uid) return;
    setCharsLoading(true);
    setLoadError(false);
    fsLoadChars(uid, systemId).then(fsChars => {
      setCharsLoading(false);
      if (fsChars.length > 0) {
        setCharacters(fsChars);
        try { localStorage.setItem(key, JSON.stringify(fsChars)); } catch (e) { console.error("[useCharacter] localStorage:", e); }
      }
    }).catch(e => {
      setCharsLoading(false);
      setLoadError(true);
      console.error("[useCharacter] falha ao carregar fichas do Firestore:", e);
    });
  }, [uid, systemId]);

  useEffect(() => {
    if (!systemId) return;
    try { localStorage.setItem(`nexus_characters_${systemId}`, JSON.stringify(characters)); }
    catch (e) {
      console.error("[useCharacter] falha ao salvar fichas no localStorage (quota?):", e);
      setSaveError("Armazenamento local cheio — remova imagens grandes das fichas.");
    }
  }, [characters, systemId]);

  const saveCharacter = (char) => {
    setCharacters(prev => {
      const exists = prev.some(c => isSameChar(c, char));
      return exists ? prev.map(c => isSameChar(c, char) ? char : c) : [...prev, char];
    });
    fsSaveChar(uid, char)
      .then(() => setSaveError(null))
      .catch(e => {
        console.error("[useCharacter] falha ao salvar ficha no Firestore:", e);
        setSaveError("Falha ao salvar na nuvem — a ficha está salva neste dispositivo, mas pode não sincronizar.");
      });
  };

  const deleteCharacter = (char) => {
    setCharacters(prev => prev.filter(c => !isSameChar(c, char)));
    fsDeleteChar(uid, char).catch(e => console.error("[useCharacter] falha ao excluir ficha no Firestore:", e));
  };

  return { characters, setCharacters, charsLoading, loadError, saveError, clearSaveError: () => setSaveError(null), saveCharacter, deleteCharacter };
}
