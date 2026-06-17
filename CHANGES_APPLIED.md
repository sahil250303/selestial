# Selestial — Remediation Applied

Implementation of `Selestial_Remediation_Roadmap.md`. This documents what was changed, what **you** still need to do (credentials, one destructive git step), and how to verify.

> **Important — verify locally.** The changes were written to your real files, but the build/test could not be executed in this assistant's sandbox (an environment file-sync limitation). Please run the verification commands at the bottom before deploying.

---

## 1. Security

| Fix | File(s) | What changed |
|-----|---------|--------------|
| **Auth bypass removed (Critical)** | `server/auth.js` | `loginCustomer` no longer trusts a client `auth_provider`; it **always** verifies the bcrypt password. Google/OTP keep their own server-verified routes. |
| **Honest payments** | `server/index.js`, `server/orderStore.js` | Orders are `Paid` only on a successful Stripe charge; otherwise `Unpaid` / `Pending Payment`. If Stripe is configured, a charge is required. |
| **Atomic inventory** | `server/index.js` | Stock is decremented with a conditional `UPDATE ... WHERE quantity >= ?` (0 rows → 409), preventing oversell. |
| **No default admin** | `server/db.js` | The `admin / Admin123!` fallback is gone. Without `ADMIN_PASSWORD`, admin login is simply disabled (storefront stays up) — no known-credential backdoor. |
| **OTP hardened** | `server/auth.js` | Codes use `crypto.randomInt` and are stored as a SHA-256 hash, not plaintext. |
| **Reviews require sign-in** | `server/index.js`, `src/pages/ProductDetails.jsx` | No more anonymous "Verified Customer"; the UI shows a "Sign in to review" link when logged out. |
| **CORS tightened** | `server/index.js` | Strict allow-list in all environments (no `NODE_ENV !== production` wildcard). |
| **CSP hardened** | `server/index.js` | Removed `'unsafe-inline'` from `script-src`. |

## 2. Durable database (libSQL/Turso)

- `server/db.js` rewritten to an **async** API backed by **libSQL/Turso** when `TURSO_DATABASE_URL` is set, else local `node:sqlite`. It keeps callback compatibility, so existing handlers still work.
- `server/orderStore.js` SQLite path now `await`s the DB; a `customers.address` column was added (fixes the "pre-filled from profile" bug).
- **You must** create a free Turso DB and set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (see `.env.example`). Until then it runs on local SQLite (ephemeral on Vercel).

## 3. SEO / AEO / GEO

- **Metadata fixed (Critical):** `react-helmet-async` (broken under React 19 → empty/duplicate titles) is replaced by a React-19-native shim at `src/components/Seo.jsx`, wired via a Vite alias (`vite.config.js`). No page imports changed. The shim also rewrites any stale domain to `VITE_SITE_URL`.
- **One canonical domain:** `index.html`, `public/robots.txt`, and the server sitemap now use `selestial-lovat.vercel.app` by default (override with `SITE_URL`/`VITE_SITE_URL`). Note: `selestial.vercel.app` now serves a different app — point these at your real/custom domain.
- **Sitemap fixed:** `vercel.json` routes `/sitemap.xml` to the API function (it was being swallowed by the SPA catch-all).
- **Crawlable product cards & single H1:** see UI/UX.
- **Prerender (opt-in):** `scripts/prerender.mjs` + `npm run build:prerender` (needs `npm i -D puppeteer`). Renders static routes to HTML for non-JS crawlers/AI agents. Not in the default build, so it can't break a deploy.

## 4. Performance & images

- **~40 MB dropped from deploys:** `.vercelignore` excludes the unused full-size category PNGs and `mens_hero.png` (kept in the repo, just not shipped).
- **Responsive AVIF/WebP:** `scripts/optimize-images.mjs` runs in `npm run build` and emits `public/img/<name>-<width>.{avif,webp}`. Home hero now references the optimized WebP, loads only the first slide eagerly (`fetchpriority=high`), and has `width`/`height` to stop layout shift. `index.html` preloads the LCP hero.
- **Smaller JS:** routes are code-split with `React.lazy` + `Suspense` (`src/App.jsx`); unused `three` / `@react-three/*` removed from `package.json`.
- **Caching:** `vercel.json` adds immutable cache headers for `/img/*`.

## 5. UI/UX & content

- Product cards are real `<Link>`s (keyboard-focusable + crawlable) — `src/pages/Products.jsx`.
- Homepage "Our Picks" now pulls from the live catalog (`/api/products`, `featured` flag) instead of hardcoded mock data — `src/pages/Home.jsx`.
- Single page-level `<h1>` on Home; hero headings demoted to `<h2>`.
- Checkout: Rules-of-Hooks bug fixed (Stripe hooks called unconditionally inside `<Elements>`); added a Subtotal / Shipping / Total summary.
- Navbar mobile social links now point to real destinations.
- Privacy Policy corrected (local-storage token, third-party processors disclosed).
- `README.md` replaced with real project docs; `.env.example` documents the new vars.

---

## What you need to do

1. **Install & build**
   ```bash
   npm install            # picks up @libsql/client, drops three/helmet-async
   npm run build          # generates optimized images + builds
   npm test               # 11 existing tests
   ```
2. **Set environment variables** (locally in `.env`, and in the Vercel dashboard):
   `JWT_SECRET`, `ADMIN_PASSWORD`, `SITE_URL`, `VITE_SITE_URL`, `NODE_ENV=production`,
   `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`, `ALLOWED_ORIGIN`, Stripe keys, SMTP, (optional) Twilio.
3. **Remove the committed database from git history** (destructive — run it yourself):
   ```bash
   git rm --cached server/database.sqlite
   pipx run git-filter-repo --invert-paths --path server/database.sqlite
   git push --force-with-lease
   ```
   Then **rotate the admin password** and reset affected customer passwords (their hashes were exposed in history).
4. **(Optional) Prerender:** `npm i -D puppeteer && npm run build:prerender`.

## Verify (definition of done)

- `npm run build` succeeds; `npm test` green.
- View-source on a product page (JS off): one correct `<title>`, one canonical on the right domain, Product JSON-LD present.
- `/sitemap.xml` returns XML (not HTML).
- Lighthouse mobile: Performance ≥ 95, no major layout shift; `/img/*` served as AVIF/WebP.
- Try logging in via `POST /api/auth/customer/login` with `auth_provider: "google"` and no password → must be rejected.

## Deferred (recommended next, intentionally not done here)

- **httpOnly-cookie sessions** instead of `localStorage` JWT — needs end-to-end browser testing to avoid breaking auth.
- **Full SSR (Next.js)** — the prerender script covers static routes; product routes still need the API at prerender time or an SSR framework.
- **Admin dashboard** native `alert()/confirm()` → in-app modal/toast.
