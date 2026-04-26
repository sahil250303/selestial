import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { initDb, db } from './db.js';
import { loginAdmin, verifyToken, loginCustomer, signupCustomer, sendOtp, verifyOtp } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + extname(file.originalname));
  }
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Serve uploaded images statically
app.use('/api/uploads', express.static(uploadDir));

// Initialize database
initDb();

// Admin Login Route
app.post('/api/auth/login', loginAdmin);

// Customer Auth Routes
app.post('/api/auth/customer/signup', signupCustomer);
app.post('/api/auth/customer/login', loginCustomer);
app.post('/api/auth/customer/send-otp', sendOtp);
app.post('/api/auth/customer/verify-otp', verifyOtp);

// Public Products Route
app.get('/api/products', (req, res) => {
  db.all("SELECT * FROM products", (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json(row);
  });
});

// Public Checkout Route
app.post('/api/checkout', (req, res) => {
  const { firstName, lastName, email, phone, address, cartItems, totalAmount, paymentMethod } = req.body;
  const customerName = `${firstName} ${lastName}`;
  const date = new Date().toISOString().split('T')[0];
  const itemsStr = JSON.stringify(cartItems || []);

  const performOrderAndPayment = () => {
    const stmtOrder = db.prepare("INSERT INTO orders (customer_name, email, phone, address, items, total_amount, status, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    stmtOrder.run(customerName, email, phone, address, itemsStr, totalAmount, "Processing", date, function (err) {
      if (err) {
        stmtOrder.finalize();
        return res.status(500).json({ error: 'Database error creating order' });
      }
      const orderId = this.lastID;
      stmtOrder.finalize();

      const stmtPayment = db.prepare("INSERT INTO payments (order_id, amount, method, status, date) VALUES (?, ?, ?, ?, ?)");
      stmtPayment.run(orderId, totalAmount, paymentMethod || "Credit Card", "Completed", date, function (err) {
        stmtPayment.finalize();
        if (err) return res.status(500).json({ error: 'Database error creating payment' });
        res.status(201).json({ message: "Order processed successfully" });
      });
    });
  };

  db.get("SELECT id FROM customers WHERE email = ?", [email], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error checking customer' });
    
    if (!row) {
      const stmtCustomer = db.prepare("INSERT INTO customers (name, email, phone, auth_provider, join_date) VALUES (?, ?, ?, ?, ?)");
      stmtCustomer.run(customerName, email, phone, 'guest', date, function (err) {
        stmtCustomer.finalize();
        if (err) return res.status(500).json({ error: 'Database error creating customer' });
        performOrderAndPayment();
      });
    } else {
      performOrderAndPayment();
    }
  });
});

// Protected Admin Routes
app.post('/api/upload', verifyToken, upload.array('images', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  const urls = req.files.map(file => `/api/uploads/${file.filename}`);
  res.json({ urls });
});

app.post('/api/products', verifyToken, (req, res) => {
  const { name, price, category, gender, image, description, tagline, details, style_type, colors, quantity, additional_images } = req.body;
  const stmt = db.prepare("INSERT INTO products (name, price, category, gender, image, description, tagline, details, style_type, colors, quantity, additional_images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  stmt.run(name, price, category, gender, image, description, tagline, details, style_type, colors, quantity || 0, additional_images, function(err) {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    res.status(201).json({ id: this.lastID, message: 'Product added successfully' });
  });
  stmt.finalize();
});

app.put('/api/products/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { name, price, category, gender, image, description, tagline, details, style_type, colors, quantity, additional_images } = req.body;
  const stmt = db.prepare("UPDATE products SET name = ?, price = ?, category = ?, gender = ?, image = ?, description = ?, tagline = ?, details = ?, style_type = ?, colors = ?, quantity = ?, additional_images = ? WHERE id = ?");
  stmt.run(name, price, category, gender, image, description, tagline, details, style_type, colors, quantity || 0, additional_images, id, function(err) {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    res.json({ message: 'Product updated successfully' });
  });
  stmt.finalize();
});

app.delete('/api/products/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM products WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    res.json({ message: 'Product deleted successfully' });
  });
});

app.delete('/api/products', verifyToken, (req, res) => {
  db.run("DELETE FROM products", [], function(err) {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    db.run("DELETE FROM sqlite_sequence WHERE name='products'", [], function(errSeq) {
      if (errSeq) console.error("Error resetting sequence:", errSeq);
      res.json({ message: 'All products cleared and ID sequence reset' });
    });
  });
});

app.get('/api/orders', verifyToken, (req, res) => {
  db.all("SELECT * FROM orders", (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.delete('/api/orders/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM orders WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    res.json({ message: 'Order deleted successfully' });
  });
});

app.delete('/api/orders', verifyToken, (req, res) => {
  db.run("DELETE FROM orders", [], function(err) {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    db.run("DELETE FROM sqlite_sequence WHERE name='orders'", [], function(errSeq) {
      res.json({ message: 'All orders cleared and ID sequence reset' });
    });
  });
});

app.get('/api/payments', verifyToken, (req, res) => {
  db.all("SELECT * FROM payments", (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.delete('/api/payments/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM payments WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    res.json({ message: 'Payment deleted successfully' });
  });
});

app.delete('/api/payments', verifyToken, (req, res) => {
  db.run("DELETE FROM payments", [], function(err) {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    res.json({ message: 'All payments cleared' });
  });
});

app.get('/api/customers', verifyToken, (req, res) => {
  db.all("SELECT * FROM customers", (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.delete('/api/customers/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM customers WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    res.json({ message: 'Customer deleted successfully' });
  });
});

app.delete('/api/customers', verifyToken, (req, res) => {
  db.run("DELETE FROM customers", [], function(err) {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    db.run("DELETE FROM sqlite_sequence WHERE name='customers'", [], function(errSeq) {
      res.json({ message: 'All customers cleared and ID sequence reset' });
    });
  });
});

app.get('/api/customer/orders', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET || 'selestial-super-secret-key-2026', (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    
    const { email, phone } = decoded;
    let query = "SELECT * FROM orders WHERE email = ? OR phone = ? ORDER BY id DESC";
    
    db.all(query, [email || null, phone || null], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(rows);
    });
  });
});

// Serve static frontend files (Vite build)
const distPath = join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
