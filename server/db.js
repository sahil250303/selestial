import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const bundledDbPath = join(__dirname, 'database.sqlite');
const dbPath = process.env.SQLITE_DB_PATH || (process.env.VERCEL ? join('/tmp', 'database.sqlite') : bundledDbPath);

if (process.env.VERCEL && !fs.existsSync(dbPath) && fs.existsSync(bundledDbPath)) {
  fs.copyFileSync(bundledDbPath, dbPath);
}

const sqlite = new DatabaseSync(dbPath);

function splitArgs(args) {
  const allArgs = [...args];
  const callback = typeof allArgs.at(-1) === 'function' ? allArgs.pop() : null;
  const params = allArgs.length === 1 && Array.isArray(allArgs[0]) ? allArgs[0] : allArgs;
  return { params, callback };
}

function withCallback(callback, operation) {
  try {
    return operation();
  } catch (error) {
    if (callback) { callback(error); return undefined; }
    throw error;
  }
}

function toLastId(value) {
  return typeof value === 'bigint' ? Number(value) : value;
}

class StatementCompat {
  constructor(statement) { this.statement = statement; }

  run(...args) {
    const { params, callback } = splitArgs(args);
    return withCallback(callback, () => {
      const result = this.statement.run(...params);
      const context = { changes: result.changes, lastID: toLastId(result.lastInsertRowid) };
      if (callback) callback.call(context, null);
      return context;
    });
  }

  get(...args) {
    const { params, callback } = splitArgs(args);
    return withCallback(callback, () => {
      const row = this.statement.get(...params);
      if (callback) callback(null, row);
      return row;
    });
  }

  all(...args) {
    const { params, callback } = splitArgs(args);
    return withCallback(callback, () => {
      const rows = this.statement.all(...params);
      if (callback) callback(null, rows);
      return rows;
    });
  }

  finalize() {}
}

export const db = {
  serialize(callback) { callback(); },

  run(sql, ...args) {
    const { params, callback } = splitArgs(args);
    return withCallback(callback, () => {
      const result = sqlite.prepare(sql).run(...params);
      const context = { changes: result.changes, lastID: toLastId(result.lastInsertRowid) };
      if (callback) callback.call(context, null);
      return context;
    });
  },

  get(sql, ...args) {
    const { params, callback } = splitArgs(args);
    return withCallback(callback, () => {
      const row = sqlite.prepare(sql).get(...params);
      if (callback) callback(null, row);
      return row;
    });
  },

  all(sql, ...args) {
    const { params, callback } = splitArgs(args);
    return withCallback(callback, () => {
      const rows = sqlite.prepare(sql).all(...params);
      if (callback) callback(null, rows);
      return rows;
    });
  },

  prepare(sql) { return new StatementCompat(sqlite.prepare(sql)); }
};

