// ── Per-account auth throttling with exponential backoff ─────────────────────
// Complements the per-IP express-rate-limit tier: an attacker rotating IPs is
// still slowed down per *target account*, and a legitimate user is never hard
// locked out — the wait simply grows (2s, 4s, 8s… capped) and decays away.
//
// State lives in the database (`auth_throttle` table) so it works across
// serverless instances, unlike in-memory counters.

import { db } from './db.js';
import { authBackoff } from './config.js';

function normalizeKey(scope, identifier) {
  return `${scope}:${String(identifier || '').trim().toLowerCase()}`.slice(0, 200);
}

function requiredDelayMs(failures) {
  const { freeAttempts, baseMs, maxMs } = authBackoff;
  if (failures <= freeAttempts) return 0;
  const exponent = Math.min(failures - freeAttempts - 1, 30); // avoid overflow
  return Math.min(baseMs * 2 ** exponent, maxMs);
}

/**
 * Returns `{ blocked, retryAfterSeconds }` for the account identified by
 * scope+identifier. Never throws — a storage error fails open (auth still
 * protected by the per-IP limiter).
 */
export async function checkAuthThrottle(scope, identifier) {
  try {
    const key = normalizeKey(scope, identifier);
    const row = await db.get('SELECT failures, last_failure_at FROM auth_throttle WHERE key = ?', [key]);
    if (!row) return { blocked: false, retryAfterSeconds: 0 };

    const now = Date.now();
    const lastFailure = Number(row.last_failure_at) || 0;

    // Quiet long enough — forget the history.
    if (now - lastFailure > authBackoff.resetMs) {
      await db.run('DELETE FROM auth_throttle WHERE key = ?', [key]);
      return { blocked: false, retryAfterSeconds: 0 };
    }

    const waitUntil = lastFailure + requiredDelayMs(Number(row.failures) || 0);
    if (now < waitUntil) {
      return { blocked: true, retryAfterSeconds: Math.max(1, Math.ceil((waitUntil - now) / 1000)) };
    }
    return { blocked: false, retryAfterSeconds: 0 };
  } catch (err) {
    console.error('[authThrottle] check failed:', err);
    return { blocked: false, retryAfterSeconds: 0 };
  }
}

/** Records one failed attempt (or one send, for OTP dispatch throttling). */
export async function recordAuthFailure(scope, identifier) {
  try {
    const key = normalizeKey(scope, identifier);
    const now = Date.now();
    const row = await db.get('SELECT failures, last_failure_at FROM auth_throttle WHERE key = ?', [key]);
    const stale = row && now - (Number(row.last_failure_at) || 0) > authBackoff.resetMs;
    const failures = row && !stale ? (Number(row.failures) || 0) + 1 : 1;
    await db.run(
      'INSERT OR REPLACE INTO auth_throttle (key, failures, last_failure_at) VALUES (?, ?, ?)',
      [key, failures, now]
    );
  } catch (err) {
    console.error('[authThrottle] record failed:', err);
  }
}

/** Clears the counter after a successful authentication. */
export async function clearAuthFailures(scope, identifier) {
  try {
    await db.run('DELETE FROM auth_throttle WHERE key = ?', [normalizeKey(scope, identifier)]);
  } catch (err) {
    console.error('[authThrottle] clear failed:', err);
  }
}

/**
 * Convenience guard: responds 429 (with Retry-After) and returns true when the
 * account is still inside its backoff window.
 */
export async function rejectIfThrottled(res, scope, identifier) {
  const { blocked, retryAfterSeconds } = await checkAuthThrottle(scope, identifier);
  if (!blocked) return false;
  res.set('Retry-After', String(retryAfterSeconds));
  res.status(429).json({ error: `Too many attempts. Please try again in ${retryAfterSeconds} seconds.` });
  return true;
}
