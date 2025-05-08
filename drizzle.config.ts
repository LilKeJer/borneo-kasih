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
    url: process.env.DATABASE_URL!,
  },
});
