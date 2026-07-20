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
import { optimizeUploadedImage, sendUploadImage, ALLOWED_IMAGE_EXTENSIONS, ALLOWED_IMAGE_MIMETYPES } from './imageOptimizer.js';
import { rateLimits, jsonBodyLimit, uploadLimits } from './config.js';
import { validateBody, validateIntParam, validateSafeIdParam } from './validate.js';
import {
  adminLoginSchema, customerSignupSchema, customerLoginSchema, googleLoginSchema,
  sendOtpSchema, verifyOtpSchema, reviewSchema, newsletterSchema, checkoutSchema,
  productSchema, validateAdditionalImages,
} from './schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// Behind Vercel/other proxies the client IP arrives in X-Forwarded-For; the
// rate limiter must key on the real client, not the proxy. Configurable via
// TRUST_PROXY (number of hops or "true"); defaults to 1 hop on Vercel.
const trustProxy = process.env.TRUST_PROXY ?? (process.env.VERCEL ? '1' : '');
if (trustProxy) app.set('trust proxy', trustProxy === 'true' ? true : Number(trustProxy));

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'js.stripe.com', 'apis.google.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https://api.stripe.com'],
      frameSrc: ['js.stripe.com', 'accounts.google.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS — strict allow-list in all environments (comma-separated ALLOWED_ORIGIN supported).
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:5173')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // No Origin header = same-origin or non-browser client (allowed). Otherwise must be allow-listed.
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(Object.assign(new Error('CORS policy violation'), { status: 403 }));
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: jsonBodyLimit }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Tiered per-IP limits (all thresholds env-configurable — see config.js):
//   1. auth routes    — strict, plus per-ACCOUNT exponential backoff in auth.js
//   2. public /api    — moderate (anonymous storefront traffic)
//   3. authenticated  — loose (signed-in customers and the admin dashboard)
// Sensitive side-effect routes (checkout, newsletter, reviews, uploads) carry
// an extra dedicated limiter on top.

function hasValidJwt(req) {
  if (req._jwtChecked !== undefined) return req._jwtChecked;
  const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];
  let valid = false;
  if (token) {
    try { jwt.verify(token, process.env.JWT_SECRET); valid = true; } catch { /* invalid token */ }
  }
  req._jwtChecked = valid;
  return valid;
}

const limiterDefaults = { standardHeaders: true, legacyHeaders: false };
const makeLimiter = (opts) => rateLimit({ ...limiterDefaults, ...opts });

const publicLimiter = makeLimiter({
  ...rateLimits.public,
  skip: hasValidJwt,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});
const authedLimiter = makeLimiter({
  ...rateLimits.authed,
  skip: (req) => !hasValidJwt(req),
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});
app.use('/api', publicLimiter, authedLimiter);

const loginLimiter     = makeLimiter({ ...rateLimits.auth,      message: { error: 'Too many login attempts. Please try again later.' } });
const otpSendLimiter   = makeLimiter({ ...rateLimits.otpSend,   message: { error: 'Too many OTP requests. Please wait before requesting another code.' } });
const otpVerifyLimiter = makeLimiter({ ...rateLimits.otpVerify, message: { error: 'Too many OTP attempts. Please request a new OTP.' } });
const checkoutLimiter  = makeLimiter({ ...rateLimits.checkout,  message: { error: 'Too many checkout requests.' } });
const newsletterLimiter= makeLimiter({ ...rateLimits.newsletter,message: { error: 'Too many subscription requests. Please try again later.' } });
const reviewLimiter    = makeLimiter({ ...rateLimits.review,    message: { error: 'Too many reviews submitted. Please try again later.' } });
const uploadLimiter    = makeLimiter({ ...rateLimits.upload,    message: { error: 'Too many uploads. Please try again later.' } });

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

