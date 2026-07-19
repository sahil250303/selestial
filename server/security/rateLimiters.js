import rateLimit from 'express-rate-limit';
import { securityConfig } from './config.js';

const jsonMessage = (message) => (req, res) => {
  res.status(429).json({ error: message });
};

function ipKey(req) {
  const xff = req.headers['x-forwarded-for'];
  const forwarded = typeof xff === 'string' ? xff.split(',')[0].trim() : undefined;
  return forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
}

function accountKey(req) {
  const candidate = req.body?.email || req.body?.phone || req.body?.username;
  if (!candidate) return null;
  return String(candidate).trim().toLowerCase();
}

function makeLimiter({ max, keyPrefix, keyGenerator, message }) {
  return rateLimit({
    windowMs: securityConfig.rateLimit.windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: jsonMessage(message),
    keyGenerator: (req) => `${keyPrefix}:${keyGenerator(req)}`,
    skip: (req) => keyGenerator(req) === null
  });
}

export const authIpLimiter = makeLimiter({
  max: securityConfig.rateLimit.authIpMax,
  keyPrefix: 'auth-ip',
  keyGenerator: ipKey,
  message: 'Too many auth attempts from this IP. Slow down and try again later.'
});

export const authAccountLimiter = makeLimiter({
  max: securityConfig.rateLimit.authAccountMax,
  keyPrefix: 'auth-account',
  keyGenerator: accountKey,
  message: 'Too many attempts on this account. Slow down and try again later.'
});

export const otpIpLimiter = makeLimiter({
  max: securityConfig.rateLimit.otpIpMax,
  keyPrefix: 'otp-ip',
  keyGenerator: ipKey,
  message: 'Too many OTP requests from this IP. Try again later.'
});

export const otpAccountLimiter = makeLimiter({
  max: securityConfig.rateLimit.otpAccountMax,
  keyPrefix: 'otp-account',
  keyGenerator: accountKey,
  message: 'Too many OTP requests for this number. Try again later.'
});

export const publicLimiter = makeLimiter({
  max: securityConfig.rateLimit.publicMax,
  keyPrefix: 'public',
  keyGenerator: ipKey,
  message: 'Too many requests. Slow down.'
});

export const authedLimiter = makeLimiter({
  max: securityConfig.rateLimit.authedUserMax,
  keyPrefix: 'authed',
  keyGenerator: ipKey,
  message: 'Too many requests. Slow down.'
});

export const checkoutLimiter = makeLimiter({
  max: securityConfig.rateLimit.checkoutIpMax,
  keyPrefix: 'checkout',
  keyGenerator: ipKey,
  message: 'Too many checkout attempts. Slow down.'
});

export const authLimiters = [authIpLimiter, authAccountLimiter];
export const otpLimiters = [otpIpLimiter, otpAccountLimiter];
