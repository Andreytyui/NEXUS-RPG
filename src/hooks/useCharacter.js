import { useState, useEffect } from "react";
import { doc, setDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const fsSaveChar = async (uid, character) => {
  if (!uid || !character) return;
  try {
    const charId = String(character.id || character.createdAt || Date.now());
    await setDoc(doc(db, "users", uid, "characters", charId), { ...character, _updatedAt: Date.now() });
  } catch (_) {}
};

const fsDeleteChar = async (uid, character) => {
  if (!uid || !character) return;
  try {
    const charId = String(character.id || character.createdAt || Date.now());
    await deleteDoc(doc(db, "users", uid, "characters", charId));
  } catch (_) {}
};

const fsLoadChars = async (uid, systemId) => {
  if (!uid) return null;
  try {
    const q = query(collection(db, "users", uid, "characters"), where("systemId", "==", systemId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs.map(d => { const data = d.data(); delete data._updatedAt; return data; });
  } catch (_) { return null; }
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

  useEffect(() => {
    if (!systemId) { setCharacters([]); return; }
    const key = `nexus_characters_${systemId}`;
    try { setCharacters(JSON.parse(localStorage.getItem(key) || "[]")); }
    catch { setCharacters([]); }
    if (!uid) return;
    setCharsLoading(true);
    fsLoadChars(uid, systemId).then(fsChars => {
      setCharsLoading(false);
      if (fsChars && fsChars.length > 0) {
        setCharacters(fsChars);
        localStorage.setItem(key, JSON.stringify(fsChars));
      }
    });
  }, [uid, systemId]);

  useEffect(() => {
    if (systemId) {
      localStorage.setItem(`nexus_characters_${systemId}`, JSON.stringify(characters));
    }
  }, [characters, systemId]);

  const saveCharacter = (char) => {
    fsSaveChar(uid, char);
    setCharacters(prev => {
      const exists = prev.some(c => isSameChar(c, char));
      return exists
        ? prev.map(c => isSameChar(c, char) ? char : c)
        : [...prev, char];
    });
  };

  const deleteCharacter = (char) => {
    fsDeleteChar(uid, char);
    setCharacters(prev => prev.filter(c => !isSameChar(c, char)));
  };

  return { characters, setCharacters, charsLoading, saveCharacter, deleteCharacter };
}
