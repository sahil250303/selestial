// ── Customer session — single source of truth ────────────────────────────────
// The customer session is persisted across three legacy localStorage keys:
//   • customerToken  — the JWT used for API calls
//   • customerData   — JSON-encoded user object { name, email, phone, ... }
//   • customerName   — convenience copy of the display name (read by the Navbar)
//
// Reading these keys ad-hoc in each component caused two production bugs:
//   1. A corrupt/partial `customerData` value (e.g. the literal string
//      "undefined") made an un-guarded `JSON.parse` throw, which on a route with
//      no error boundary rendered a permanent BLANK PAGE.
//   2. The Navbar showed the "Profile" link based on `customerName` alone while
//      Profile required `customerData` + `customerToken`, so any drift between
//      the keys produced a link that led nowhere.
//
// All reads/writes now go through this module so the three keys stay in sync and
// a bad value self-heals (it is cleared and treated as "logged out") instead of
// crashing the app.

const TOKEN_KEY = 'customerToken';
const DATA_KEY = 'customerData';
const NAME_KEY = 'customerName';

/**
 * Returns the active customer session, or `null` when logged out.
 * Never throws: malformed storage is cleared and treated as logged-out.
 * @returns {{ token: string, user: { name: string, email?: string, phone?: string } } | null}
 */
export function getCustomerSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawData = localStorage.getItem(DATA_KEY);

    // Both pieces are required for a usable session.
    if (!token || !rawData || rawData === 'undefined' || rawData === 'null') {
      return null;
    }

    const user = JSON.parse(rawData);
    if (!user || typeof user !== 'object' || !user.name) {
      // Shape we never expect — purge it so the app falls back to logged-out.
      clearCustomerSession();
      return null;
    }

    return { token, user };
  } catch {
    // Corrupt JSON, etc. Self-heal rather than crash the rendering route.
    clearCustomerSession();
    return null;
  }
}

/** Convenience accessor for just the bearer token (or null). */
export function getCustomerToken() {
  return getCustomerSession()?.token ?? null;
}

/**
 * Persists a session returned by the auth API. Validates the backend payload so
 * we never write `"undefined"` into storage.
 * @param {{ token: string, user: { name: string, email?: string, phone?: string } }} payload
 * @returns {{ token: string, user: object }}
 */
export function setCustomerSession(payload) {
  const token = payload?.token;
  const user = payload?.user;

  if (!token || !user || typeof user !== 'object' || !user.name) {
    throw new Error('Authentication response was incomplete. Please try again.');
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(DATA_KEY, JSON.stringify(user));
  localStorage.setItem(NAME_KEY, user.name);
  return { token, user };
}

/** Clears every key that makes up a customer session. */
export function clearCustomerSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(DATA_KEY);
  localStorage.removeItem(NAME_KEY);
}

/** True when a valid, parseable session exists. */
export function isLoggedIn() {
  return getCustomerSession() !== null;
}
