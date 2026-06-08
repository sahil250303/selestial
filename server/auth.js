import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import twilio from 'twilio';
import { db } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET env variable is not set. Generate: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
}
const JWT_SECRET = process.env.JWT_SECRET;

export const loginAdmin = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, message: 'Login successful' });
  });
};

export const verifyToken = (req, res, next) => {
  const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'No token provided' });
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
  const param = email || phone;
  if (!param) return res.status(400).json({ error: 'Email or Phone is required' });
  const query = email ? 'SELECT id FROM customers WHERE email = ?' : 'SELECT id FROM customers WHERE phone = ?';
  db.get(query, [param], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (row) return res.status(400).json({ error: 'User already exists' });
    const hashedPassword = password ? bcrypt.hashSync(password, 10) : null;
    const stmt = db.prepare('INSERT INTO customers (name, email, phone, password, auth_provider, join_date) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(name, email || null, phone || null, hashedPassword, auth_provider || 'local', date, function(err) {
      if (err) return res.status(500).json({ error: 'Database error creating customer' });
      const token = jwt.sign({ id: this.lastID, email, phone }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ token, message: 'Signup successful', user: { name, email, phone } });
    });
    stmt.finalize();
  });
};

export const loginCustomer = (req, res) => {
  const { email, phone, password, auth_provider } = req.body;
  const param = email || phone;
  if (!param) return res.status(400).json({ error: 'Email or Phone is required' });
  const query = email ? 'SELECT * FROM customers WHERE email = ?' : 'SELECT * FROM customers WHERE phone = ?';
  db.get(query, [param], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (auth_provider !== 'google' && auth_provider !== 'otp') {
      if (!password || !user.password) return res.status(401).json({ error: 'Invalid credentials' });
      if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, message: 'Login successful', user: { name: user.name, email: user.email, phone: user.phone, address: user.address || null } });
  });
};

export const loginWithGoogle = async (req, res) => {
  const { credential, googleUser } = req.body;
  if (!credential) return res.status(400).json({ error: 'Google access token is required' });
  try {
    const gRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${credential}` },
    });
    if (!gRes.ok) return res.status(401).json({ error: 'Invalid or expired Google token' });
    const profile = await gRes.json();
    const email = profile.email || googleUser?.email;
    const name = profile.name || googleUser?.name || 'Selestial Member';
    if (!email) return res.status(400).json({ error: 'Could not retrieve email from Google' });
    const date = new Date().toISOString().split('T')[0];
    db.get('SELECT * FROM customers WHERE email = ?', [email], (err, user) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (user) {
        const token = jwt.sign({ id: user.id, email: user.email, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token, message: 'Login successful', user: { name: user.name, email: user.email, phone: user.phone, address: user.address || null } });
      }
      const stmt = db.prepare('INSERT INTO customers (name, email, auth_provider, join_date) VALUES (?, ?, ?, ?)');
      stmt.run(name, email, 'google', date, function(insertErr) {
        if (insertErr) return res.status(500).json({ error: 'Database error creating customer' });
        const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, message: 'Signup successful', user: { name, email, phone: null } });
      });
      stmt.finalize();
    });
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.status(401).json({ error: 'Google authentication failed. Please try again.' });
  }
};

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export const sendOtp = (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone is required' });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  db.run('INSERT OR REPLACE INTO otp_sessions (phone, otp, expires_at) VALUES (?, ?, ?)', [phone, otp, expiresAt], async (err) => {
    if (err) return res.status(500).json({ error: 'Database error saving OTP session' });
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        await twilioClient.messages.create({
          body: `Your Selestial verification code is: ${otp}. Valid for 10 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone,
        });
        res.json({ message: 'OTP sent successfully to your mobile' });
      } catch (smsErr) {
        console.error('Twilio error:', smsErr);
        res.status(500).json({ error: 'Failed to send OTP SMS. Check Twilio configuration.' });
      }
    } else {
      console.log(`[Dev OTP] Code for ${phone}: ${otp}`);
      res.json({ message: 'OTP sent (dev mode — check server console)' });
    }
  });
};

export const verifyOtp = (req, res) => {
  const { phone, otp, name } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required' });
  db.get('SELECT * FROM otp_sessions WHERE phone = ?', [phone], (err, session) => {
    if (err) return res.status(500).json({ error: 'Database error verifying OTP' });
    if (!session) return res.status(400).json({ error: 'No active OTP session found' });
    if (Date.now() > session.expires_at) return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    if (session.otp !== otp) return res.status(401).json({ error: 'Invalid OTP' });
    db.run('DELETE FROM otp_sessions WHERE phone = ?', [phone]);
    db.get('SELECT * FROM customers WHERE phone = ?', [phone], (err2, user) => {
      if (err2) return res.status(500).json({ error: 'Database error looking up user' });
      if (user) {
        const token = jwt.sign({ id: user.id, email: user.email, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token, message: 'Login successful', user: { name: user.name, email: user.email, phone: user.phone, address: user.address || null } });
      }
      if (!name) return res.status(400).json({ error: 'Name is required to create a new account' });
      const date = new Date().toISOString().split('T')[0];
      const stmt = db.prepare('INSERT INTO customers (name, phone, auth_provider, join_date) VALUES (?, ?, ?, ?)');
      stmt.run(name, phone, 'otp', date, function(insertErr) {
        if (insertErr) return res.status(500).json({ error: 'Database error creating customer' });
        const token = jwt.sign({ id: this.lastID, phone }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, message: 'Sig