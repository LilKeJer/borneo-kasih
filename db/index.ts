// db/index.ts
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
dotenv.config();

// Import all schema tables
import * as authSchema from "./schema/auth";
import * as medicalSchema from "./schema/medical";
import * as pharmacySchema from "./schema/pharmacy";
import * as reservationSchema from "./schema/reservation";
import * as paymentSchema from "./schema/payment";

// Combine schemas
const schema = {
  ...authSchema,
  ...medicalSchema,
  ...pharmacySchema,
  ...reservationSchema,
  ...paymentSchema,
};

// Konfigurasi untuk Vercel serverless
neonConfig.fetchConnectionCache = true;

// URL koneksi dari env
const sql = neon(process.env.DATABASE_URL!);

// Buat instance drizzle with schema
export const db = drizzle(sql, { schema });

// Re-export schemas for convenience
export * from "./schema/auth";
export * from "./schema/medical";
export * from "./schema/pharmacy";
export * from "./schema/reservation";
export * from "./schema/payment";
