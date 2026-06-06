import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { initDb, db } from './db.js';
import { loginAdmin, verifyToken, loginCustomer, signupCustomer, sendOtp, verifyOtp, loginWithGoogle } from './auth.js';
import { createOrderStore } from './orderStore.js';
import { sendOrderEmails } from './email.js';
import { optimizeUploadedImage, sendUploadImage } from './imageOptimizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'js.stripe.com', 'apis.google.com', "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https://api.stripe.com'],
      frameSrc: ['js.stripe.com', 'accounts.google.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === allowedOrigin || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());

// Rate limiters
const loginLimiter    = rateLimit({ windowMs: 15*60*1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many login attempts. Please try again in 15 minutes.' } });
const otpSendLimiter  = rateLimit({ windowMs: 10*60*1000, max: 5,  standardHeaders: true, legacyHeaders: false, message: { error: 'Too many OTP requests. Please wait 10 minutes.' } });
const otpVerifyLimiter= rateLimit({ windowMs: 10*60*1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many OTP attempts. Please request a new OTP.' } });
const checkoutLimiter = rateLimit({ windowMs: 60*1000,    max: 5,  message: { error: 'Too many checkout requests.' } });

// Upload directory
const bundledUploadDir = join(__dirname, 'uploads');
const uploadDir = process.env.VERCEL ? join('/tmp', 'uploads') : bundledUploadDir;
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (process.env.VERCEL && fs.existsSync(bundledUploadDir)) {
  for (const file of fs.readdirSync(bundledUploadDir)) {
    const src = join(bundledUploadDir, file);
    const dst = join(uploadDir, file);
    if (fs.statSync(src).isFile() && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
  }
}

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + extname(file.originalname)),
});
const upload = multer({
  storage,
  limits: { files: 10, fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) { cb(new Error('Only image uploads are supported')); return; }
    cb(null, true);
  },
});

function handleImageUpload(req, res, next) {
  upload.array('images', 10)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image files must be 10MB or smaller' });
    res.status(400).json({ error: err.message || 'Image upload failed' });
  });
}

// Init DB and order store
initDb();
const orderStore = createOrderStore({ db });

// Stripe (optional)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    const { default: Stripe } = await import('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
  } catch (e) { console.warn('Stripe init failed:', e.message); }
}

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', stripe: !!stripe, time: new Date().toISOString() }));

// Image serving
app.get('/api/uploads/:filename', async (req, res) => {
  try { await sendUploadImage(req, res, { uploadDir }); }
  catch (err) { console.error('Image error:', err); res.status(500).json({ error: 'Image processing error' }); }
});

// Auth routes
app.post('/api/auth/login',                  loginLimiter,     loginAdmin);
app.post('/api/auth/customer/signup',        loginLimiter,     signupCustomer);
app.post('/api/auth/customer/login',         loginLimiter,     loginCustomer);
app.post('/api/auth/customer/google',        loginLimiter,     loginWithGoogle);
app.post('/api/auth/customer/send-otp',      otpSendLimiter,   sendOtp);
app.post('/api/auth/customer/verify-otp',    otpVerifyLimiter, verifyOtp);
app.delete('/api/auth/logout', (req, res) => {
  res.clearCookie('authToken', { httpOnly: true, secure: true, sameSite: 'Strict' });
  res.json({ message: 'Logged out successfully' });
});

// Public products
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});
app.get('/api/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json(row);
  });
});

// Reviews
app.get('/api/products/:id/reviews', (req, res) => {
  db.all('SELECT * FROM product_reviews WHERE product_id = ? ORDER BY id DESC', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows || []);
  });
});
app.post('/api/products/:id/reviews', (req, res) => {
  const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];
  let customerName = 'Verified Customer';
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.id) {
        const customer = db.get('SELECT name FROM customers WHERE id = ?', [decoded.id]);
        if (customer) customerName = customer.name || customerName;
      }
    } catch (_) {}
  }
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  if (!comment?.trim()) return res.status(400).json({ error: 'Review comment is required' });
  const date = new Date().toISOString().split('T')[0];
  db.run('INSERT INTO product_reviews (product_id, customer_name, rating, comment, date) VALUES (?, ?, ?, ?, ?)',
    [req.params.id, customerName, parseInt(rating), comment.trim(), date],
    function(err) {
      if (err) return res.status(500).json({ error: 'Database error saving review' });
      res.status(201).json({ id: this.lastID, message: 'Review submitted successfully' });
    }
  );
});

