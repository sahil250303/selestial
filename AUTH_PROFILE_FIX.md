# Selestial — Profile Blank-Page & Google Login Fix

Scope: fix (1) the blank Profile page and (2) Google sign-in so users pick an
account from the chooser. No database schema changes. Integrates with the
existing profile system (address, mobile, order history, favorites).

---

## Findings

**F1 — The Google client ID is missing from every environment file.**
`src/main.jsx` reads `import.meta.env.VITE_GOOGLE_CLIENT_ID || ''`, but that
variable exists only in `.env.example`. It is absent from `.env`, `.env.local`,
and `.env.production.local`. Proof it never reached the bundle:

```
$ grep -ro "apps.googleusercontent.com" dist/ | wc -l
0
```

So `GoogleOAuthProvider` was initialised with `clientId=""`. With an empty ID the
Google Identity Services library cannot build a valid OAuth request, so clicking
"Continue with Google" never opens the account chooser — it fails and hits
`onError` ("sign-in cancelled or failed").

**F2 — `useGoogleLogin` never requested the account chooser.** It was called with
no `prompt`, so even once configured Google may silently reuse the last session
instead of showing the list. And `setLoading(true)` fired on click with no
`onNonOAuthError` handler, so dismissing the popup left the button stuck on
"Processing…".

**F3 — Any bad value blanks the whole app, permanently.** There was no React
error boundary anywhere in `App.jsx`, and `Profile.jsx` parsed localStorage
without guarding it:

```js
// old Profile.jsx
setUser(JSON.parse(userData));   // throws if userData === "undefined"
```

`JSON.parse("undefined")` throws (verified). The throw happens inside the effect,
so `setUser` never runs; the component is stuck at `if (!user) return null` — a
**permanent blank page** with no error and no recovery. A second instance:
`JSON.parse(order.items)` during render (line 167) crashes the page if any order's
items are ever non-string.

**F4 — Auth state was split across three unsynced keys.** The Navbar showed the
"Profile" link based on `customerName` alone, while `Profile.jsx` required
`customerData` **and** `customerToken`. Any drift between the keys (partial
logout, an older build, one tab clearing storage) produced a visible "Profile"
link that led straight to the blank/redirect path.

---

## Reasoning

Blank profile page = F3 + F4 together. The user has a `customerName` (so the
Navbar shows "Profile"), but `customerData`/`customerToken` are missing, stale, or
malformed. Clicking "Profile" mounts `Profile.jsx`, the unguarded `JSON.parse`
throws (or `user` stays null), and with no error boundary the route renders
nothing. The white screen is the absence of any fallback, not a styling problem.

Google chooser not appearing = F1 primarily, F2 secondarily. The button rendered
unconditionally even though OAuth could not initialise (empty client ID), so the
user clicked a control that was structurally incapable of opening the popup. Even
after the ID is set, without `prompt: 'select_account'` Google can skip the list.

Both are configuration/robustness defects in the auth flow. Neither needs a schema
change: the `customers` table already holds name/email/phone; address already
lives on `orders.address`; favorites already live in the `selestialWishlist`
store.

---

## Recommendation — what changed (permanent fixes)

| File | Change |
|------|--------|
| `src/utils/auth.js` *(new)* | Single source of truth for the session. `getCustomerSession()` parses storage safely and **self-heals** (clears bad data, returns "logged out") instead of throwing. `setCustomerSession()` validates the API payload so `"undefined"` can never be written. |
| `src/components/ErrorBoundary.jsx` *(new)* | Catches any render-time throw and shows a "Try again / Go home" recovery panel — kills the white-screen failure mode for every page, not just Profile. |
| `src/config/google.js` *(new)* | Derives `googleEnabled` (client ID must end in `.apps.googleusercontent.com`). One source of truth, no circular imports. |
| `src/main.jsx` | Imports the config; warns in dev when Google is unconfigured; still always mounts the provider so the hook stays valid. |
| `src/pages/Auth.jsx` | `useGoogleLogin({ flow:'implicit', prompt:'select_account', onNonOAuthError })` → **forces the account chooser** and resets the button if the popup is dismissed. Persists via `setCustomerSession`. Google button is hidden when `!googleEnabled` so users never see a dead button. |
| `src/pages/Profile.jsx` | Reads the validated session; real loading state instead of `return null`; `safeParseItems()` guards order items; redirects to `/auth` on 401/403; surfaces **Saved Address** (latest order) and **Favorites** count (wishlist). |
| `src/components/Navbar.jsx` | Drives the avatar/Profile link off `getCustomerSession()`, so the link only appears for a genuinely valid session. |
| `.env` | Added a documented `VITE_GOOGLE_CLIENT_ID=` slot. |

### The one action only you can take
Google client IDs are credentials I can't generate. To turn sign-in on:

1. Google Cloud Console → APIs & Services → Credentials → **OAuth 2.0 Client ID**
   (Web application).
2. Under **Authorized JavaScript origins** add `http://localhost:5173` and your
   production origin (e.g. `https://selestial.vercel.app`).
3. Put the value (`...apps.googleusercontent.com`) in `.env` **and** in Vercel →
   Project → Settings → Environment Variables, then redeploy.

Until then the app degrades gracefully: email/password and phone-OTP work, and the
Google button stays hidden instead of broken.

### Verify locally
```bash
npm run lint      # the 8 touched files parse clean
npm run build     # client ID is baked in only after .env is set
npm test          # backend suite unaffected (no server changes)
```
To confirm the blank-page fix: set `localStorage.customerName="X"` with no
`customerData`, open `/profile` → you now get redirected to `/auth` instead of a
white screen.

> Note: the full `vite build` could not be run end-to-end in this assistant's
> sandbox (an unrelated memory limit on the three.js bundle). The eight files were
> validated for syntax and structure directly; run the commands above on your
> machine for the green build.
