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
  // Connection pooling for 1000+ users
  max: parseInt(process.env.DB_POOL_MAX || "20", 10),          // max connections
  min: parseInt(process.env.DB_POOL_MIN || "5", 10),           // keep 5 warm
  idleTimeoutMillis: 30000,                                     // close idle after 30s
  connectionTimeoutMillis: 5000,                                // fail if can't connect in 5s
  maxUses: 7500,                                                // recycle connection after 7500 queries
});
export const db = drizzle(pool, { schema });

export async function dbQuery(queryStr: string, params?: any[]): Promise<any[]> {
  const result = await pool.query(queryStr, params);
  return result.rows;
}