export function initDb() {
  db.serialize(() => {
    // Admin users
    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )`);

    // Products
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT, price REAL, category TEXT, gender TEXT,
      image TEXT, description TEXT, tagline TEXT, details TEXT,
      style_type TEXT, colors TEXT, quantity INTEGER DEFAULT 0,
      additional_images TEXT
    )`, () => {
      db.all("PRAGMA table_info(products)", (err, rows) => {
        if (!rows) return;
        const cols = rows.map(c => c.name);
        if (!cols.includes('quantity'))          db.run("ALTER TABLE products ADD COLUMN quantity INTEGER DEFAULT 0");
        if (!cols.includes('tagline'))           db.run("ALTER TABLE products ADD COLUMN tagline TEXT");
        if (!cols.includes('details'))           db.run("ALTER TABLE products ADD COLUMN details TEXT");
        if (!cols.includes('style_type'))        db.run("ALTER TABLE products ADD COLUMN style_type TEXT");
        if (!cols.includes('colors'))            db.run("ALTER TABLE products ADD COLUMN colors TEXT");
        if (!cols.includes('additional_images')) db.run("ALTER TABLE products ADD COLUMN additional_images TEXT");
      });
      db.all("PRAGMA table_info(orders)", (err, rows) => {
        if (rows && !rows.find(c => c.name === 'phone')) db.run("ALTER TABLE orders ADD COLUMN phone TEXT");
      });
    });

    // Orders
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT, email TEXT, phone TEXT, address TEXT,
      items TEXT, total_amount REAL, status TEXT, date TEXT
    )`);

    // Payments
    db.run(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER, amount REAL, method TEXT, status TEXT, date TEXT
    )`);

    // Customers
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT, email TEXT, phone TEXT, password TEXT,
      auth_provider TEXT, join_date TEXT
    )`, () => {
      db.all("PRAGMA table_info(customers)", (err, rows) => {
        if (!rows) return;
        const cols = rows.map(c => c.name);
        if (!cols.includes('phone'))         db.run("ALTER TABLE customers ADD COLUMN phone TEXT");
        if (!cols.includes('password'))      db.run("ALTER TABLE customers ADD COLUMN password TEXT");
        if (!cols.includes('auth_provider')) db.run("ALTER TABLE customers ADD COLUMN auth_provider TEXT");
      });
    });

    // OTP sessions
    db.run(`CREATE TABLE IF NOT EXISTS otp_sessions (
      phone TEXT PRIMARY KEY, otp TEXT, expires_at INTEGER
    )`);

    // Newsletter subscribers (new)
    db.run(`CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      discount_code TEXT,
      subscribed_at TEXT
    )`);

    // Product reviews (new)
    db.run(`CREATE TABLE IF NOT EXISTS product_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      customer_name TEXT,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      date TEXT
    )`);

    // Seed / update admin user
    db.get("SELECT id FROM admin_users WHERE username = ?", ['admin'], (err, row) => {
      const configuredPassword = process.env.ADMIN_PASSWORD;
      if (configuredPassword) {
        const hashed = bcrypt.hashSync(configuredPassword, 10);
        if (row) {
          db.run("UPDATE admin_users SET password = ? WHERE username = ?", [hashed, 'admin']);
        } else {
          db.run("INSERT INTO admin_users (username, password) VALUES (?, ?)", ['admin', hashed]);
        }
        return;
      }
      if (!row) {
        const hashed = bcrypt.hashSync('Admin123!', 10);
        db.run("INSERT INTO admin_users (username, password) VALUES (?, ?)", ['admin', hashed]);
        console.log("Seeded default admin: admin / Admin123! — change via ADMIN_PASSWORD env var");
      }
    });

    // Seed products if empty
    db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
      if (!row || row.count > 0) return;
      const mockProducts = [
        { name: "Obsidian Core Ring",    price: 145, category: "rings",     gender: "men",   image: "/obsidian_ring.png",   description: "Solid 925 sterling silver ring with obsidian inlay. Bold, geometric. Material: 925 sterling silver, obsidian stone. Finish: high-polish. Care: store in provided pouch, avoid water and perfume.", quantity: 10 },
        { name: "Celestial Chain",       price: 210, category: "necklaces", gender: "men",   image: "/celestial_chain.png", description: "Heavy link 925 sterling silver chain. Premium weight and finish. Length: 20 inches. Material: 925 sterling silver. Finish: high-polish. Care: store in provided pouch, avoid chlorine and perfume.", quantity: 15 },
        { name: "Lunar Drop Earrings",   price: 125, category: "earrings",  gender: "women", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=400", description: "Elegant 925 sterling silver drop earrings capturing the essence of moonlight. Material: 925 sterling silver. Finish: satin. Care: store separately to avoid scratching.", quantity: 20 },
        { name: "Nova Cuff",             price: 180, category: "bracelets", gender: "women", image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400", description: "Minimalist 925 sterling silver cuff bracelet with high-polish finish. Internal diameter: 58mm. Material: 925 sterling silver. Finish: mirror-polish.", quantity: 8 },
        { name: "Eclipse Pendant",       price: 160, category: "pendants",  gender: "both",  image: "https://images.unsplash.com/photo-1599459183200-59c768ecb41a?auto=format&fit=crop&q=80&w=400", description: "Abstract 925 sterling silver pendant on a delicate 18-inch chain. Material: 925 sterling silver. Finish: oxidised. Care: polish with provided cloth to restore shine.", quantity: 12 },
        { name: "Stellar Set",           price: 340, category: "sets",      gender: "women", image: "https://images.unsplash.com/photo-1515562141207-7a8efdb280f6?auto=format&fit=crop&q=80&w=400", description: "Matching necklace and stud earrings set in 925 sterling silver. Includes: 18-inch necklace, pair of studs, gift box, polishing pouch. Material: 925 sterling silver.", quantity: 5 },
      ];
      const stmt = db.prepare("INSERT INTO products (name, price, category, gender, image, description, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)");
      mockProducts.forEach(p => stmt.run(p.name, p.price, p.category, p.gender, p.image, p.description, p.quantity));
      stmt.finalize();
      console.log("Seeded 6 initial products.");
    });
  });
}
