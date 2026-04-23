



import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";  // ← ADD THIS LINE
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDgVALAD_psp75b8a_22kj4sMmMvxz_vdE",
  authDomain: "adansi-assets-manager-2b063.firebaseapp.com",
  projectId: "adansi-assets-manager-2b063",
  storageBucket: "adansi-assets-manager-2b063.firebasestorage.app",
  messagingSenderId: "85112384025",
  appId: "1:85112384025:web:171aad28b66ee05cdb5888",
  measurementId: "G-J3W96B2TH5",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);  // ← ADD THIS LINE
export const storage = getStorage(app);

try {
  getAnalytics(app);
} catch (e) {
  console.warn("Analytics disabled:", e);
}




