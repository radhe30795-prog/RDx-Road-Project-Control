// S3-compatible storage helpers (AWS S3 or Cloudflare R2).
// Replaces the previous Manus Forge-based implementation.
// Exported function names/signatures are unchanged so routers keep working.
//
// Required env: S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID,
// S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL (public base URL files are served from),
// S3_FORCE_PATH_STYLE (default "true"; needed for R2).

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV, isS3Configured } from "./_core/env";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!isS3Configured()) {
    throw new Error(
      "Storage not configured: set S3_ENDPOINT, S3_REGION, S3_BUCKET, " +
        "S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_PUBLIC_URL",
    );
  }
  if (!_client) {
    const s3 = ENV.s3;
    _client = new S3Client({
      endpoint: s3.endpoint,
      region: s3.region,
      forcePathStyle: s3.forcePathStyle,
      credentials: {
        accessKeyId: s3.accessKeyId,
        secretAccessKey: s3.secretAccessKey,
      },
    });
  }
  return _client;
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

function publicUrlFor(key: string): string {
  return `${ENV.s3.publicUrl}/${key}`;
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
  const client = getClient();
  const key = appendHashSuffix(normalizeKey(relKey));

  await client.send(
    new PutObjectCommand({
      Bucket: ENV.s3.bucket,
      Key: key,
      Body: toBody(data),
      ContentType: contentType,
    }),
  );

  return { key, url: publicUrlFor(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  if (!isS3Configured()) {
    throw new Error(
      "Storage not configured: set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_PUBLIC_URL",
    );
  }
  const key = normalizeKey(relKey);
  return { key, url: publicUrlFor(key) };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const client = getClient();
  const key = normalizeKey(relKey);
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: ENV.s3.bucket, Key: key }),
    { expiresIn: 3600 },
  );
}
