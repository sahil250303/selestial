import dotenv from 'dotenv';

dotenv.config({ quiet: true });

function readInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer (got "${raw}")`);
  }
  return value;
}

function readBool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return /^(1|true|yes|on)$/i.test(raw);
}

function readSize(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const match = /^\s*(\d+)\s*(b|kb|mb|gb)?\s*$/i.exec(raw);
  if (!match) {
    throw new Error(`Environment variable ${name} must be a size like "5mb" (got "${raw}")`);
  }
  const number = Number.parseInt(match[1], 10);
  const unit = (match[2] || 'b').toLowerCase();
  const multiplier = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 }[unit];
  return number * multiplier;
}

function readList(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export const securityConfig = {
  rateLimit: {
    windowMs: readInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    authIpMax: readInt('RATE_LIMIT_AUTH_IP_MAX', 20),
    authAccountMax: readInt('RATE_LIMIT_AUTH_ACCOUNT_MAX', 10),
    otpIpMax: readInt('RATE_LIMIT_OTP_IP_MAX', 8),
    otpAccountMax: readInt('RATE_LIMIT_OTP_ACCOUNT_MAX', 5),
    publicMax: readInt('RATE_LIMIT_PUBLIC_MAX', 300),
    authedUserMax: readInt('RATE_LIMIT_AUTHED_MAX', 600),
    checkoutIpMax: readInt('RATE_LIMIT_CHECKOUT_IP_MAX', 30)
  },
  upload: {
    maxFileBytes: readSize('UPLOAD_MAX_FILE_BYTES', '5mb'),
    maxFiles: readInt('UPLOAD_MAX_FILES', 10),
    allowedMimeTypes: readList('UPLOAD_ALLOWED_MIME', [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ])
  },
  errors: {
    exposeDetails: readBool('EXPOSE_ERROR_DETAILS', false)
  },
  boot: {
    requireStrongSecrets: readBool('REQUIRE_STRONG_SECRETS', false)
  }
};

export function assertBootSecrets({ logger = console } = {}) {
  const problems = [];

  if (!process.env.JWT_SECRET) {
    problems.push('JWT_SECRET is not set');
  } else if (process.env.JWT_SECRET.length < 32) {
    problems.push('JWT_SECRET must be at least 32 characters');
  }

  if (!process.env.ADMIN_PASSWORD) {
    problems.push('ADMIN_PASSWORD is not set');
  } else if (process.env.ADMIN_PASSWORD.length < 12) {
    problems.push('ADMIN_PASSWORD must be at least 12 characters');
  }

  if (problems.length === 0) return { ok: true, problems: [] };

  if (securityConfig.boot.requireStrongSecrets) {
    for (const problem of problems) logger.error(`[boot] ${problem}`);
    throw new Error(`Refusing to boot: ${problems.join('; ')}`);
  }

  for (const problem of problems) logger.warn(`[boot] ${problem} (development mode — continuing)`);
  return { ok: false, problems };
}
