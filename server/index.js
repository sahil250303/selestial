import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { initDb, db } from './db.js';
import { loginAdmin, verifyToken, loginCustomer, signupCustomer, sendOtp, verifyOtp } from './auth.js';
import { createOrderStore } from './orderStore.js';
import { sendOrderEmails } from './email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const bundledUploadDir = join(__dirname, 'uploads');
const uploadDir = process.env.VERCEL ? join('/tmp', 'uploads') : bundledUploadDir;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (process.env.VERCEL && fs.existsSync(bundledUploadDir)) {
  for (const file of fs.readdirSync(bundledUploadDir)) {
    const source = join(bundledUploadDir, file);
    const destination = join(uploadDir, file);
    if (fs.statSync(source).isFile() && !fs.existsSync(destination)) {
      fs.copyFileSync(source, destination);
    }
  }
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

app.get('/api/uploads/:filename', (req, res) => {
  const { filename } = req.params;
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  res.sendFile(join(uploadDir, filename));
});

// Initialize database
initDb();
const orderStore = createOrderStore({ db });

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
app.post('/api/checkout', async (req, res) => {
  try {
    const { orderId, order } = await orderStore.createCheckout(req.body);
    
    // Send email notifications asynchronously
    if (order) {
      sendOrderEmails(order).catch(err => console.error("Order email error:", err));
    }

    res.status(201).json({ message: 'Order processed successfully', orderId });
  } catch (err) {
    console.error('Checkout persistence error:', err);
    res.status(500).json({ error: 'Database error creating order' });
  }
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

app.get('/api/orders', verifyToken, async (req, res) => {
  try {
    res.json(await orderStore.listOrders());
  } catch (err) {
    console.error('Order list error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/orders/:id', verifyToken, async (req, res) => {
  try {
    await orderStore.deleteOrder(req.params.id);
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    console.error('Order delete error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.delete('/api/orders', verifyToken, async (req, res) => {
  try {
    await orderStore.clearOrders();
    res.json({ message: 'All orders cleared and ID sequence reset' });
  } catch (err) {
    console.error('Order clear error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/payments', verifyToken, async (req, res) => {
  try {
    res.json(await orderStore.listPayments());
  } catch (err) {
    console.error('Payment list error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/payments/:id', verifyToken, async (req, res) => {
  try {
    await orderStore.deletePayment(req.params.id);
    res.json({ message: 'Payment deleted successfully' });
  } catch (err) {
    console.error('Payment delete error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.delete('/api/payments', verifyToken, async (req, res) => {
  try {
    await orderStore.clearPayments();
    res.json({ message: 'All payments cleared' });
  } catch (err) {
    console.error('Payment clear error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/customers', verifyToken, async (req, res) => {
  try {
    res.json(await orderStore.listCustomers());
  } catch (err) {
    console.error('Customer list error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/customers/:id', verifyToken, async (req, res) => {
  try {
    await orderStore.deleteCustomer(req.params.id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('Customer delete error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.delete('/api/customers', verifyToken, async (req, res) => {
  try {
    await orderStore.clearCustomers();
    res.json({ message: 'All customers cleared and ID sequence reset' });
  } catch (err) {
    console.error('Customer clear error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/customer/orders', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET || 'selestial-super-secret-key-2026', async (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const { email, phone } = decoded;
      res.json(await orderStore.listCustomerOrders(email, phone));
    } catch (storeErr) {
      console.error('Customer order list error:', storeErr);
      res.status(500).json({ error: 'Database error' });
    }
  });
});

// Serve static frontend files (Vite build)
const distPath = join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('/{*splat}', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
