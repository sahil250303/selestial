// ── Google OAuth configuration ───────────────────────────────────────────────
// Single place that decides whether "Continue with Google" is usable.
//
// A valid Google client ID always ends with ".apps.googleusercontent.com".
// The production bug was that VITE_GOOGLE_CLIENT_ID was missing from every .env
// file, so the build baked in an EMPTY id and the account chooser could never
// open. Centralising the check here lets main.jsx mount the provider and Auth.jsx
// hide the button from the same source of truth — with no circular imports.
const rawClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

export const googleClientId = rawClientId;
export const googleEnabled = rawClientId.endsWith('.apps.googleusercontent.com');
