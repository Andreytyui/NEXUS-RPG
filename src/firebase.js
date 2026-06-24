import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseApp = initializeApp({
  apiKey: "AIzaSyAunCnV2lla9DVIy_4A-ngR1W23dZNRUKU",
  authDomain: "nexus-rpg-app.firebaseapp.com",
  projectId: "nexus-rpg-app",
  storageBucket: "nexus-rpg-app.firebasestorage.app",
  messagingSenderId: "947645487813",
  appId: "1:947645487813:web:ab4b81ff1a37b8b65c2eac",
});

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
