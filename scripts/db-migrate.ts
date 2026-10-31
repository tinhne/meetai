// Applies drizzle/ migrations to DATABASE_URL.
//
// Databases created earlier with `drizzle-kit push` already contain the
// baseline tables, so the baseline migration is recorded as applied instead
// of being executed again.
import "dotenv/config";

import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";

const MIGRATIONS_FOLDER = "drizzle";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const db = drizzle(neon(url));

  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const applied = await db.execute(
    sql`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`,
  );
  const existingTables = await db.execute(
    sql`SELECT to_regclass('public.meetings') IS NOT NULL AS exists`,
  );

  const hasHistory = Number(applied.rows[0]?.count ?? 0) > 0;
  const hasBaselineTables = existingTables.rows[0]?.exists === true;

  if (!hasHistory && hasBaselineTables) {
    const [baseline] = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });
    await db.execute(sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${baseline.hash}, ${baseline.folderMillis})
    `);
    console.info("Existing schema detected: baseline marked as applied.");
  }

  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.info("Migrations applied.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
