// ── Database layer ───────────────────────────────────────────────────────────
// Durable in production, zero-config locally.
//
//   • If TURSO_DATABASE_URL is set  → use libSQL (Turso). This is REQUIRED on
//     serverless (Vercel) because the bundled SQLite file lives in an ephemeral
//     /tmp and is wiped on every cold start, silently losing customers, orders,
//     inventory changes, reviews and OTP sessions.
//   • Otherwise                     → fall back to Node's built-in node:sqlite
//     (great for local dev and tests).
//
// Both backends are exposed through ONE async API (`db.get/all/run`). For
// backwards compatibility the methods ALSO accept a trailing Node-style
// callback `(err, row)` — existing callback-based handlers keep working while
// new code can simply `await db.get(...)`.

import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const norm = (v) => (typeof v === 'bigint' ? Number(v) : v);
const useTurso = !!process.env.TURSO_DATABASE_URL;

// ── Backend selection ─────────────────────────────────────────────────────────
let backend;

if (useTurso) {
  // Lazy import so local/dev installs without the package still work.
  const { createClient } = await import('@libsql/client');
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  backend = {
    async get(sql, params = []) { const r = await client.execute({ sql, args: params }); return r.rows[0]; },
    async all(sql, params = []) { const r = await client.execute({ sql, args: params }); return r.rows; },
    async run(sql, params = []) {
      const r = await client.execute({ sql, args: params });
      return { changes: Number(r.rowsAffected || 0), lastID: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : undefined };
    },
    async exec(sql) { await client.executeMultiple(sql); },
  };
  console.log('[db] Using libSQL/Turso (durable).');
} else {
  const bundledDbPath = join(__dirname, 'database.sqlite');
  const dbPath = process.env.SQLITE_DB_PATH || (process.env.VERCEL ? join('/tmp', 'database.sqlite') : bundledDbPath);
  if (process.env.VERCEL && !fs.existsSync(dbPath) && fs.existsSync(bundledDbPath)) {
    fs.copyFileSync(bundledDbPath, dbPath);
  }
  const sqlite = new DatabaseSync(dbPath);
  backend = {
    async get(sql, params = []) { return sqlite.prepare(sql).get(...params); },
    async all(sql, params = []) { return sqlite.prepare(sql).all(...params); },
    async run(sql, params = []) { const r = sqlite.prepare(sql).run(...params); return { changes: r.changes, lastID: norm(r.lastInsertRowid) }; },
    async exec(sql) { sqlite.exec(sql); },
  };
  if (process.env.VERCEL) {
    console.warn('[db] WARNING: node:sqlite on serverless is EPHEMERAL. Set TURSO_DATABASE_URL for durable storage.');
  }
}

// ── Unified async API (with optional callback compatibility) ───────────────────
function splitArgs(args) {
  let params = args;
  let callback = null;
  if (typeof params[params.length - 1] === 'function') {
    callback = params[params.length - 1];
    params = params.slice(0, -1);
  }
  if (params.length === 1 && Array.isArray(params[0])) params = params[0];
  return { params, callback };
}

function method(kind) {
  return (sql, ...args) => {
    const { params, callback } = splitArgs(args);
    const promise = backend[kind](sql, params);
    if (!callback) return promise;
    promise.then(
      (value) => { if (kind === 'run') callback.call({ changes: value.changes, lastID: value.lastID }, null); else callback(null, value); },
      (err) => callback(err)
    );
    return undefined;
  };
}

export const db = {
  get: method('get'),
  all: method('all'),
  run: method('run'),
  exec: (sql) => backend.exec(sql),
  prepare(sql) {
    return {
      run: (...a) => method('run')(sql, ...a),
      get: (...a) => method('get')(sql, ...a),
      all: (...a) => method('all')(sql, ...a),
      finalize() {},
    };
  },
};

// ── Schema bootstrap ───────────────────────────────────────────────────────────
export async function initDb() {
  await db.run(`CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, price REAL, category TEXT, gender TEXT,
    image TEXT, description TEXT, tagline TEXT, details TEXT,
    style_type TEXT, colors TEXT, quantity INTEGER DEFAULT 0,
    additional_images TEXT, featured INTEGER DEFAULT 0
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT, email TEXT, phone TEXT, address TEXT,
    items TEXT, total_amount REAL, status TEXT, date TEXT
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER, amount REAL, method TEXT, status TEXT, date TEXT
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, email TEXT, phone TEXT, password TEXT,
    auth_provider TEXT, join_date TEXT, address TEXT
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS otp_sessions (
    phone TEXT PRIMARY KEY, otp TEXT, expires_at INTEGER
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL, discount_code TEXT, subscribed_at TEXT
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS product_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL, customer_name TEXT,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5), comment TEXT, date TEXT
  )`);

  // Lightweight, idempotent column migrations for pre-existing databases.
  await ensureColumns('products', {
    quantity: 'INTEGER DEFAULT 0', tagline: 'TEXT', details: 'TEXT',
    style_type: 'TEXT', colors: 'TEXT', additional_images: 'TEXT', featured: 'INTEGER DEFAULT 0',
  });
  await ensureColumns('customers', { phone: 'TEXT', password: 'TEXT', auth_provider: 'TEXT', address: 'TEXT' });
  await ensureColumns('orders', { phone: 'TEXT' });

  await seedAdmin();
  await seedProducts();
}

async function ensureColumns(table, columns) {
  let info = [];
  try { info = await db.all(`PRAGMA table_info(${table})`); } catch { info = []; }
  const existing = new Set((info || []).map((c) => c.name));
  for (const [name, type] of Object.entries(columns)) {
    if (!existing.has(name)) {
      try { await db.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`); } catch { /* concurrent boot */ }
    }
  }
}

async function seedAdmin() {
  // SECURITY: never ship a hardcoded default password. Require ADMIN_PASSWORD.
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) {
    // Secure-by-default: never seed a known fallback password. Admin login is
    // simply disabled until ADMIN_PASSWORD is set (storefront stays up).
    console.warn('[db] ADMIN_PASSWORD not set — admin login is DISABLED until you set it (no default password is seeded).');
    return;
  }
  const hashed = bcrypt.hashSync(configuredPassword, 10);
  const row = await db.get('SELECT id FROM admin_users WHERE username = ?', ['admin']);
  if (row) await db.run('UPDATE admin_users SET password = ? WHERE username = ?', [hashed, 'admin']);
  else await db.run('INSERT INTO admin_users (username, password) VALUES (?, ?)', ['admin', hashed]);
}

async function seedProducts() {
  const row = await db.get('SELECT COUNT(*) AS count FROM products');
  const count = row ? Number(row.count) : 0;
  if (count > 0) return;
  const demo = [
    { name: 'Obsidian Core Ring', price: 145, category: 'rings', gender: 'men', image: '/obsidian_ring.png', description: 'Solid 925 sterling silver ring with obsidian inlay. Bold, geometric.', quantity: 10, featured: 1 },
    { name: 'Celestial Chain', price: 210, category: 'necklaces', gender: 'men', image: '/celestial_chain.png', description: 'Heavy link 925 sterling silver chain. Premium weight and finish.', quantity: 15, featured: 1 },
  ];
  for (const p of demo) {
    await db.run(
      'INSERT INTO products (name, price, category, gender, image, description, quantity, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [p.name, p.price, p.category, p.gender, p.image, p.description, p.quantity, p.featured]
    );
  }
  console.log('[db] Seeded demo products.');
}
