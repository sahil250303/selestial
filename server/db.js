import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
export const db = new sqlite3.Database(dbPath);

export function initDb() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      price REAL,
      category TEXT,
      gender TEXT,
      image TEXT,
      description TEXT,
      tagline TEXT,
      details TEXT,
      style_type TEXT,
      colors TEXT,
      quantity INTEGER DEFAULT 0,
      additional_images TEXT
    )`, () => {
      // Ensure quantity column exists on older db files
      db.all("PRAGMA table_info(products)", (err, rows) => {
        if (rows) {
          if (!rows.find(col => col.name === 'quantity')) db.run("ALTER TABLE products ADD COLUMN quantity INTEGER DEFAULT 0");
          if (!rows.find(col => col.name === 'tagline')) db.run("ALTER TABLE products ADD COLUMN tagline TEXT");
          if (!rows.find(col => col.name === 'details')) db.run("ALTER TABLE products ADD COLUMN details TEXT");
          if (!rows.find(col => col.name === 'style_type')) db.run("ALTER TABLE products ADD COLUMN style_type TEXT");
          if (!rows.find(col => col.name === 'colors')) db.run("ALTER TABLE products ADD COLUMN colors TEXT");
          if (!rows.find(col => col.name === 'additional_images')) db.run("ALTER TABLE products ADD COLUMN additional_images TEXT");
        }
      });
      // Ensure phone column exists on orders table
      db.all("PRAGMA table_info(orders)", (err, rows) => {
        if (rows && !rows.find(col => col.name === 'phone')) {
          db.run("ALTER TABLE orders ADD COLUMN phone TEXT");
        }
      });
    });

    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      items TEXT,
      total_amount REAL,
      status TEXT,
      date TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      amount REAL,
      method TEXT,
      status TEXT,
      date TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      phone TEXT,
      password TEXT,
      auth_provider TEXT,
      join_date TEXT
    )`, () => {
      db.all("PRAGMA table_info(customers)", (err, rows) => {
        if (rows) {
          if (!rows.find(col => col.name === 'phone')) db.run("ALTER TABLE customers ADD COLUMN phone TEXT");
          if (!rows.find(col => col.name === 'password')) db.run("ALTER TABLE customers ADD COLUMN password TEXT");
          if (!rows.find(col => col.name === 'auth_provider')) db.run("ALTER TABLE customers ADD COLUMN auth_provider TEXT");
        }
      });
    });

    db.run(`CREATE TABLE IF NOT EXISTS otp_sessions (
      phone TEXT PRIMARY KEY,
      otp TEXT,
      expires_at INTEGER
    )`);

    // Seed admin user if it doesn't exist
    db.get("SELECT id FROM admin_users WHERE username = ?", ['admin'], (err, row) => {
      if (!row) {
        const hashedPassword = bcrypt.hashSync('Admin123!', 10);
        db.run("INSERT INTO admin_users (username, password) VALUES (?, ?)", ['admin', hashedPassword]);
        console.log("Seeded default admin user: admin / Admin123!");
      }
    });

    // Seed products if empty
    db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
      if (row && row.count === 0) {
        const mockProducts = [
          { name: "Obsidian Core Ring", price: 145, category: "rings", gender: "men", image: "https://images.unsplash.com/photo-1605100804763-247f66156eb4?auto=format&fit=crop&q=80&w=400", description: "Solid sterling silver ring with obsidian inlay. Bold, geometric.", quantity: 10 },
          { name: "Celestial Chain", price: 210, category: "necklaces", gender: "men", image: "https://images.unsplash.com/photo-1599643478524-fb5244098775?auto=format&fit=crop&q=80&w=400", description: "Heavy link sterling silver chain. Premium weight and finish.", quantity: 15 },
          { name: "Lunar Drop Earrings", price: 125, category: "earrings", gender: "women", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=400", description: "Elegant silver drop earrings capturing the essence of moonlight.", quantity: 20 },
          { name: "Nova Cuff", price: 180, category: "bracelets", gender: "women", image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400", description: "Minimalist silver cuff bracelet with high-polish finish.", quantity: 8 },
          { name: "Eclipse Pendant", price: 160, category: "pendants", gender: "both", image: "https://images.unsplash.com/photo-1599459183200-59c768ecb41a?auto=format&fit=crop&q=80&w=400", description: "Abstract silver pendant on a delicate chain.", quantity: 12 },
          { name: "Stellar Set", price: 340, category: "sets", gender: "women", image: "https://images.unsplash.com/photo-1515562141207-7a8efdb280f6?auto=format&fit=crop&q=80&w=400", description: "Matching necklace and earrings set in sterling silver.", quantity: 5 }
        ];
        
        const stmt = db.prepare("INSERT INTO products (name, price, category, gender, image, description, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)");
        mockProducts.forEach(p => stmt.run(p.name, p.price, p.category, p.gender, p.image, p.description, p.quantity));
        stmt.finalize();
        console.log("Seeded initial mock products.");
      }
    });

    // The user requested no fake data for orders, payments, or customers, so they are not seeded here sync.
  });
}
