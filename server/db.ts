// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import fs from "fs";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Read the CA certificate
const caCertPath = path.join(process.cwd(), "ca.pem");
const caCert = fs.readFileSync(caCertPath).toString();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca: caCert, // use your downloaded CA certificate
  },
});

export const db = drizzle(pool, { schema });
