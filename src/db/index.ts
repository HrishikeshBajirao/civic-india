import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

const globalForPostgres = globalThis as typeof globalThis & {
  civicIndiaPool?: Pool;
};

const pool =
  globalForPostgres.civicIndiaPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.civicIndiaPool = pool;
}

export const db = drizzle(pool, { schema });

export async function closeDatabase() {
  await pool.end();
}
