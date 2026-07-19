import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import jwt from 'jsonwebtoken';

import { initDb, db } from './db.js';
import { loginAdmin, verifyToken, loginCustomer, signupCustomer, sendOtp, verifyOtp } from './auth.js';
import { createOrderStore } from './orderStore.js';
import { sendOrderEmails } from './email.js';

import { assertBootSecrets, securityConfig } from './security/config.js';
import {
  authLimiters,
  otpLimiters,
  publicLimiter,
  authedLimiter,
  checkoutLimiter
} from './security/rateLimiters.js';
import {
  validate,
  adminLoginSchema,
  customerSignupSchema,
  customerLoginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  checkoutSchema,
  productWriteSchema,
  idParam,
  filenameParam
} from './security/validation.js';
import { multerFileFilter, verifyUploadedFiles, UploadRejectedError } from './security/uploadGuard.js';
import { respondError, wrap, centralErrorHandler } from './security/errorHandler.js';

dotenv.config({ quiet: true });
assertBootSecrets();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + extname(file.originalname).toLowerCase());
  }
});
const upload = multer({
  storage,
  fileFilter: multerFileFilter,
  limits: {
    files: securityConfig.upload.maxFiles,
    fileSize: securityConfig.upload.maxFileBytes,
    fieldSize: 1024 * 1024,
    fieldNameSize: 200,
    fields: 100
  }
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.get('/api/uploads/:filename', (req, res) => {
  const parsed = filenameParam.safeParse(req.params.filename);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(join(uploadDir, parsed.data));
});

initDb();
const orderStore = createOrderStore({ db });

app.post('/api/auth/login', authLimiters, validate(adminLoginSchema), loginAdmin);

app.post('/api/auth/customer/signup', authLimiters, validate(customerSignupSchema), signupCustomer);
app.post('/api/auth/customer/login', authLimiters, validate(customerLoginSchema), loginCustomer);
app.post('/api/auth/customer/send-otp', otpLimiters, validate(sendOtpSchema), sendOtp);
app.post('/api/auth/customer/verify-otp', otpLimiters, validate(verifyOtpSchema), verifyOtp);

app.get('/api/products', publicLimiter, (req, res) => {
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) return respondError(res, 500, 'Database error', err);
    res.json(rows);
  });
});

app.get('/api/products/:id', publicLimiter, (req, res) => {
  const parsed = idParam.safeParse(req.params.id);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid product id' });
  db.get('SELECT * FROM products WHERE id = ?', [parsed.data], (err, row) => {
    if (err) return respondError(res, 500, 'Database error', err);
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json(row);
  });
});

app.post('/api/checkout', checkoutLimiter, validate(checkoutSchema), wrap(async (req, res) => {
  try {
    const { orderId, order } = await orderStore.createCheckout(req.body);

    if (order) {
      sendOrderEmails(order).catch(err => console.error('Order email error:', err));
    }

    res.status(201).json({ message: 'Order processed successfully', orderId });
  } catch (err) {
    return respondError(res, 500, 'Database error creating order', err);
  }
}));

app.post('/api/upload', authedLimiter, verifyToken, upload.array('images', securityConfig.upload.maxFiles), wrap(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  try {
    await verifyUploadedFiles(req.files);
  } catch (err) {
    if (err instanceof UploadRejectedError) {
      return res.status(err.status || 400).json({ error: err.message });
    }
    return respondError(res, 500, 'Upload verification failed', err);
  }
  const urls = req.files.map(file => `/api/uploads/${file.filename}`);
  res.json({ urls });
}));

app.post('/api/products', authedLimiter, verifyToken, validate(productWriteSchema), (req, res) => {
  const p = req.body;
  const stmt = db.prepare('INSERT INTO products (name, price, category, gender, image, description, tagline, details, style_type, colors, quantity, additional_images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(p.name, p.price, p.category, p.gender ?? null, p.image, p.description, p.tagline ?? null, p.details ?? null, p.style_type ?? null, p.colors ?? null, p.quantity ?? 0, p.additional_images ?? null, function (err) {
    if (err) return respondError(res, 500, 'Database error', err);
    res.status(201).json({ id: this.lastID, message: 'Product added successfully' });
  });
  stmt.finalize();
});

