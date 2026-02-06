import { 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { auth } from "../firebase/firebase";

// Login with email/password
export async function login(email: string, password: string) {
  return await signInWithEmailAndPassword(auth, email, password);
}

// Login with Google
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

// Logout
export async function logout() {
  return await signOut(auth);
}

// Register new user
export async function register(email: string, password: string) {
  return await createUserWithEmailAndPassword(auth, email, password);
}


