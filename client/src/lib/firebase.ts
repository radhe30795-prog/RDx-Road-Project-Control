import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { runtimeEnv } from "./runtimeConfig";

const firebaseConfig = {
  apiKey: runtimeEnv("VITE_FIREBASE_API_KEY"),
  authDomain: runtimeEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: runtimeEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: runtimeEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: runtimeEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: runtimeEnv("VITE_FIREBASE_APP_ID"),
};

const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);

export async function signInWithGoogle() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error("Firebase web configuration is missing. Add the Firebase project secrets first.");
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(firebaseAuth, provider);
  const idToken = await result.user.getIdToken();

  const response = await fetch("/api/auth/firebase/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    await signOut(firebaseAuth);
    const message = await response.text();
    throw new Error(message || "Could not create the ERP session.");
  }

  window.location.reload();
}

export async function signOutGoogle() {
  await signOut(firebaseAuth);
}
