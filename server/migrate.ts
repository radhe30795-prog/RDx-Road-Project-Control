/**
 * Robust one-shot DB migration runner, bundled to dist/migrate.js.
 * Run at container start (entrypoint.sh).
 *
 * Why this exists (replaces drizzle-orm's migrate()):
 *  1. drizzle splits a migration file into statements ONLY on
 *     "--> statement-breakpoint". Hand-written files without that marker
 *     (e.g. two CREATE TABLEs in one file) were sent to MySQL as ONE
 *     multi-statement string, which mysql2 rejects without
 *     multipleStatements:true -> every such migration failed, forever.
 *  2. drizzle decides what to run by comparing journal `when` timestamps
 *     against the last applied row. A hand-edited journal entry with an
 *     older `when` (0027) was therefore SILENTLY SKIPPED on every boot.
 *  3. drizzle ran all pending migrations in ONE transaction: a single
 *     failing migration rolled back everything after it, and entrypoint.sh
 *     swallowed the error, so nobody ever noticed.
 *
 * This runner instead:
 *  - tracks applied migrations by sha256(content) hash, never by `when`,
 *    so journal timestamp mistakes can never silently skip a migration;
 *  - enables multipleStatements on its own connection (migrations are
 *    trusted local files, not user input);
 *  - runs each migration in its own transaction; a failure rolls back only
 *    that migration, is logged LOUDLY, and the runner CONTINUES with the
 *    next migration instead of blocking everything behind it;
 *  - treats idempotent "already applied" errors (duplicate column/table/
 *    key/entry) as success, so re-runs and partial applications self-heal;
 *  - records every attempt in __drizzle_migration_runs for later debugging.
 *
 * Env:
 *   DATABASE_URL   MySQL connection string (required)
 *   DB_SSL         "true" to use TLS (required for TiDB Cloud Serverless)
 */
import mysql from "mysql2/promise";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const MIGRATIONS_TABLE = "__drizzle_migrations";
const RUNS_TABLE = "__drizzle_migration_runs";

/** MySQL error codes that mean "this statement already had its effect". */
const IDEMPOTENT_CODES = new Set([
  "ER_TABLE_EXISTS_ERROR", // 1050 CREATE TABLE on existing table
  "ER_DUP_FIELDNAME", // 1060 ADD COLUMN on existing column
  "ER_DUP_KEYNAME", // 1061 ADD INDEX on existing index
  "ER_DUP_ENTRY", // 1062 INSERT of an existing seed row
  "ER_CANT_DROP_FIELD_OR_KEY", // 1091 DROP of non-existent column/key
]);

interface JournalEntry {
  tag: string;
  when: number;
}

interface MigrationFile {
  tag: string;
  when: number;
  statements: string[];
  hash: string;
}

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

