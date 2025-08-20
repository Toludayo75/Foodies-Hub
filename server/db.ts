import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in environment variables");
}

// Path to your Aiven CA certificate
const caCertPath = path.join(process.cwd(), "aiven-ca.pem"); 
let sslConfig: { ca: string } | boolean = false;

if (fs.existsSync(caCertPath)) {
  sslConfig = {
    ca: fs.readFileSync(caCertPath).toString(),
  };
  console.log("Using Aiven SSL certificate for DB connection");
} else {
  console.warn("Aiven CA certificate not found, falling back to insecure SSL");
  sslConfig = {
    rejectUnauthorized: false,
  };
}

// Setup Postgres pool with SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
});

export const db = drizzle(pool);

export async function initializeDatabase() {
  try {
    // Simple connection test
    await pool.query("SELECT 1");
    console.log("Database connection successful");

    // Add your initialization logic here (migrations, seeds, etc.)
    // Example:
    // await db.execute(sql`CREATE TABLE IF NOT EXISTS users (...)`);
  } catch (err) {
    console.error("Database initialization failed:", err);
    throw err;
  }
}
