import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const fsEnsureUserDoc = async (uid, email) => {
  if (!uid) return;
  try {
    await setDoc(doc(db, "users", uid), { email, plan: "free" }, { merge: true });
  } catch (_) {}
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