function readMigrationFiles(migrationsFolder: string): MigrationFile[] {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  if (!fs.existsSync(journalPath)) {
    throw new Error(`[migrate] Can't find meta/_journal.json in ${migrationsFolder}`);
  }
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries: JournalEntry[];
  };
  return journal.entries.map((entry) => {
    const filePath = path.join(migrationsFolder, `${entry.tag}.sql`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`[migrate] No file ${entry.tag}.sql found in ${migrationsFolder}`);
    }
    const content = fs.readFileSync(filePath, "utf8");
    // Same split rule as drizzle-orm's readMigrationFiles, plus a fallback:
    // chunks without a breakpoint marker are split on semicolons so that
    // hand-written multi-statement files work even without the marker.
    // (The connection also uses multipleStatements:true as a second safety net.)
    const cleaned = content
      .split("--> statement-breakpoint")
      .flatMap((chunk) => chunk.split(";"))
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      // drop chunks that are only SQL comments
      .filter((s) => s.split("\n").some((line) => {
        const t = line.trim();
        return t.length > 0 && !t.startsWith("--");
      }));
    return {
      tag: entry.tag,
      when: entry.when,
      statements: cleaned,
      hash: crypto.createHash("sha256").update(content).digest("hex"),
    };
  });
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
    // Migrations are trusted local files, never user input.
    multipleStatements: true,
  });

  const migrationsFolder = path.resolve("drizzle");
  console.log(`[migrate] applying migrations from ${migrationsFolder} ...`);

  // Book-keeping tables (same shape drizzle used, plus our run log).
  await connection.execute(
    `CREATE TABLE IF NOT EXISTS \`${MIGRATIONS_TABLE}\` (\`id\` serial primary key, \`hash\` text not null, \`created_at\` bigint)`,
  );
  await connection.execute(
    `CREATE TABLE IF NOT EXISTS \`${RUNS_TABLE}\` (\`id\` serial primary key, \`tag\` varchar(255) not null, \`status\` varchar(20) not null, \`error\` text null, \`ran_at\` bigint not null)`,
  );

  const [hashRows] = await connection.query(
    `SELECT \`hash\` FROM \`${MIGRATIONS_TABLE}\``,
  );
  const applied = new Set(
    (hashRows as Array<{ hash: string }>).map((r) => String(r.hash)),
  );

  const migrations = readMigrationFiles(migrationsFolder);
  let appliedCount = 0;
  let skippedCount = 0;
  const failed: Array<{ tag: string; error: string }> = [];

  for (const migration of migrations) {
    if (applied.has(migration.hash)) {
      skippedCount++;
      continue;
    }

    console.log(`[migrate] applying ${migration.tag} ...`);
    const now = Date.now();
    try {
      await connection.beginTransaction();
      try {
        for (const stmt of migration.statements) {
          try {
            await connection.query(stmt);
          } catch (stmtErr: any) {
            const code = String(stmtErr?.code ?? "");
            if (IDEMPOTENT_CODES.has(code)) {
              console.log(
                `[migrate]   ${migration.tag}: already applied (${code}), skipping statement.`,
              );
              continue;
            }
            throw stmtErr;
          }
        }
        await connection.query(
          `INSERT INTO \`${MIGRATIONS_TABLE}\` (\`hash\`, \`created_at\`) VALUES (?, ?)`,
          [migration.hash, migration.when],
        );
        await connection.commit();
      } catch (inner) {
        try {
          await connection.rollback();
        } catch {
          /* best effort */
        }
        throw inner;
      }
      await connection.query(
        `INSERT INTO \`${RUNS_TABLE}\` (\`tag\`, \`status\`, \`error\`, \`ran_at\`) VALUES (?, 'applied', NULL, ?)`,
        [migration.tag, now],
      );
      applied.add(migration.hash);
      appliedCount++;
      console.log(`[migrate]   ${migration.tag}: OK`);
    } catch (err: any) {
      const message = String(err?.message ?? err);
      failed.push({ tag: migration.tag, error: message });
      try {
        await connection.query(
          `INSERT INTO \`${RUNS_TABLE}\` (\`tag\`, \`status\`, \`error\`, \`ran_at\`) VALUES (?, 'failed', ?, ?)`,
          [migration.tag, message.slice(0, 2000), now],
        );
      } catch {
        /* run-log is best effort */
      }
      console.error(`[migrate] !!! ${migration.tag} FAILED: ${message}`);
      console.error(`[migrate] !!! continuing with remaining migrations.`);
    }
  }

  await connection.end();

  console.log(
    `[migrate] done. applied=${appliedCount} already-applied=${skippedCount} failed=${failed.length}`,
  );
  if (failed.length > 0) {
    console.error(`[migrate] ===== FAILED MIGRATIONS (need attention) =====`);
    for (const f of failed) console.error(`[migrate] ===== ${f.tag}: ${f.error}`);
    console.error(`[migrate] =============================================`);
    // Do NOT exit(1): the server must still start; failures are loud in logs
    // and recorded in __drizzle_migration_runs. entrypoint.sh already starts
    // the server when this script exits 0.
  }
}

main().catch((err) => {
  console.error("[migrate] FATAL:", err);
  process.exit(1);
});
