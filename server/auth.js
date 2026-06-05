import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { db } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'selestial-super-secret-key-2026';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function signCustomerToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email || null, phone: user.phone || null },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    picture: user.picture || null,
    auth_provider: user.auth_provider,
    join_date: user.join_date
  };
}

export const loginAdmin = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get("SELECT * FROM admin_users WHERE username = ?", [username], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, message: 'Login successful' });
  });
};

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1]; // Bearer <token>
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = decoded.id;
    next();
  });
};

export const signupCustomer = (req, res) => {
  const { name, email, password } = req.body;
  const date = new Date().toISOString().split('T')[0];

  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const normalizedEmail = email.trim().toLowerCase();

  db.get("SELECT id FROM customers WHERE email = ?", [normalizedEmail], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (row) return res.status(409).json({ error: 'An account with that email already exists' });

    const hashedPassword = bcrypt.hashSync(password, 10);

    const stmt = db.prepare(
      "INSERT INTO customers (name, email, password, auth_provider, join_date) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(name.trim(), normalizedEmail, hashedPassword, 'local', date, function (err) {
      if (err) return res.status(500).json({ error: 'Database error creating customer' });

      const created = {
        id: this.lastID,
        name: name.trim(),
        email: normalizedEmail,
        phone: null,
        picture: null,
        auth_provider: 'local',
        join_date: date
      };
      const token = signCustomerToken(created);
      res.status(201).json({ token, message: 'Signup successful', user: publicUser(created) });
    });
    stmt.finalize();
  });
};

export const loginCustomer = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  db.get("SELECT * FROM customers WHERE email = ?", [normalizedEmail], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signCustomerToken(user);
    res.json({ token, message: 'Login successful', user: publicUser(user) });
  });
};

export const authenticateGoogle = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Google credential is required' });
  }
  if (!googleClient) {
    return res.status(500).json({ error: 'Google authentication is not configured on the server' });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    payload = ticket.getPayload();
  } catch (err) {
    console.error('Google ID token verification failed:', err);
    return res.status(401).json({ error: 'Invalid Google credential' });
  }

  if (!payload || !payload.email || payload.email_verified === false) {
    return res.status(401).json({ error: 'Google account email is not verified' });
  }

  const googleId = payload.sub;
  const email = payload.email.trim().toLowerCase();
  const name = payload.name || payload.given_name || email.split('@')[0];
  const picture = payload.picture || null;
  const date = new Date().toISOString().split('T')[0];

  db.get(
    "SELECT * FROM customers WHERE google_id = ? OR email = ?",
    [googleId, email],
    (err, existing) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      const respondWithUser = (user) => {
        const token = signCustomerToken(user);
        res.json({ token, message: 'Login successful', user: publicUser(user) });
      };

      if (existing) {
        // Link Google identity to an existing local account on first Google sign-in.
        if (!existing.google_id || existing.picture !== picture || existing.auth_provider === 'local') {
          db.run(
            "UPDATE customers SET google_id = ?, picture = COALESCE(?, picture), auth_provider = CASE WHEN auth_provider = 'local' THEN 'local+google' ELSE auth_provider END WHERE id = ?",
            [googleId, picture, existing.id],
            (updateErr) => {
              if (updateErr) console.error('Google account link update failed:', updateErr);
              respondWithUser({ ...existing, google_id: googleId, picture: picture || existing.picture });
            }
          );
          return;
        }
        respondWithUser(existing);
        return;
      }

      const stmt = db.prepare(
        "INSERT INTO customers (name, email, auth_provider, google_id, picture, join_date) VALUES (?, ?, ?, ?, ?, ?)"
      );
      stmt.run(name, email, 'google', googleId, picture, date, function (insertErr) {
        if (insertErr) return res.status(500).json({ error: 'Database error creating customer' });
        respondWithUser({
          id: this.lastID,
          name,
          email,
          phone: null,
          picture,
          auth_provider: 'google',
          google_id: googleId,
          join_date: date
        });
      });
      stmt.finalize();
    }
  );
};

import twilio from 'twilio';

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export const sendOtp = (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone is required' });

  // Generate a 4 digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

  db.run(`INSERT OR REPLACE INTO otp_sessions (phone, otp, expires_at) VALUES (?, ?, ?)`, [phone, otp, expiresAt], async (err) => {
    if (err) return res.status(500).json({ error: 'Database error saving OTP session' });

    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        await twilioClient.messages.create({
          body: `Your Selestial verification code is: ${otp}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        });
        res.json({ message: 'OTP sent successfully to your mobile' });
      } catch (smsErr) {
        console.error("Twilio error:", smsErr);
        res.status(500).json({ error: 'Failed to send OTP SMS. Check Twilio config.' });
      }
    } else {
      console.log(`[Mock Twilio] OTP for ${phone} is ${otp}`);
      // Fallback for when Twilio is not configured, we send a successful response but log the OTP
      res.json({ message: 'OTP sent (Mock mode: check backend logs for OTP)' });
    }
  });
};

export const verifyOtp = (req, res) => {
  const { phone, otp, name } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required' });

  db.get(`SELECT * FROM otp_sessions WHERE phone = ?`, [phone], (err, session) => {
    if (err) return res.status(500).json({ error: 'Database error verifying OTP' });
    if (!session) return res.status(400).json({ error: 'No active OTP session found' });

    if (Date.now() > session.expires_at) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (session.otp !== otp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    // OTP is valid. Now login or signup the user.
    db.run(`DELETE FROM otp_sessions WHERE phone = ?`, [phone]);

    db.get(`SELECT * FROM customers WHERE phone = ?`, [phone], (err, user) => {
      if (err) return res.status(500).json({ error: 'Database error looking up user' });

      if (user) {
        const token = signCustomerToken(user);
        res.json({ token, message: 'Login successful', user: publicUser(user) });
      } else {
        if (!name) {
          return res.status(400).json({ error: 'Name is required to create a new account' });
        }
        const date = new Date().toISOString().split('T')[0];
        const stmt = db.prepare("INSERT INTO customers (name, phone, auth_provider, join_date) VALUES (?, ?, ?, ?)");
        stmt.run(name, phone, 'otp', date, function (err) {
          if (err) return res.status(500).json({ error: 'Database error creating customer' });

          const created = {
            id: this.lastID,
            name,
            email: null,
            phone,
            picture: null,
            auth_provider: 'otp',
            join_date: date
          };
          const token = signCustomerToken(created);
          res.status(201).json({ token, message: 'Signup successful', user: publicUser(created) });
        });
        stmt.finalize();
      }
    });
  });
};
