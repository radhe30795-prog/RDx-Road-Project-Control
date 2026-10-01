import type { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { createRemoteJWKSet, SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";

// Firebase publishes two key endpoints: an x509 certificate map and a JWKS document.
// jose/createRemoteJWKSet requires the latter; using the x509 URL causes
// "JSON Web Key Set malformed" during an otherwise valid Google sign-in.
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

function sessionSecret() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createAppSessionToken(openId: string, name: string | null) {
  return new SignJWT({ openId, name: name || "" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(openId)
    .setIssuer("rdx-road-project-control")
    .setAudience("rdx-road-project-control")
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(sessionSecret());
}

export async function verifyAppSession(token: string | undefined | null) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), {
      algorithms: ["HS256"],
      issuer: "rdx-road-project-control",
      audience: "rdx-road-project-control",
    });
    const openId = typeof payload.openId === "string" ? payload.openId : payload.sub;
    return openId ? { openId } : null;
  } catch {
    return null;
  }
}

export async function authenticateGoogleRequest(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const token = cookies[COOKIE_NAME];
  const session = await verifyAppSession(token);
  if (!session) return null;
  return db.getUserByOpenId(session.openId);
}

async function verifyFirebaseIdToken(idToken: string) {
  if (!ENV.firebaseProjectId) throw new Error("Firebase project configuration is missing");
  if (idToken.split(".").length !== 3) {
    throw new Error("Firebase ID token format is invalid. Please retry Google sign-in.");
  }

  const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
    algorithms: ["RS256"],
    issuer: `https://securetoken.google.com/${ENV.firebaseProjectId}`,
    audience: ENV.firebaseProjectId,
  });

  const openId = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  const name = typeof payload.name === "string" ? payload.name : email.split("@")[0];
  const emailVerified = payload.email_verified === true;

  if (!openId || !email || !emailVerified) {
    throw new Error("A verified Google email is required");
  }

  return { openId: `firebase:${openId}`, name, email };
}

export function registerGoogleAuthRoutes(app: Express) {
  app.post("/api/auth/firebase/session", async (req: Request, res: Response) => {
    try {
      const idToken = typeof req.body?.idToken === "string" ? req.body.idToken : "";
      if (!idToken) {
        res.status(400).send("Firebase ID token is required.");
        return;
      }

      const profile = await verifyFirebaseIdToken(idToken);
      const user = await db.upsertGoogleUser({
        openId: profile.openId,
        name: profile.name,
        email: profile.email,
        isInitialAdmin: Boolean(ENV.googleAdminEmail && profile.email === ENV.googleAdminEmail),
      });

      if (!user) {
        res.status(500).send("Could not create your ERP account.");
        return;
      }

      const sessionToken = await createAppSessionToken(user.openId, user.name);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("[Firebase Auth] Session creation failed", error);
      res.status(401).send(error instanceof Error ? error.message : "Google login failed.");
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 });
    res.json({ success: true });
  });
}
