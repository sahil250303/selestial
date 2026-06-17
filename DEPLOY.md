# Deploy Runbook — push to GitHub + redeploy on Vercel

Run these on your PC (PowerShell), from `D:\codex\selestial`.

## 0. Pre-flight — catch errors before they hit production
```powershell
npm install        # picks up @libsql/client; drops three + react-helmet-async
npm run build      # must succeed
npm test           # should be 11/11
```
If `npm run build` fails, fix it before deploying (don't push a broken build).

## 1. Set Vercel environment variables FIRST  (Project → Settings → Environment Variables → Production)
The `.env` file is git-ignored and is NOT used by Vercel — set these in the dashboard:

| Variable | Value | Why |
|----------|-------|-----|
| `ALLOWED_ORIGIN` | `https://selestial-lovat.vercel.app` | **CRITICAL.** CORS is now strict — without this, every POST (login, checkout, newsletter, reviews) fails with a 500. Add your custom domain too, comma-separated. |
| `VITE_SITE_URL` | `https://selestial-lovat.vercel.app` | Build-time; sets canonical/OG domain. Must be set **before** the build runs. |
| `SITE_URL` | `https://selestial-lovat.vercel.app` | Server sitemap/canonical. |
| `ADMIN_PASSWORD` | `Sel3stial!Vault-7Kq2Xr9mZ` | Admin login + closes the old `Admin123!` exposure. |
| `JWT_SECRET` | (your existing 128-char value) | Server won't boot without it. Likely already set. |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | from turso.tech | Optional but recommended — durable data on serverless. |
| `STRIPE_*`, `SMTP_*` | your keys | Optional — payments / email. |

`BLOB_READ_WRITE_TOKEN` should already be present.

## 2. Commit & push  (this triggers the Vercel deploy)
```powershell
git add -A
git status                 # review what's staged
git commit -m "Remediation: security, SEO, performance & UX fixes"
git push
```
Vercel auto-builds from the push. Watch it in the Vercel dashboard → Deployments.

## 3. (Recommended, separate) scrub the committed database from git history
```powershell
./scripts/scrub-db-from-git.ps1
```
It untracks `server/database.sqlite` automatically and prints the (destructive) history-purge + force-push steps for you to run deliberately. Do this because that file held real customer hashes.

## 4. Verify the live deploy
- Homepage hero + banner images load.
- `https://selestial-lovat.vercel.app/sitemap.xml` returns XML (not HTML).
- Newsletter signup or `/admin` login works → confirms `ALLOWED_ORIGIN` is correct.
- Product page view-source: one `<title>`, one canonical on the right domain.
