import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

async function reset() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

  const db = drizzle(pool);

  try {
    // For local/dev testing only. This drops all current tables in public schema.
    await db.execute(sql`
      DO $$
      DECLARE
        record_item RECORD;
      BEGIN
        FOR record_item IN
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
        LOOP
          EXECUTE 'DROP TABLE IF EXISTS public."' || record_item.tablename || '" CASCADE';
        END LOOP;
      END
      $$;
    `);
  } finally {
    await pool.end();
  }
}

reset()
  .then(() => {
    console.log("Database reset completed.");
  })
  .catch((error) => {
    console.error("Database reset failed.");
    console.error(error);
    process.exit(1);
  });
