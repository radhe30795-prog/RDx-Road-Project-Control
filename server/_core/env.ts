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
  // S3-compatible object storage (AWS S3 or Cloudflare R2) for uploads.
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
