import { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot, getDocs,
  doc, addDoc, updateDoc, serverTimestamp, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase";

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const fsGetCampaigns = (uid, cb, onError) => {
  const q = query(collection(db, "campaigns"), where("members", "array-contains", uid));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onError || (() => cb([])));
};

const fsCreateCamp = async (uid, userName, data) => {
  try {
    const system = data.system || "Genérico";
    const existingQ = query(
      collection(db, "campaigns"),
      where("masterId", "==", uid),
      where("system", "==", system),
      where("isActive", "==", true)
    );
    const existingSnap = await getDocs(existingQ);
    if (existingSnap.size >= 3) {
      return { limitError: `Você já possui 3 campanhas do sistema "${system}". Exclua uma antes de criar outra.` };
    }
    const code = generateCode();
    const ref = await addDoc(collection(db, "campaigns"), {
      name: data.name,
      description: data.description || "",
      system,
      masterId: uid,
      masterName: userName,
      inviteCode: code,
      members: [uid],
      memberNames: { [uid]: userName },
      createdAt: serverTimestamp(),
      isActive: true,
      maxPlayers: data.maxPlayers || 6,
      coverImage: data.coverImage || null,
    });
    return { id: ref.id, code };
  } catch (e) { console.error(e); return null; }
};

const fsJoinCamp = async (uid, userName, code) => {
  try {
    const q = query(collection(db, "campaigns"), where("inviteCode", "==", code.toUpperCase()));
    const snap = await getDocs(q);
    const activeDoc = snap.docs.find(d => d.data().isActive !== false);
    if (!activeDoc) return { error: "Código inválido ou campanha não encontrada." };
    const camp = activeDoc.data();
    if (camp.members.includes(uid)) return { error: "Você já é membro desta campanha." };
    if (camp.members.length >= (camp.maxPlayers || 6)) return { error: "Campanha lotada." };
    const campSystem = camp.system || "Genérico";
    const memberLimitQ = query(collection(db, "campaigns"), where("members", "array-contains", uid));
    const memberLimitSnap = await getDocs(memberLimitQ);
    const sameSystemActive = memberLimitSnap.docs.filter(d => {
      const data = d.data();
      return data.isActive !== false && (data.system || "Genérico") === campSystem;
    }).length;
    if (sameSystemActive >= 3) return { error: `Você já participa de 3 campanhas do sistema "${campSystem}".` };
    await updateDoc(doc(db, "campaigns", activeDoc.id), {
      members: arrayUnion(uid),
      [`memberNames.${uid}`]: userName,
    });
    await addDoc(collection(db, "campaigns", activeDoc.id, "messages"), {
      userId: "system", userName: "Sistema", userPhoto: null,
      content: `${userName} entrou na campanha.`,
      type: "system", timestamp: serverTimestamp(),
    });
    return { id: activeDoc.id };
  } catch (e) { console.error(e); return { error: "Erro ao entrar na campanha." }; }
};

const fsLeaveCamp = async (campId, uid) => {
  try {
    await updateDoc(doc(db, "campaigns", campId), {
      members: arrayRemove(uid),
      admins: arrayRemove(uid),
    });
  } catch (e) { console.error(e); }
};

export function useCampaign(uid, userName) {
  const [campaigns, setCampaigns] = useState([]);
  const [campsLoading, setCampsLoading] = useState(false);
  const [subKey, setSubKey] = useState(0);

  useEffect(() => {
    if (!uid) { setCampaigns([]); return; }
    setCampsLoading(true);
    const unsub = fsGetCampaigns(uid, (list) => {
      setCampaigns(list);
      setCampsLoading(false);
    }, () => {
      setCampaigns([]);
      setCampsLoading(false);
      setTimeout(() => setSubKey(k => k + 1), 5000);
    });
    return unsub;
  }, [uid, subKey]);

  const createCampaign = async (data) => {
    const r = await fsCreateCamp(uid, userName, data);
    if (r && !r.limitError) setSubKey(k => k + 1);
    return r;
  };

  const joinCampaign = async (code) => {
    const r = await fsJoinCamp(uid, userName, code);
    if (!r?.error) setSubKey(k => k + 1);
    return r;
  };

  const leaveCampaign = async (campId) => {
    await fsLeaveCamp(campId, uid);
    setSubKey(k => k + 1);
  };

  return { campaigns, campsLoading, createCampaign, joinCampaign, leaveCampaign };
}
