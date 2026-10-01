/**
 * One-shot DB migration runner, bundled to dist/migrate.js.
 * Run at container start (entrypoint.sh) — drizzle tracks applied migrations
 * in the __drizzle_migrations table, so re-running is safe (idempotent).
 *
 * Env:
 *   DATABASE_URL   MySQL connection string (required)
 *   DB_SSL         "true" to use TLS (required for TiDB Cloud Serverless)
 */
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import path from "node:path";

function parseDatabaseUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, "")),
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("[migrate] DATABASE_URL not set — skipping migrations.");
    return;
  }

  const useSsl = process.env.DB_SSL === "true";
  console.log(`[migrate] connecting (ssl=${useSsl})...`);

  const connection = await mysql.createConnection({
    ...parseDatabaseUrl(databaseUrl),
    ssl: useSsl ? { rejectUnauthorized: true } : undefined,
    connectTimeout: 20000,
  });

  const db = drizzle(connection);
  const migrationsFolder = path.resolve("drizzle");
  console.log(`[migrate] applying migrations from ${migrationsFolder} ...`);
  await migrate(db, { migrationsFolder });
  await connection.end();
  console.log("[migrate] done.");
}

main().catch((err) => {
  console.error("[migrate] FAILED:", err);
  process.exit(1);
});
