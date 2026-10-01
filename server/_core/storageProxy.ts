import type { Express } from "express";
import { ENV, isS3Configured } from "./env";

/**
 * Serves legacy "/manus-storage/{key}" URLs by redirecting to the
 * S3-compatible public URL. Previously this proxied through the Manus
 * Forge API; it now resolves directly against S3_ENDPOINT/S3_PUBLIC_URL.
 */
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!isS3Configured()) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const url = `${ENV.s3.publicUrl}/${key.replace(/^\/+/, "")}`;
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
