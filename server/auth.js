import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'selestial-super-secret-key-2026';

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
  const { name, email, phone, password, auth_provider } = req.body;
  const date = new Date().toISOString().split('T')[0];
  
  if (!name) return res.status(400).json({ error: 'Name is required' });
  
  // Check if user already exists
  const query = email ? "SELECT id FROM customers WHERE email = ?" : "SELECT id FROM customers WHERE phone = ?";
  const param = email || phone;
  
  if (!param) return res.status(400).json({ error: 'Email or Phone is required' });

  db.get(query, [param], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (row) return res.status(400).json({ error: 'User already exists' });
    
    let hashedPassword = null;
    if (password) {
      hashedPassword = bcrypt.hashSync(password, 10);
    }
    
    const stmt = db.prepare("INSERT INTO customers (name, email, phone, password, auth_provider, join_date) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run(name, email || null, phone || null, hashedPassword, auth_provider || 'local', date, function (err) {
      if (err) return res.status(500).json({ error: 'Database error creating customer' });
      
      const token = jwt.sign({ id: this.lastID, email, phone }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ token, message: 'Signup successful', user: { name, email, phone } });
    });
    stmt.finalize();
  });
};

export const loginCustomer = (req, res) => {
  const { email, phone, password, auth_provider } = req.body;
  
  const query = email ? "SELECT * FROM customers WHERE email = ?" : "SELECT * FROM customers WHERE phone = ?";
  const param = email || phone;
  
  if (!param) return res.status(400).json({ error: 'Email or Phone is required' });

  db.get(query, [param], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'User not found' });
    
    // For local auth or standard email/phone with password
    if (auth_provider !== 'google' && auth_provider !== 'otp') {
      if (!password || !user.password) {
         return res.status(401).json({ error: 'Invalid credentials' });
      }
      const isValid = bcrypt.compareSync(password, user.password);
      if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
    }
    // If it's OTP or Google, we assume the frontend verified it and we just login the user
    
    const token = jwt.sign({ id: user.id, email: user.email, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, message: 'Login successful', user: { name: user.name, email: user.email, phone: user.phone } });
  });
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

    // Since we also allowed 1234 for testing in the frontend mock previously, we could allow it here if needed,
    // but the user asked for real tokens, so we require the actual OTP matched.
    if (session.otp !== otp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    // OTP is valid. Now login or signup the user.
    // Delete the session
    db.run(`DELETE FROM otp_sessions WHERE phone = ?`, [phone]);

    db.get(`SELECT * FROM customers WHERE phone = ?`, [phone], (err, user) => {
      if (err) return res.status(500).json({ error: 'Database error looking up user' });
      
      if (user) {
        // Login existing user
        const token = jwt.sign({ id: user.id, email: user.email, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, message: 'Login successful', user: { name: user.name, email: user.email, phone: user.phone } });
      } else {
        // Signup new user
        if (!name) {
          // If no name was provided, default it or require it. For simplicity, default it if missing.
          return res.status(400).json({ error: 'Name is required to create a new account' });
        }
        const date = new Date().toISOString().split('T')[0];
        const stmt = db.prepare("INSERT INTO customers (name, phone, auth_provider, join_date) VALUES (?, ?, ?, ?)");
        stmt.run(name, phone, 'otp', date, function (err) {
          if (err) return res.status(500).json({ error: 'Database error creating customer' });
          
          const token = jwt.sign({ id: this.lastID, phone }, JWT_SECRET, { expiresIn: '7d' });
          res.status(201).json({ token, message: 'Signup successful', user: { name, phone } });
        });
        stmt.finalize();
      }
    });
  });
};
