# Selestial — Universe of Silver

Premium 925 sterling-silver jewellery storefront. React 19 + Vite frontend, Express 5 API (runs locally and as a Vercel serverless function), libSQL/Turso (or local `node:sqlite`) for relational data, Vercel Blob for order records, Stripe payments, Google + phone-OTP auth, and Nodemailer transactional email.

## Stack

| Layer | Tech |
|------|------|
| Frontend | React 19, Vite, Tailwind, GSAP, React Router |
| Backend | Express 5 (`server/`, deployed via `api/index.js`) |
| Data | libSQL/Turso when `TURSO_DATABASE_URL` is set, else `node:sqlite` (local) |
| Orders | Vercel Blob (`BLOB_READ_WRITE_TOKEN`) or the SQL store as fallback |
| Payments | Stripe |
| Auth | JWT; email/password (bcrypt), phone OTP (Twilio), Google OAuth |

## Local development

```bash
npm install
cp .env.example .env   # then fill in the values below
npm run dev            # Vite on :5173 + API on :3000 (concurrently)
```

`npm run dev:frontend` and `npm run dev:backend` run the two halves separately.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Frontend + backend together |
| `npm run build` | Generate optimized images, then build the SPA to `dist/` |
| `npm run images` | (Re)generate AVIF/WebP variants in `public/img/` |
| `npm test` | Node test runner (`server/*.test.js`, `src/**/*.test.js`) |
| `npm run build:prerender` | Build, then prerender key routes (requires `puppeteer`; see `scripts/prerender.mjs`) |
| `npm run lint` | ESLint |

## Required environment variables

See `.env.example` for the full list. The important ones:

- `JWT_SECRET` — required; the server refuses to boot without it.
- `ADMIN_PASSWORD` — required in production; seeds/updates the admin account. No default is shipped.
- `SITE_URL` / `VITE_SITE_URL` — the single canonical domain used for SEO (canonical/OG/sitemap). Set both to the same value.
- `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` — durable database (strongly recommended on serverless; `/tmp` SQLite is wiped on cold starts).
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob for orders/payments/customers.
- `STRIPE_SECRET_KEY` / `VITE_STRIPE_PUBLISHABLE_KEY` — card payments.
- `ALLOWED_ORIGIN` — comma-separated CORS allow-list.
- `SMTP_*`, `ADMIN_EMAIL`, `STORE_NAME` — email.
- `TWILIO_*` — phone OTP (optional; dev logs the code to the console).

## Images

Master PNG/JPG art lives in `public/` (and large unused sources are excluded from deploys via `.vercelignore`). `npm run build` runs `scripts/optimize-images.mjs` to emit responsive `public/img/<name>-<width>.{avif,webp}` variants, which the UI references through `<picture>`/`srcSet`.

## Deployment (Vercel)

`vercel.json` builds the SPA to `dist/`, routes `/api/*` and `/sitemap.xml` to the Express function, and serves everything else from the SPA. Set the environment variables above in the Vercel dashboard and ensure `NODE_ENV=production`.

## Tests

`npm test` covers the order store, email formatting, image optimizer, and URL helpers. When changing auth, checkout, or metadata, add coverage there.