// ── Multer ────────────────────────────────────────────────────────────────────
// Defense in depth for uploads:
//   1. fileFilter — extension AND mimetype allowlist (both client-controlled,
//      so this is only a cheap first gate).
//   2. Server-generated filenames — the original name never touches the disk.
//   3. sharp re-encode (below) — the CONTENT must decode as a real image; the
//      stored artifact is always a freshly encoded .webp, never client bytes.
//   4. Files live outside the static web root and are only reachable through
//      /api/uploads/:filename, which allowlists extensions again on the way out.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_IMAGE_EXTENSIONS.includes(ext) ? ext : '.img';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`);
  },
});
const upload = multer({
  storage,
  limits: { files: uploadLimits.maxFiles, fileSize: uploadLimits.maxFileSizeBytes },
  fileFilter: (req, file, cb) => {
    const ext = extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype) || !ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      cb(new Error('UNSUPPORTED_UPLOAD_TYPE'));
      return;
    }
    cb(null, true);
  },
});

function handleImageUpload(req, res, next) {
  upload.array('images', uploadLimits.maxFiles)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `Image files must be ${Math.floor(uploadLimits.maxFileSizeBytes / (1024 * 1024))}MB or smaller` });
    }
    if (err instanceof multer.MulterError && (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE')) {
      return res.status(400).json({ error: `At most ${uploadLimits.maxFiles} images per upload` });
    }
    if (err.message === 'UNSUPPORTED_UPLOAD_TYPE') {
      return res.status(400).json({ error: 'Only JPEG, PNG, WebP, GIF or AVIF images are supported' });
    }
    console.error('Upload error:', err);
    res.status(400).json({ error: 'Image upload failed' });
  });
}

// Init DB and order store
await initDb();
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

// Auth routes — strict per-IP limits here, per-account backoff inside auth.js.
app.post('/api/auth/login',               loginLimiter,     validateBody(adminLoginSchema),     loginAdmin);
app.post('/api/auth/customer/signup',     loginLimiter,     validateBody(customerSignupSchema), signupCustomer);
app.post('/api/auth/customer/login',      loginLimiter,     validateBody(customerLoginSchema),  loginCustomer);
app.post('/api/auth/customer/google',     loginLimiter,     validateBody(googleLoginSchema),    loginWithGoogle);
app.post('/api/auth/customer/send-otp',   otpSendLimiter,   validateBody(sendOtpSchema),        sendOtp);
app.post('/api/auth/customer/verify-otp', otpVerifyLimiter, validateBody(verifyOtpSchema),      verifyOtp);
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
app.get('/api/products/:id', validateIntParam('id'), (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json(row);
  });
});

