export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleAdminEmail: (process.env.GOOGLE_ADMIN_EMAIL ?? "").trim().toLowerCase(),
  firebaseProjectId: process.env.VITE_FIREBASE_PROJECT_ID ?? "",
  appBaseUrl: (process.env.APP_BASE_URL ?? "").replace(/\/$/, ""),
  isProduction: process.env.NODE_ENV === "production",
  // Legacy Manus-only vars. Nothing on the production server path reads
  // these anymore (storage now uses S3_* below); kept so unused _core
  // modules (llm, imageGeneration, notification, ...) still type-check.
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // File storage backend: "firebase" (default) = Firebase Cloud Storage
  // (free 5 GB on the Spark plan, no card needed) via a service account;
  // "s3" = S3-compatible (AWS S3 / Cloudflare R2) via the S3_* vars below.
  storageBackend: (process.env.STORAGE_BACKEND ?? "firebase").toLowerCase(),
  firebaseStorage: {
    // Already part of the Firebase web config, e.g.
    // rdx-project-control-79c39.firebasestorage.app
    bucket: process.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
    // Service-account JSON (raw or base64) with Storage Admin on the bucket.
    // Generate free (no card): Firebase console -> Project settings ->
    // Service accounts -> Generate new private key.
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "",
  },
  // S3-compatible object storage (AWS S3 or Cloudflare R2) for uploads.
  // Used only when STORAGE_BACKEND=s3.
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? "",
    region: process.env.S3_REGION ?? "auto",
    bucket: process.env.S3_BUCKET ?? "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    publicUrl: (process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, ""),
    // R2 and most S3-compatible providers need path-style requests.
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") !== "false",
  },
};

export function isS3Configured(): boolean {
  const s3 = ENV.s3;
  return Boolean(
    s3.endpoint && s3.bucket && s3.accessKeyId && s3.secretAccessKey && s3.publicUrl,
  );
}

export interface FirebaseServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

/** Parse FIREBASE_SERVICE_ACCOUNT_JSON (raw JSON or base64). Null if missing/invalid. */
export function getFirebaseServiceAccount(): FirebaseServiceAccount | null {
  const raw = (ENV.firebaseStorage.serviceAccountJson ?? "").trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf-8");
    const parsed = JSON.parse(json) as Partial<FirebaseServiceAccount>;
    if (parsed && parsed.client_email && parsed.private_key) {
      return parsed as FirebaseServiceAccount;
    }
    return null;
  } catch {
    return null;
  }
}

export function isFirebaseStorageConfigured(): boolean {
  return Boolean(ENV.firebaseStorage.bucket && getFirebaseServiceAccount());
}

/** True when the selected STORAGE_BACKEND has everything it needs. */
export function isStorageConfigured(): boolean {
  return ENV.storageBackend === "s3"
    ? isS3Configured()
    : isFirebaseStorageConfigured();
}

/** Public URL for a stored object key on the selected backend. */
export function storagePublicUrlFor(key: string): string {
  const k = key.replace(/^\/+/, "");
  if (ENV.storageBackend === "s3") {
    return `${ENV.s3.publicUrl}/${k}`;
  }
  return `https://storage.googleapis.com/${ENV.firebaseStorage.bucket}/${encodeURI(k)}`;
}
