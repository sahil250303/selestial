import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import dotenv from 'dotenv';
import { respondError, wrap } from './security/errorHandler.js';

dotenv.config({ quiet: true });

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

export const loginAdmin = wrap((req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err, user) => {
    if (err) return respondError(res, 500, 'Database error', err);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, getJwtSecret(), { expiresIn: '24h' });
    res.json({ token, message: 'Login successful' });
  });
});

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ error: 'No token provided' });

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(403).json({ error: 'Malformed authorization header' });

  jwt.verify(token, getJwtSecret(), (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = decoded.id;
    req.tokenPayload = decoded;
    next();
  });
};

export const signupCustomer = wrap((req, res) => {
  const { name, email, phone, password, auth_provider } = req.body;
  const date = new Date().toISOString().split('T')[0];

  const query = email ? 'SELECT id FROM customers WHERE email = ?' : 'SELECT id FROM customers WHERE phone = ?';
  const param = email || phone;

  db.get(query, [param], (err, row) => {
    if (err) return respondError(res, 500, 'Database error', err);
    if (row) return res.status(400).json({ error: 'User already exists' });

    let hashedPassword = null;
    if (password) {
      hashedPassword = bcrypt.hashSync(password, 10);
    }

    const stmt = db.prepare('INSERT INTO customers (name, email, phone, password, auth_provider, join_date) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(name, email || null, phone || null, hashedPassword, auth_provider || 'local', date, function (insertErr) {
      if (insertErr) return respondError(res, 500, 'Database error creating customer', insertErr);

      const token = jwt.sign({ id: this.lastID, email, phone }, getJwtSecret(), { expiresIn: '7d' });
      res.status(201).json({ token, message: 'Signup successful', user: { name, email, phone } });
    });
    stmt.finalize();
  });
});

export const loginCustomer = wrap((req, res) => {
  const { email, phone, password, auth_provider } = req.body;

  const query = email ? 'SELECT * FROM customers WHERE email = ?' : 'SELECT * FROM customers WHERE phone = ?';
  const param = email || phone;

  db.get(query, [param], (err, user) => {
    if (err) return respondError(res, 500, 'Database error', err);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (auth_provider !== 'google' && auth_provider !== 'otp') {
      if (!password || !user.password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const isValid = bcrypt.compareSync(password, user.password);
      if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, phone: user.phone }, getJwtSecret(), { expiresIn: '7d' });
    res.json({ token, message: 'Login successful', user: { name: user.name, email: user.email, phone: user.phone } });
  });
});

import twilio from 'twilio';

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export const sendOtp = wrap((req, res) => {
  const { phone } = req.body;

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  db.run('INSERT OR REPLACE INTO otp_sessions (phone, otp, expires_at) VALUES (?, ?, ?)', [phone, otp, expiresAt], async (err) => {
    if (err) return respondError(res, 500, 'Database error saving OTP session', err);

    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        await twilioClient.messages.create({
          body: `Your Selestial verification code is: ${otp}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        });
        res.json({ message: 'OTP sent successfully to your mobile' });
      } catch (smsErr) {
        return respondError(res, 500, 'Failed to send OTP SMS', smsErr);
      }
    } else {
      console.log(`[Mock Twilio] OTP for ${phone} is ${otp}`);
      res.json({ message: 'OTP sent (Mock mode: check backend logs for OTP)' });
    }
  });
});

export const verifyOtp = wrap((req, res) => {
  const { phone, otp, name } = req.body;

  db.get('SELECT * FROM otp_sessions WHERE phone = ?', [phone], (err, session) => {
    if (err) return respondError(res, 500, 'Database error verifying OTP', err);
    if (!session) return res.status(400).json({ error: 'No active OTP session found' });

    if (Date.now() > session.expires_at) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (session.otp !== otp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    db.run('DELETE FROM otp_sessions WHERE phone = ?', [phone]);

    db.get('SELECT * FROM customers WHERE phone = ?', [phone], (lookupErr, user) => {
      if (lookupErr) return respondError(res, 500, 'Database error looking up user', lookupErr);

      if (user) {
        const token = jwt.sign({ id: user.id, email: user.email, phone: user.phone }, getJwtSecret(), { expiresIn: '7d' });
        return res.json({ token, message: 'Login successful', user: { name: user.name, email: user.email, phone: user.phone } });
      }

      if (!name) {
        return res.status(400).json({ error: 'Name is required to create a new account' });
      }
      const date = new Date().toISOString().split('T')[0];
      const stmt = db.prepare('INSERT INTO customers (name, phone, auth_provider, join_date) VALUES (?, ?, ?, ?)');
      stmt.run(name, phone, 'otp', date, function (insertErr) {
        if (insertErr) return respondError(res, 500, 'Database error creating customer', insertErr);

        const token = jwt.sign({ id: this.lastID, phone }, getJwtSecret(), { expiresIn: '7d' });
        res.status(201).json({ token, message: 'Signup successful', user: { name, phone } });
      });
      stmt.finalize();
    });
  });
});
