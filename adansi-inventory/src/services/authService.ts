import {
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  type User as FirebaseUser
} from "firebase/auth";
import { auth } from "../firebase/firebase";
import type { SignIn } from "../access/members";

// Login with email/password
export async function login(email: string, password: string) {
  return await signInWithEmailAndPassword(auth, email, password);
}

// Login with Google
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

// How this person signed in, as the Firestore rules will see it.
// Never throws: null means the token could not be read.
export async function readSignIn(user: FirebaseUser): Promise<SignIn | null> {
  try {
    const token = await user.getIdTokenResult();
    return {
      emailVerified: token.claims.email_verified === true,
      provider: token.signInProvider,
    };
  } catch (error) {
    console.error("Could not read the sign-in token:", error);
    return null;
  }
}

// Logout
export async function logout() {
  return await signOut(auth);
}

