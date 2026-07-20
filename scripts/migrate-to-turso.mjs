// One-shot migration of local SQLite data into the durable Turso/libSQL
// database. Safe to re-run (idempotent upserts).
//
// Usage:
//   1. Put TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env (repo root)
//   2. node scripts/migrate-to-turso.mjs [path-to-local-sqlite]
//      (defaults to server/database.sqlite)
//
// What it does:
//   - Runs the app's own initDb() against Turso (schema + productSeed catalog)
//   - Copies customers, product_reviews, wishlists, orders and payments from
//     the local SQLite file, preserving ids
//   - Upserts products from the local file by id (so any local edits newer
//     than productSeed.json win)

import { DatabaseSync } from 'node:sqlite';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.TURSO_DATABASE_URL) {
  console.error('TURSO_DATABASE_URL is not set. Add it (and TURSO_AUTH_TOKEN) to .env first.');
  process.exit(1);
}
process.env.JWT_SECRET = process.env.JWT_SECRET || 'migration-only-not-used';

const localPath = process.argv[2] || 'server/database.sqlite';
const local = new DatabaseSync(localPath, { readOnly: true });
const { initDb, db } = await import('../server/db.js');

console.log(`[migrate] target: ${process.env.TURSO_DATABASE_URL.replace(/\/\/.*@/, '//***@')}`);
console.log(`[migrate] source: ${localPath}`);

await initDb(); // schema + product seed on the Turso side

const norm = (v) => (typeof v === 'bigint' ? Number(v) : v);
const rowsOf = (table) => {
  try { return local.prepare(`SELECT * FROM ${table}`).all().map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, norm(v)]))); }
  catch { return []; }
};

async function upsert(table, rows, conflictKey = 'id') {
  if (rows.length === 0) { console.log(`[migrate] ${table}: nothing to copy`); return; }
  let copied = 0;
  for (const row of rows) {
    const cols = Object.keys(row);
    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
    await db.run(sql, cols.map(c => row[c]));
    copied++;
  }
  console.log(`[migrate] ${table}: ${copied} row(s) upserted (by ${conflictKey})`);
}

await upsert('products', rowsOf('products'));
await upsert('customers', rowsOf('customers'));
await upsert('product_reviews', rowsOf('product_reviews'));
await upsert('wishlists', rowsOf('wishlists'));
await upsert('orders', rowsOf('orders'));
await upsert('payments', rowsOf('payments'));

for (const t of ['products', 'customers', 'product_reviews', 'wishlists', 'orders', 'payments']) {
  const r = await db.get(`SELECT COUNT(*) AS c FROM ${t}`);
  console.log(`[verify] ${t}: ${Number(r.c)} row(s) in Turso`);
}
console.log('[migrate] done.');
