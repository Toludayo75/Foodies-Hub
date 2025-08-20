import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres"; // use node-postgres version
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // bypass self-signed cert
});

export const db = drizzle(pool, { schema });
