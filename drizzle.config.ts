import * as dotenv from "dotenv";
dotenv.config();

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema/*",
  out: "./db/migrations",
  dialect: "postgresql",
  entities: {
    roles: {
      provider: "neon",
    },
  },
  dbCredentials: {
    // Pastikan environment variable ini ada di .env Anda
    host: process.env.DB_HOST!, // Ambil dari env
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    ssl: process.env.DB_SSL === "true",
  },
});
