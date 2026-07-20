// ── Security configuration ────────────────────────────────────────────────────
// Every threshold is overridable through an environment variable so limits can
// be tuned per-deployment without a code change. Values document their unit in
// the name (MS = milliseconds).

function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

// Per-IP fixed-window limits (express-rate-limit). Three tiers:
//   • auth      — strict: credential guessing is slow by design
//   • public    — moderate: anonymous browsing / storefront traffic
//   • authed    — loose: signed-in users and admin dashboard actions
export const rateLimits = {
  auth: {
    windowMs: envInt('RATE_LIMIT_AUTH_WINDOW_MS', 15 * 60 * 1000),
    max: envInt('RATE_LIMIT_AUTH_MAX', 10),
  },
  otpSend: {
    windowMs: envInt('RATE_LIMIT_OTP_SEND_WINDOW_MS', 10 * 60 * 1000),
    max: envInt('RATE_LIMIT_OTP_SEND_MAX', 5),
  },
  otpVerify: {
    windowMs: envInt('RATE_LIMIT_OTP_VERIFY_WINDOW_MS', 10 * 60 * 1000),
    max: envInt('RATE_LIMIT_OTP_VERIFY_MAX', 10),
  },
  public: {
    windowMs: envInt('RATE_LIMIT_PUBLIC_WINDOW_MS', 15 * 60 * 1000),
    max: envInt('RATE_LIMIT_PUBLIC_MAX', 300),
  },
  authed: {
    windowMs: envInt('RATE_LIMIT_AUTHED_WINDOW_MS', 15 * 60 * 1000),
    max: envInt('RATE_LIMIT_AUTHED_MAX', 1000),
  },
  checkout: {
    windowMs: envInt('RATE_LIMIT_CHECKOUT_WINDOW_MS', 60 * 1000),
    max: envInt('RATE_LIMIT_CHECKOUT_MAX', 5),
  },
  newsletter: {
    windowMs: envInt('RATE_LIMIT_NEWSLETTER_WINDOW_MS', 60 * 60 * 1000),
    max: envInt('RATE_LIMIT_NEWSLETTER_MAX', 5),
  },
  review: {
    windowMs: envInt('RATE_LIMIT_REVIEW_WINDOW_MS', 60 * 60 * 1000),
    max: envInt('RATE_LIMIT_REVIEW_MAX', 10),
  },
  upload: {
    windowMs: envInt('RATE_LIMIT_UPLOAD_WINDOW_MS', 60 * 60 * 1000),
    max: envInt('RATE_LIMIT_UPLOAD_MAX', 60),
  },
};

// Per-account exponential backoff for auth routes. After `freeAttempts`
// consecutive failures, the next attempt is only accepted once
// baseMs * 2^(failures - freeAttempts) has elapsed since the last failure,
// capped at maxMs — a growing delay, never a permanent lockout. Counters are
// forgotten entirely after resetMs of quiet, and cleared on success.
export const authBackoff = {
  freeAttempts: envInt('AUTH_BACKOFF_FREE_ATTEMPTS', 5),
  baseMs: envInt('AUTH_BACKOFF_BASE_MS', 2000),
  maxMs: envInt('AUTH_BACKOFF_MAX_MS', 15 * 60 * 1000),
  resetMs: envInt('AUTH_BACKOFF_RESET_MS', 60 * 60 * 1000),
};

export const passwordMinLength = envInt('PASSWORD_MIN_LENGTH', 8);

// JSON body size cap (express.json). 100kb default matches Express but is now
// explicit and tunable.
export const jsonBodyLimit = process.env.JSON_BODY_LIMIT || '100kb';

// Upload constraints.
export const uploadLimits = {
  maxFiles: envInt('UPLOAD_MAX_FILES', 10),
  maxFileSizeBytes: envInt('UPLOAD_MAX_FILE_SIZE_BYTES', 10 * 1024 * 1024),
};
