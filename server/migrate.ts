import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./db";

/**
 * Applies pending SQL migrations from ./migrations (generated with `drizzle-kit generate`).
 * Runs as a separate release step before the server starts (see railway.json) and via `npm run db:migrate`.
 * Safe to re-run: applied migrations are tracked in the `__drizzle_migrations` table.
 */
async function run() {
  const started = Date.now();
  console.log("[migrate] applying pending migrations...");
  await migrate(db, { migrationsFolder: "./migrations" });
  console.log(`[migrate] done in ${Date.now() - started}ms`);
}

run()
  .catch((error) => {
    console.error("[migrate] failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
