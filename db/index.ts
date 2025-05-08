// db/index.ts
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// Konfigurasi untuk Vercel serverless
neonConfig.fetchConnectionCache = true;

// URL koneksi dari env
const sql = neon(process.env.DATABASE_URL!);

// Buat instance drizzle

export const db = drizzle(sql);

// Export untuk migrasi CLI
export * from "./schema";