app.put('/api/products/:id', authedLimiter, verifyToken, validate(productWriteSchema), (req, res) => {
  const parsed = idParam.safeParse(req.params.id);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid product id' });
  const p = req.body;
  const stmt = db.prepare('UPDATE products SET name = ?, price = ?, category = ?, gender = ?, image = ?, description = ?, tagline = ?, details = ?, style_type = ?, colors = ?, quantity = ?, additional_images = ? WHERE id = ?');
  stmt.run(p.name, p.price, p.category, p.gender ?? null, p.image, p.description, p.tagline ?? null, p.details ?? null, p.style_type ?? null, p.colors ?? null, p.quantity ?? 0, p.additional_images ?? null, parsed.data, function (err) {
    if (err) return respondError(res, 500, 'Database error', err);
    res.json({ message: 'Product updated successfully' });
  });
  stmt.finalize();
});

app.delete('/api/products/:id', authedLimiter, verifyToken, (req, res) => {
  const parsed = idParam.safeParse(req.params.id);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid product id' });
  db.run('DELETE FROM products WHERE id = ?', [parsed.data], function (err) {
    if (err) return respondError(res, 500, 'Database error', err);
    res.json({ message: 'Product deleted successfully' });
  });
});

app.delete('/api/products', authedLimiter, verifyToken, (req, res) => {
  db.run('DELETE FROM products', [], function (err) {
    if (err) return respondError(res, 500, 'Database error', err);
    db.run("DELETE FROM sqlite_sequence WHERE name='products'", [], function (errSeq) {
      if (errSeq) console.error('Error resetting sequence:', errSeq);
      res.json({ message: 'All products cleared and ID sequence reset' });
    });
  });
});

app.get('/api/orders', authedLimiter, verifyToken, wrap(async (req, res) => {
  try {
    res.json(await orderStore.listOrders());
  } catch (err) {
    return respondError(res, 500, 'Database error', err);
  }
}));

app.delete('/api/orders/:id', authedLimiter, verifyToken, wrap(async (req, res) => {
  try {
    await orderStore.deleteOrder(req.params.id);
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    return respondError(res, 500, 'Database error', err);
  }
}));

app.delete('/api/orders', authedLimiter, verifyToken, wrap(async (req, res) => {
  try {
    await orderStore.clearOrders();
    res.json({ message: 'All orders cleared and ID sequence reset' });
  } catch (err) {
    return respondError(res, 500, 'Database error', err);
  }
}));

app.get('/api/payments', authedLimiter, verifyToken, wrap(async (req, res) => {
  try {
    res.json(await orderStore.listPayments());
  } catch (err) {
    return respondError(res, 500, 'Database error', err);
  }
}));

app.delete('/api/payments/:id', authedLimiter, verifyToken, wrap(async (req, res) => {
  try {
    await orderStore.deletePayment(req.params.id);
    res.json({ message: 'Payment deleted successfully' });
  } catch (err) {
    return respondError(res, 500, 'Database error', err);
  }
}));

app.delete('/api/payments', authedLimiter, verifyToken, wrap(async (req, res) => {
  try {
    await orderStore.clearPayments();
    res.json({ message: 'All payments cleared' });
  } catch (err) {
    return respondError(res, 500, 'Database error', err);
  }
}));

app.get('/api/customers', authedLimiter, verifyToken, wrap(async (req, res) => {
  try {
    res.json(await orderStore.listCustomers());
  } catch (err) {
    return respondError(res, 500, 'Database error', err);
  }
}));

app.delete('/api/customers/:id', authedLimiter, verifyToken, wrap(async (req, res) => {
  try {
    await orderStore.deleteCustomer(req.params.id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    return respondError(res, 500, 'Database error', err);
  }
}));

app.delete('/api/customers', authedLimiter, verifyToken, wrap(async (req, res) => {
  try {
    await orderStore.clearCustomers();
    res.json({ message: 'All customers cleared and ID sequence reset' });
  } catch (err) {
    return respondError(res, 500, 'Database error', err);
  }
}));

app.get('/api/customer/orders', authedLimiter, wrap(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ error: 'No token provided' });
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(403).json({ error: 'Malformed authorization header' });

  const secret = process.env.JWT_SECRET;
  if (!secret) return respondError(res, 500, 'Server misconfiguration', new Error('JWT_SECRET missing'));

  jwt.verify(token, secret, async (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const { email, phone } = decoded;
      res.json(await orderStore.listCustomerOrders(email, phone));
    } catch (storeErr) {
      return respondError(res, 500, 'Database error', storeErr);
    }
  });
}));

const distPath = join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('/{*splat}', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  return next(err);
});

app.use(centralErrorHandler());

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
