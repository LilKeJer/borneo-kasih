import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as dotenv from "dotenv";
dotenv.config();

import * as authSchema from "./schema/auth";
import * as medicalSchema from "./schema/medical";
import * as pharmacySchema from "./schema/pharmacy";
import * as reservationSchema from "./schema/reservation";
import * as paymentSchema from "./schema/payment";
import * as settingsSchema from "./schema/settings";

const schema = {
  ...authSchema,
  ...medicalSchema,
  ...pharmacySchema,
  ...reservationSchema,
  ...paymentSchema,
  ...settingsSchema,
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const globalForDb = globalThis as typeof globalThis & {
  pgPool?: Pool;
};

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

export const db = drizzle(pool, { schema });
export const pgPool = pool;

export * from "./schema/auth";
export * from "./schema/medical";
export * from "./schema/pharmacy";
export * from "./schema/reservation";
export * from "./schema/payment";
export * from "./schema/settings";
