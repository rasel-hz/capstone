// Applies the SQL files in supabase/migrations in name order. Each file runs in its own transaction
// and is written to be safe to run again. Needs DATABASE_URL (the Supabase Postgres connection string) in .env.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

if (existsSync('.env')) process.loadEnvFile('.env');
const url = process.env.DATABASE_URL || process.env.DataBase_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Add the Supabase Postgres connection string to .env.');
  process.exit(1);
}

const dir = join('supabase', 'migrations');
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const sql = postgres(url, { ssl: 'require', max: 1, onnotice: () => {} });
try {
  for (const f of files) {
    await sql.begin((tx) => tx.unsafe(readFileSync(join(dir, f), 'utf8')));
    console.log(`applied ${f}`);
  }
} catch (e) {
  // The connection string is never printed.
  console.error(`Migration failed: ${(e as Error).message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
