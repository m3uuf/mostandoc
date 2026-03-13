import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pooling — conservative defaults for cluster mode
  // Each worker gets its own pool, so total = workers × max
  max: parseInt(process.env.DB_POOL_MAX || "10", 10),          // max connections per worker
  min: parseInt(process.env.DB_POOL_MIN || "2", 10),           // keep 2 warm per worker
  idleTimeoutMillis: 30000,                                     // close idle after 30s
  connectionTimeoutMillis: 10000,                               // fail if can't connect in 10s
  maxUses: 7500,                                                // recycle connection after 7500 queries
});
export const db = drizzle(pool, { schema });

export async function dbQuery(queryStr: string, params?: any[]): Promise<any[]> {
  const result = await pool.query(queryStr, params);
  return result.rows;
}
