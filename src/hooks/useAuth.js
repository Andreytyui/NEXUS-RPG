import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

// Cria o doc do usuário apenas se não existir — nunca sobrescreve plan/subscribedSystems,
// que são exclusivos do backend (spec 0004 AC-1/AC-2; antes disto, todo login resetava plan).
const fsEnsureUserDoc = async (uid, email) => {
  if (!uid) return;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { email, plan: "free" });
    } else if (email && snap.data().email !== email) {
      await setDoc(ref, { email }, { merge: true });
    }
  } catch (e) {
    console.error("[useAuth] fsEnsureUserDoc falhou:", e);
  }
};

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user || null);
      setAuthLoading(false);
      if (user) fsEnsureUserDoc(user.uid, user.email || "");
    });
    return unsub;
  }, []);

  const userName =
    localStorage.getItem("nexus_profile_name") ||
    currentUser?.displayName ||
    "Agente";

  const userPhoto =
    localStorage.getItem("nexus_profile_photo") ||
    currentUser?.photoURL ||
    "";

  const logout = () => {
    localStorage.removeItem("nexus_system");
    localStorage.removeItem("nexus_screen");
    signOut(auth);
  };

  return { currentUser, authLoading, userName, userPhoto, logout };
}
