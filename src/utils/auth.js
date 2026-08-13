// ── Customer session ──────────────────────────────────────────────────────────
// The JWT now lives in an httpOnly cookie set by the server, so it is NOT readable
// by JavaScript (this removes the XSS token-theft risk of storing it in
// localStorage). We persist only the user PROFILE locally, purely for UI
// (greeting, checkout pre-fill). API calls authenticate via the cookie, which the
// browser sends automatically on same-origin requests.

const DATA_KEY = 'customerData';
const NAME_KEY = 'customerName';

/**
 * Returns the active customer session ({ user }) or null when logged out.
 * Never throws: malformed storage is cleared and treated as logged-out.
 */
export function getCustomerSession() {
  try {
    const rawData = localStorage.getItem(DATA_KEY);
    if (!rawData || rawData === 'undefined' || rawData === 'null') return null;
    const user = JSON.parse(rawData);
    if (!user || typeof user !== 'object' || !user.name) {
      clearCustomerSession();
      return null;
    }
    return { user };
  } catch {
    clearCustomerSession();
    return null;
  }
}

/**
 * Deprecated. The JWT is no longer accessible to JavaScript (httpOnly cookie),
 * so this always returns null. API calls rely on the cookie instead of a bearer
 * header. Kept so existing imports don't break.
 */
export function getCustomerToken() {
  return null;
}

/** Persists the user profile returned by the auth API (token is ignored — it's a cookie now). */
export function setCustomerSession(payload) {
  const user = payload?.user;
  if (!user || typeof user !== 'object' || !user.name) {
    throw new Error('Authentication response was incomplete. Please try again.');
  }
  localStorage.setItem(DATA_KEY, JSON.stringify(user));
  localStorage.setItem(NAME_KEY, user.name);
  return { user };
}

/** Clears the locally-stored profile (the server clears the httpOnly cookie on logout). */
export function clearCustomerSession() {
  localStorage.removeItem('customerToken'); // legacy key cleanup
  localStorage.removeItem(DATA_KEY);
  localStorage.removeItem(NAME_KEY);
}

/** True when a usable profile is stored (the cookie is the real authenticator). */
export function isLoggedIn() {
  return getCustomerSession() !== null;
}
