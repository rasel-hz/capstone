// Backs up the app's public tables before a migration: every row as JSON, a restore script, and the schema
// (functions, policies, constraints, permissions). The auth schema is Supabase's and is not copied: it holds
// password hashes, and no migration here changes it. Writes to the folder given, which must be outside the repo.
//   node scripts/db-backup.ts <folder>
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import postgres from 'postgres';

if (existsSync('.env')) process.loadEnvFile('.env');
const url = process.env.DATABASE_URL || process.env.DataBase_URL;
const out = process.argv[2];
if (!url || !out) {
  console.error('Usage: node scripts/db-backup.ts <folder outside the repo>  (needs DATABASE_URL in .env)');
  process.exit(1);
}
if (resolve(out).startsWith(resolve('.'))) {
  console.error('Choose a folder outside the repository, so user data is never committed.');
  process.exit(1);
}

// Restore order respects foreign keys. Identity columns need OVERRIDING SYSTEM VALUE.
export const TABLES = ['rewards', 'profiles', 'challenge_attempts', 'point_transactions', 'user_reward_unlocks', 'reward_redemptions'];
const IDENTITY = new Set(['point_transactions']);

const sql = postgres(url, { ssl: 'require', max: 1, onnotice: () => {} });
mkdirSync(out, { recursive: true });
const manifest: Record<string, unknown> = { taken_at: new Date().toISOString(), tables: {} as Record<string, unknown> };
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
let restore = '-- Restores the backed-up rows. Existing rows are kept (ON CONFLICT DO NOTHING).\nbegin;\n';
try {
  await sql.begin('isolation level repeatable read read only', async (tx) => {
    for (const t of TABLES) {
      if (!(await tx`select to_regclass(${'public.' + t}) r`)[0].r) continue;
      const rows = await tx.unsafe(`select coalesce(json_agg(x), '[]'::json) j from public.${t} x`);
      const json = JSON.stringify(rows[0].j);
      // A fingerprint of the table's exact contents, to compare after a restore.
      const fp = (await tx.unsafe(`select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) h, count(*)::int n from public.${t} x`))[0];
      writeFileSync(join(out, `${t}.json`), json);
      (manifest.tables as Record<string, unknown>)[t] = { rows: fp.n, content_md5: fp.h, file_sha256: sha(json) };
      const lit = `$kwbk$${json}$kwbk$`;
      restore += `insert into public.${t} ${IDENTITY.has(t) ? 'overriding system value ' : ''}select * from json_populate_recordset(null::public.${t}, ${lit}::json) on conflict do nothing;\n`;
    }
    const fns = await tx`select p.proname, pg_get_functiondef(p.oid) def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' order by 1`;
    const pols = await tx`select tablename, policyname, cmd, roles::text, qual, with_check from pg_policies where schemaname = 'public' order by 1, 2`;
    const cons = await tx`select conrelid::regclass::text tbl, conname, pg_get_constraintdef(oid) def from pg_constraint where connamespace = 'public'::regnamespace order by 1, 2`;
    const grants = await tx`select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon', 'authenticated') order by 1, 2, 3`;
    const cols = await tx`select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position`;
    const schema = JSON.stringify({ functions: fns, policies: pols, constraints: cons, grants, columns: cols }, null, 2);
    writeFileSync(join(out, 'schema.json'), schema);
    manifest.schema_sha256 = sha(schema);
  });
  restore += 'commit;\n';
  writeFileSync(join(out, 'restore-data.sql'), restore);
  manifest.restore_sha256 = sha(restore);
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
} finally {
  await sql.end();
}
