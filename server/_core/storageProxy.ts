import type { Express } from "express";
import { isStorageConfigured, storagePublicUrlFor } from "./env";

/**
 * Serves legacy "/manus-storage/{key}" URLs by redirecting to the public URL
 * of the configured storage backend (Firebase Cloud Storage or S3/R2).
 * Previously this proxied through the Manus Forge API.
 */
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!isStorageConfigured()) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const url = storagePublicUrlFor(key);
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
