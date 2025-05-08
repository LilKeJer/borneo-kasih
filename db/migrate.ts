// db/migrate.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

  const db = drizzle(pool);

  console.log("Running migrations...");

  await migrate(db, { migrationsFolder: "./db/migrations" });

  console.log("Migrations completed!");

  await pool.end();
}

runMigration().catch((err) => {
  console.error("Migration failed");
  console.error(err);
  process.exit(1);
});
