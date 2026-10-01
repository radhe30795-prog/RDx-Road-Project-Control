// File storage with a pluggable backend.
//   STORAGE_BACKEND=firebase (default): Firebase Cloud Storage via a service
//     account (free 5 GB on the Spark plan, no card needed).
//   STORAGE_BACKEND=s3: S3-compatible (AWS S3 / Cloudflare R2) via S3_* vars.
// Exported function names/signatures are unchanged so routers keep working.
//
// Firebase setup (free, no card): Firebase console -> Project settings ->
// Service accounts -> Generate new private key, then set
// FIREBASE_SERVICE_ACCOUNT_JSON to the downloaded JSON (raw or base64) and
// VITE_FIREBASE_STORAGE_BUCKET to the bucket name.

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Storage } from "@google-cloud/storage";
import {
  ENV,
  getFirebaseServiceAccount,
  isS3Configured,
  isStorageConfigured,
  storagePublicUrlFor,
} from "./_core/env";

let _s3: S3Client | null = null;
let _gcs: Storage | null = null;

function getS3Client(): S3Client {
  if (!isS3Configured()) {
    throw new Error(
      "Storage not configured: set STORAGE_BACKEND=s3 with S3_ENDPOINT, " +
        "S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_PUBLIC_URL",
    );
  }
  if (!_s3) {
    const s3 = ENV.s3;
    _s3 = new S3Client({
      endpoint: s3.endpoint,
      region: s3.region,
      forcePathStyle: s3.forcePathStyle,
      credentials: {
        accessKeyId: s3.accessKeyId,
        secretAccessKey: s3.secretAccessKey,
      },
    });
  }
  return _s3;
}

function getGcsBucket() {
  const sa = getFirebaseServiceAccount();
  const bucketName = ENV.firebaseStorage.bucket;
  if (!sa || !bucketName) {
    throw new Error(
      "Storage not configured: set STORAGE_BACKEND=firebase with " +
        "VITE_FIREBASE_STORAGE_BUCKET and FIREBASE_SERVICE_ACCOUNT_JSON " +
        "(Firebase console -> Project settings -> Service accounts -> " +
        "Generate new private key)",
    );
  }
  if (!_gcs) {
    _gcs = new Storage({
      projectId: sa.project_id,
      credentials: {
        client_email: sa.client_email,
        private_key: sa.private_key,
      },
    });
  }
  return _gcs.bucket(bucketName);
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function toBody(data: Buffer | Uint8Array | string): Buffer {
  if (typeof data === "string") return Buffer.from(data, "utf-8");
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));

  if (ENV.storageBackend === "s3") {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: ENV.s3.bucket,
        Key: key,
        Body: toBody(data),
        ContentType: contentType,
      }),
    );
  } else {
    const bucket = getGcsBucket();
    await bucket.file(key).save(toBody(data), {
      contentType,
      public: true,
      resumable: false,
    });
  }

  return { key, url: storagePublicUrlFor(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  if (!isStorageConfigured()) {
    throw new Error(
      "Storage not configured: set STORAGE_BACKEND=firebase with " +
        "VITE_FIREBASE_STORAGE_BUCKET and FIREBASE_SERVICE_ACCOUNT_JSON, " +
        "or STORAGE_BACKEND=s3 with the S3_* variables",
    );
  }
  const key = normalizeKey(relKey);
  return { key, url: storagePublicUrlFor(key) };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  if (ENV.storageBackend === "s3") {
    const client = getS3Client();
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: ENV.s3.bucket, Key: key }),
      { expiresIn: 3600 },
    );
  }
  const bucket = getGcsBucket();
  const [url] = await bucket.file(key).getSignedUrl({
    action: "read",
    expires: Date.now() + 3600_000,
  });
  return url;
}