// Checkout with server-side price validation
app.post('/api/checkout', checkoutLimiter, async (req, res) => {
  try {
    const { cartItems, paymentMethodId } = req.body;
    if (!Array.isArray(cartItems) || cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty' });
    let serverTotal = 0;
    // 1. Validate pricing and stock availability
    for (const item of cartItems) {
      const product = db.get('SELECT name, price, quantity FROM products WHERE id = ?', [item.id]);
      if (!product) return res.status(400).json({ error: `Product ID ${item.id} not found` });
      
      const requestedQty = Math.max(1, parseInt(item.quantity) || 1);
      if (requestedQty > product.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for "${product.name}". Only ${product.quantity} items are available.` 
        });
      }
      
      serverTotal += product.price * requestedQty;
    }
    serverTotal = Math.round(serverTotal * 100) / 100;
    
    // 2. Process payment if Stripe is configured
    if (stripe && paymentMethodId) {
      const pi = await stripe.paymentIntents.create({
        amount: Math.round(serverTotal * 100),
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      });
      if (pi.status !== 'succeeded') return res.status(402).json({ error: 'Payment was not successful.' });
    }
    
    // 3. Deduct inventory from the database
    for (const item of cartItems) {
      const requestedQty = Math.max(1, parseInt(item.quantity) || 1);
      db.run('UPDATE products SET quantity = quantity - ? WHERE id = ?', [requestedQty, item.id]);
    }
    
    const safePayload = { ...req.body, totalAmount: serverTotal };
    delete safePayload.cardNumber; delete safePayload.expiryDate; delete safePayload.cvc;
    const { orderId, order } = await orderStore.createCheckout(safePayload);
    if (order) sendOrderEmails(order).catch(err => console.error('Order email error:', err));
    res.status(201).json({ message: 'Order processed successfully', orderId });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to process order. Please try again.' });
  }
});

// Newsletter
app.post('/api/newsletter/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'A valid email address is required' });
  db.get('SELECT id, discount_code FROM newsletter_subscribers WHERE email = ?', [email], async (err, existing) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (existing) return res.json({ message: 'You are already subscribed! Your discount code was sent to your email.' });
    const discountCode = 'SEL-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const subscribedAt = new Date().toISOString();
    db.run('INSERT INTO newsletter_subscribers (email, discount_code, subscribed_at) VALUES (?, ?, ?)',
      [email, discountCode, subscribedAt],
      async function(insertErr) {
        if (insertErr) return res.status(500).json({ error: 'Database error saving subscription' });
        try {
          if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            const nodemailer = await import('nodemailer');
            const transporter = nodemailer.default.createTransport({
              host: process.env.SMTP_HOST || 'smtp.gmail.com',
              port: parseInt(process.env.SMTP_PORT || '587'),
              secure: process.env.SMTP_PORT === '465',
              auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });
            await transporter.sendMail({
              from: `"Selestial" <${process.env.SMTP_USER}>`,
              to: email,
              subject: 'Welcome to the Selestial Club — Your 10% Discount Code',
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#000;color:#fff;padding:40px;border-radius:8px;"><h1 style="font-size:28px;letter-spacing:4px;text-transform:uppercase;">Welcome to Selestial</h1><p style="color:#9CA3AF;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Universe of Silver</p><p style="font-size:16px;color:#E5E7EB;line-height:1.8;">Thank you for joining. Here is your exclusive 10% discount code:</p><div style="background:#111;border:1px solid #333;padding:20px;text-align:center;margin:32px 0;border-radius:4px;"><span style="font-size:28px;font-weight:bold;letter-spacing:6px;">${discountCode}</span></div><p style="font-size:14px;color:#9CA3AF;">Use this code at checkout. Valid for one use.</p><p style="font-size:14px;color:#9CA3AF;margin-top:32px;">With silver and light,<br><strong style="color:#fff;">The Selestial Team</strong></p></div>`,
            });
          }
        } catch (emailErr) { console.error('Newsletter email error:', emailErr); }
        res.json({ message: 'Welcome to the Universe of Silver. Check your inbox for your discount code.' });
      }
    );
  });
});

// Product validation helper
function validateProduct(body) {
  const errors = [];
  const { name, price, quantity, image } = body;
  if (!name || typeof name !== 'string' || name.trim().length < 2) errors.push('Name must be at least 2 characters');
  if (name && name.length > 200) errors.push('Name must be under 200 characters');
  const priceNum = parseFloat(price);
  if (!Number.isFinite(priceNum) || priceNum <= 0) errors.push('Price must be a positive number');
  const qtyNum = parseInt(quantity);
  if (quantity !== undefined && (!Number.isInteger(qtyNum) || qtyNum < 0)) errors.push('Quantity must be a non-negative integer');
  if (image && typeof image === 'string' && image.length > 0) {
    if (!image.startsWith('/') && !image.startsWith('https://')) errors.push('Image must be a relative path (/) or HTTPS URL');
  }
  return errors;
}

// Admin product routes
app.post('/api/upload', verifyToken, handleImageUpload, async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
  try {
    const optimizedFiles = await Promise.all(req.files.map(f => optimizeUploadedImage(f, { outputDir: uploadDir })));
    res.json({ urls: optimizedFiles.map(f => f.url) });
  } catch (err) { console.error('Image processing error:', err); res.status(500).json({ error: 'Image processing failed' }); }
});

