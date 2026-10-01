import { signInWithGoogle } from "./lib/firebase";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Start the free Firebase Spark Google Sign-In popup flow. */
export const startLogin = () => {
  void signInWithGoogle().catch((error: unknown) => {
    console.error("[Firebase Auth] Login failed", error);
    window.alert(error instanceof Error ? error.message : "Google login failed. Please try again.");
  });
};