// Reviews
app.get('/api/products/:id/reviews', validateIntParam('id'), (req, res) => {
  db.all('SELECT * FROM product_reviews WHERE product_id = ? ORDER BY id DESC', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows || []);
  });
});
app.post('/api/products/:id/reviews', reviewLimiter, validateIntParam('id'), validateBody(reviewSchema), async (req, res) => {
  // Reviews require a signed-in customer — no more anonymous "Verified Customer".
  const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];
  let customerName = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.id) {
        const customer = await db.get('SELECT name FROM customers WHERE id = ?', [decoded.id]);
        if (customer) customerName = customer.name || 'Customer';
      }
    } catch { /* invalid token — handled below */ }
  }
  if (!customerName) return res.status(401).json({ error: 'Please sign in to leave a review.' });
  const { rating, comment } = req.body;
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
app.post('/api/checkout', checkoutLimiter, validateBody(checkoutSchema), async (req, res) => {
  try {
    const { cartItems, paymentMethodId } = req.body;
    let serverTotal = 0;
    // 1. Validate pricing and stock availability (authoritative, server-side).
    //    Order items are REBUILT from the products table — client-supplied
    //    names/prices are display-only and never stored.
    const verifiedItems = [];
    for (const item of cartItems) {
      const product = await db.get('SELECT name, price, quantity, image FROM products WHERE id = ?', [item.id]);
      if (!product) return res.status(400).json({ error: `Product ID ${item.id} not found` });

      const requestedQty = Math.max(1, parseInt(item.quantity ?? item.qty) || 1);
      if (requestedQty > product.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for "${product.name}". Only ${product.quantity} items are available.`
        });
      }

      serverTotal += product.price * requestedQty;
      verifiedItems.push({
        id: item.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: requestedQty,
        ...(item.size ? { size: String(item.size) } : {}),
        ...(item.color ? { color: String(item.color) } : {}),
      });
    }
    serverTotal = Math.round(serverTotal * 100) / 100;

    // 2. Payment. If Stripe is configured a successful charge is REQUIRED;
    //    otherwise the order is recorded as Unpaid (never silently "Completed").
    let paymentStatus = 'Unpaid';
    if (stripe) {
      if (!paymentMethodId) return res.status(402).json({ error: 'Payment information is required.' });
      const pi = await stripe.paymentIntents.create({
        amount: Math.round(serverTotal * 100),
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      });
      if (pi.status !== 'succeeded') return res.status(402).json({ error: 'Payment was not successful.' });
      paymentStatus = 'Paid';
    }

    // 3. Deduct inventory atomically — the conditional UPDATE prevents overselling
    //    under concurrent checkouts (0 rows changed = no longer enough stock).
    for (const item of verifiedItems) {
      const result = await db.run(
        'UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?',
        [item.quantity, item.id, item.quantity]
      );
      if (!result || result.changes === 0) {
        return res.status(409).json({ error: `Stock changed while checking out. Please review your cart.` });
      }
    }

    const safePayload = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      paymentMethod: req.body.paymentMethod,
      cartItems: verifiedItems,
      totalAmount: serverTotal,
      paymentStatus,
      orderStatus: paymentStatus === 'Paid' ? 'Processing' : 'Pending Payment',
    };
    const { orderId, order } = await orderStore.createCheckout(safePayload);
    if (order) sendOrderEmails(order).catch(err => console.error('Order email error:', err));
    res.status(201).json({ message: 'Order processed successfully', orderId, paymentStatus });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to process order. Please try again.' });
  }
});

// Newsletter
app.post('/api/newsletter/subscribe', newsletterLimiter, validateBody(newsletterSchema), async (req, res) => {
  const email = req.body.email.trim().toLowerCase();
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

// ── Admin routes (verifyToken enforces the admin role) ────────────────────────
app.post('/api/upload', verifyToken, uploadLimiter, handleImageUpload, async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
  try {
    // sharp re-encodes every file — content that is not a decodable image fails
    // here and is rejected. Original client bytes are deleted either way.
    const optimizedFiles = await Promise.all(req.files.map(f => optimizeUploadedImage(f, { outputDir: uploadDir })));
    res.json({ urls: optimizedFiles.map(f => f.url) });
  } catch (err) {
    console.error('Image processing error:', err);
    // Clean up every temp file from this batch — nothing unverified stays on disk.
    await Promise.all(req.files.map(f => fs.promises.unlink(f.path).catch(() => {})));
    res.status(400).json({ error: 'One or more files could not be processed as images' });
  }
});

function checkProductBody(req, res, next) {
  const additionalImagesError = validateAdditionalImages(req.body.additional_images);
  if (additionalImagesError) return res.status(400).json({ error: additionalImagesError });
  next();
}

app.post('/api/products', verifyToken, validateBody(productSchema), checkProductBody, (req, res) => {
  const { name, price, category, gender, image, description, tagline, details, style_type, colors, quantity, additional_images } = req.body;
  const stmt = db.prepare('INSERT INTO products (name, price, category, gender, image, description, tagline, details, style_type, colors, quantity, additional_images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(name.trim(), parseFloat(price), category, gender, image, description, tagline, details, style_type, colors, parseInt(quantity) || 0, additional_images, function(err) {
    if (err) { console.error('Product insert error:', err); return res.status(500).json({ error: 'Database error' }); }
    res.status(201).json({ id: this.lastID, message: 'Product added successfully' });
  });
  stmt.finalize();
});

app.put('/api/products/:id', verifyToken, validateIntParam('id'), validateBody(productSchema), checkProductBody, (req, res) => {
  const { name, price, category, gender, image, description, tagline, details, style_type, colors, quantity, additional_images } = req.body;
  const stmt = db.prepare('UPDATE products SET name=?, price=?, category=?, gender=?, image=?, description=?, tagline=?, details=?, style_type=?, colors=?, quantity=?, additional_images=? WHERE id=?');
  stmt.run(name.trim(), parseFloat(price), category, gender, image, description, tagline, details, style_type, colors, parseInt(quantity) || 0, additional_images, req.params.id, function(err) {
    if (err) { console.error('Product update error:', err); return res.status(500).json({ error: 'Database error' }); }
    res.json({ message: 'Product updated successfully' });
  });
  stmt.finalize();
});

app.delete('/api/products/:id', verifyToken, validateIntParam('id'), (req, res) => {
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
app.get('/api/orders',        verifyToken, async (req, res) => { try { res.json(await orderStore.listOrders()); } catch (e) { console.error('Orders list error:', e); res.status(500).json({ error: 'Database error' }); } });
app.delete('/api/orders/:id', verifyToken, validateSafeIdParam('id'), async (req, res) => { try { await orderStore.deleteOrder(req.params.id); res.json({ message: 'Order deleted' }); } catch (e) { console.error('Order delete error:', e); res.status(500).json({ error: 'Database error' }); } });
app.delete('/api/orders',     verifyToken, async (req, res) => { try { await orderStore.clearOrders(); res.json({ message: 'All orders cleared' }); } catch (e) { console.error('Orders clear error:', e); res.status(500).json({ error: 'Database error' }); } });

// Payments
app.get('/api/payments',        verifyToken, async (req, res) => { try { res.json(await orderStore.listPayments()); } catch (e) { console.error('Payments list error:', e); res.status(500).json({ error: 'Database error' }); } });
app.delete('/api/payments/:id', verifyToken, validateSafeIdParam('id'), async (req, res) => { try { await orderStore.deletePayment(req.params.id); res.json({ message: 'Payment deleted' }); } catch (e) { console.error('Payment delete error:', e); res.status(500).json({ error: 'Database error' }); } });
app.delete('/api/payments',     verifyToken, async (req, res) => { try { await orderStore.clearPayments(); res.json({ message: 'All payments cleared' }); } catch (e) { console.error('Payments clear error:', e); res.status(500).json({ error: 'Database error' }); } });

// Customers
app.get('/api/customers',        verifyToken, async (req, res) => { try { res.json(await orderStore.listCustomers()); } catch (e) { console.error('Customers list error:', e); res.status(500).json({ error: 'Database error' }); } });
app.delete('/api/customers/:id', verifyToken, validateSafeIdParam('id'), async (req, res) => { try { await orderStore.deleteCustomer(req.params.id); res.json({ message: 'Customer deleted' }); } catch (e) { console.error('Customer delete error:', e); res.status(500).json({ error: 'Database error' }); } });
app.delete('/api/customers',     verifyToken, async (req, res) => { try { await orderStore.clearCustomers(); res.json({ message: 'All customers cleared' }); } catch (e) { console.error('Customers clear error:', e); res.status(500).json({ error: 'Database error' }); } });

// Customer's own orders
app.get('/api/customer/orders', (req, res) => {
  const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    try { res.json(await orderStore.listCustomerOrders(decoded.email, decoded.phone)); }
    catch (storeErr) { console.error('Customer orders error:', storeErr); res.status(500).json({ error: 'Database error' }); }
  });
});

// Dynamic sitemap
app.get('/sitemap.xml', (req, res) => {
  const base = process.env.SITE_URL || 'https://selestial-lovat.vercel.app';
  db.all('SELECT id FROM products', (err, rows) => {
    const staticPaths = ['/', '/products', '/about', '/faq', '/care-guide', '/size-guide', '/shipping-returns', '/privacy', '/terms', '/contact', '/auth'];
    const productPaths = (rows || []).map(r => `/product/${r.id}`);
    const allPaths = [...staticPaths, ...productPaths];
    const urls = allPaths.map(p => `<url><loc>${base}${p}</loc><changefreq>weekly</changefreq><priority>${p === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n  ');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${urls}\n</urlset>`;
    res.setHeader('Content-Type', 'application/xml').send(xml);
  });
});

// Unknown API routes get a JSON 404, never the SPA shell.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Static frontend
const distPath = join(__dirname, '../dist');
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (/\.(?:avif|webp|png|jpe?g|gif|svg|ico)$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  },
}));
app.get('/{*splat}', (req, res) => res.sendFile(join(distPath, 'index.html')));

// ── Global error handler ──────────────────────────────────────────────────────
// Last line of defense: full details are logged server-side; clients only ever
// see a generic message — no stack traces, paths or driver errors.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (res.headersSent) return;
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  if (err.message === 'CORS policy violation') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ error: 'Internal server error' });
});

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => console.log(`Backend running on http://0.0.0.0:${PORT}`));
}

export default app;