app.post('/api/products', verifyToken, (req, res) => {
  const errs = validateProduct(req.body);
  if (errs.length > 0) return res.status(400).json({ error: errs.join('; ') });
  const { name, price, category, gender, image, description, tagline, details, style_type, colors, quantity, additional_images } = req.body;
  const stmt = db.prepare('INSERT INTO products (name, price, category, gender, image, description, tagline, details, style_type, colors, quantity, additional_images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(name.trim(), parseFloat(price), category, gender, image, description, tagline, details, style_type, colors, parseInt(quantity) || 0, additional_images, function(err) {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    res.status(201).json({ id: this.lastID, message: 'Product added successfully' });
  });
  stmt.finalize();
});

app.put('/api/products/:id', verifyToken, (req, res) => {
  const errs = validateProduct(req.body);
  if (errs.length > 0) return res.status(400).json({ error: errs.join('; ') });
  const { name, price, category, gender, image, description, tagline, details, style_type, colors, quantity, additional_images } = req.body;
  const stmt = db.prepare('UPDATE products SET name=?, price=?, category=?, gender=?, image=?, description=?, tagline=?, details=?, style_type=?, colors=?, quantity=?, additional_images=? WHERE id=?');
  stmt.run(name.trim(), parseFloat(price), category, gender, image, description, tagline, details, style_type, colors, parseInt(quantity) || 0, additional_images, req.params.id, function(err) {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    res.json({ message: 'Product updated successfully' });
  });
  stmt.finalize();
});

app.delete('/api/products/:id', verifyToken, (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'Product deleted successfully' });
  });
});

app.delete('/api/products', verifyToken, (req, res) => {
  db.run('DELETE FROM products', [], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    db.run("DELETE FROM sqlite_sequence WHERE name='products'", [], () => res.json({ message: 'All products cleared' }));
  });
});

// Orders
app.get('/api/orders',        verifyToken, async (req, res) => { try { res.json(await orderStore.listOrders()); } catch (e) { res.status(500).json({ error: 'Database error' }); } });
app.delete('/api/orders/:id', verifyToken, async (req, res) => { try { await orderStore.deleteOrder(req.params.id); res.json({ message: 'Order deleted' }); } catch (e) { res.status(500).json({ error: 'Database error' }); } });
app.delete('/api/orders',     verifyToken, async (req, res) => { try { await orderStore.clearOrders(); res.json({ message: 'All orders cleared' }); } catch (e) { res.status(500).json({ error: 'Database error' }); } });

// Payments
app.get('/api/payments',        verifyToken, async (req, res) => { try { res.json(await orderStore.listPayments()); } catch (e) { res.status(500).json({ error: 'Database error' }); } });
app.delete('/api/payments/:id', verifyToken, async (req, res) => { try { await orderStore.deletePayment(req.params.id); res.json({ message: 'Payment deleted' }); } catch (e) { res.status(500).json({ error: 'Database error' }); } });
app.delete('/api/payments',     verifyToken, async (req, res) => { try { await orderStore.clearPayments(); res.json({ message: 'All payments cleared' }); } catch (e) { res.status(500).json({ error: 'Database error' }); } });

// Customers
app.get('/api/customers',        verifyToken, async (req, res) => { try { res.json(await orderStore.listCustomers()); } catch (e) { res.status(500).json({ error: 'Database error' }); } });
app.delete('/api/customers/:id', verifyToken, async (req, res) => { try { await orderStore.deleteCustomer(req.params.id); res.json({ message: 'Customer deleted' }); } catch (e) { res.status(500).json({ error: 'Database error' }); } });
app.delete('/api/customers',     verifyToken, async (req, res) => { try { await orderStore.clearCustomers(); res.json({ message: 'All customers cleared' }); } catch (e) { res.status(500).json({ error: 'Database error' }); } });

// Customer's own orders
app.get('/api/customer/orders', (req, res) => {
  const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    try { res.json(await orderStore.listCustomerOrders(decoded.email, decoded.phone)); }
    catch (storeErr) { res.status(500).json({ error: 'Database error' }); }
  });
});

// Dynamic sitemap
app.get('/sitemap.xml', (req, res) => {
  const base = process.env.SITE_URL || 'https://selestial.vercel.app';
  db.all('SELECT id FROM products', (err, rows) => {
    const staticPaths = ['/', '/products', '/about', '/faq', '/care-guide', '/size-guide', '/shipping-returns', '/privacy', '/terms', '/contact', '/auth'];
    const productPaths = (rows || []).map(r => `/product/${r.id}`);
    const allPaths = [...staticPaths, ...productPaths];
    const urls = allPaths.map(p => `<url><loc>${base}${p}</loc><changefreq>weekly</changefreq><priority>${p === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n  ');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${urls}\n</urlset>`;
    res.setHeader('Content-Type', 'application/xml').send(xml);
  });
});

// Static frontend
const distPath = join(__dirname, '../dist');
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (/\.(?:avif|webp|png|jpe?g|gif|svg|ico)$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  },
}));
app.get('/{*splat}', (req, res) => res.sendFile(join(distPath, 'index.html')));

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => console.log(`Backend running on http://0.0.0.0:${PORT}`));
}

export default app;
