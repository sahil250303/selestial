# Selestial — Remediation Roadmap to 10/10

**Companion to:** `Selestial_Audit_Report_2026.docx`
**Prepared:** 17 June 2026
**Stack:** React 19 + Vite · Express 5 · `node:sqlite` · Vercel Blob · Stripe · Google OAuth · Twilio

---

## How to use this document

Each issue from the audit is listed with **why it matters**, a **step-by-step fix with code**, and the **score impact**. Work top‑down: the **Priority 0** items are correctness/safety blockers and unlock the biggest score gains. The **Performance & Image Loading** section is broken out first among the themed sections because you flagged it as the most painful for users.

A note on "10/10": a perfect score is earned by *measured* results, not just merged PRs. For each area I give the concrete target you should be able to verify (Lighthouse numbers, Rich Results Test passes, a clean `npm audit`, etc.). Treat the checklists at the end as your definition of done.

**Current scores:** Security 4 · UI/UX 7 · Content 6 · SEO/AEO/GEO 3 · **Overall 5**.

---

## Priority 0 — Do these first (blockers)

| # | Issue | Area | Effort |
|---|-------|------|--------|
| P0‑1 | Customer-login authentication bypass | Security | S |
| P0‑2 | Customer PII + password hashes committed in `server/database.sqlite` | Security | M |
| P0‑3 | Ephemeral `/tmp` SQLite on Vercel (data loss) | Security/Architecture | L |
| P0‑4 | Empty/duplicate `<title>` + canonical, wrong domain | SEO | M |
| P0‑5 | Broken `sitemap.xml` in production | SEO | S |
| P0‑6 | Oversized images / no image pipeline (slow load) | Performance | M |

---

## 1. Performance & Image Loading (your priority)

### What's actually slow (measured)

- `public/categories/` ships **~39 MB of raw source PNGs** (`Chain.png` 7.6 MB, `Sets.png` 6.9 MB, `Earrings.png` 6.7 MB, `Pendants.png` 6.1 MB, `Bracelets.png` 6.0 MB, `Rings.png` 5.9 MB). **None are referenced by the app** — only the `-960.webp` variants are used. They are dead weight in the deployed bundle.
- Hero, product and editorial images are **unoptimized PNGs served at full size**: `brand_story.png` 752 KB, `mens_hero.png` 728 KB (also unreferenced/dead), `celestial_chain.png` 708 KB, `obsidian_ring.png` 624 KB, `hero_2.png` 624 KB, `hero_1.png` 556 KB, `split_2.png` 496 KB, `split_1.png` 452 KB.
- `getOptimizedImageUrl()` only rewrites `/api/uploads/*` and `images.unsplash.com` URLs — **local `/public` images bypass optimization entirely**, so the `width`/`quality` hints are ignored for your own hero/product art.
- **No `width`/`height` (or `aspect-ratio`) on any `<img>`** → cumulative layout shift (CLS) as images pop in.
- The hero renders **both slides eagerly** (`loading="eager"`), so the browser fetches two ~0.6 MB PNGs before first paint.
- No build-time image step in `vite.config.js`; `public/` files are copied verbatim and aren't content-hashed (weaker caching).

### Fix 1.1 — Delete dead image weight (5 min, ~40 MB saved)

The big category PNGs and `mens_hero.png` are unused. Move the source originals out of the deployed folder.

```bash
# from repo root
mkdir -p design-assets/originals
git mv public/categories/Chain.png public/categories/Sets.png \
       public/categories/Earrings.png public/categories/Pendants.png \
       public/categories/Bracelets.png public/categories/Rings.png \
       design-assets/originals/ 2>/dev/null || \
  mv public/categories/*.png design-assets/originals/

git rm public/mens_hero.png   # unreferenced

# keep design-assets out of the build
echo "design-assets/" >> .gitignore   # or keep tracked but it's never deployed from /public
```

Verify nothing references them: `grep -rn "categories/.*\.png\|mens_hero" src` should return nothing.

### Fix 1.2 — Generate modern, responsive variants for the images you DO use

You already depend on `sharp`. Add a build-time script that emits AVIF + WebP at multiple widths for the hero/product/editorial art.

Create `scripts/optimize-public-images.mjs`:

```js
import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { join, parse } from 'path';

const SRC = 'public/img-src';      // put master PNGs here
const OUT = 'public/img';          // generated, served to users
const WIDTHS = [480, 768, 1200, 1600];

await mkdir(OUT, { recursive: true });
for (const file of await readdir(SRC)) {
  const { name } = parse(file);
  for (const w of WIDTHS) {
    const base = sharp(join(SRC, file)).resize({ width: w, withoutEnlargement: true });
    await base.clone().avif({ quality: 50 }).toFile(join(OUT, `${name}-${w}.avif`));
    await base.clone().webp({ quality: 72 }).toFile(join(OUT, `${name}-${w}.webp`));
  }
}
console.log('Optimized images written to', OUT);
```

Wire it into the build in `package.json`:

```json
"scripts": {
  "images": "node scripts/optimize-public-images.mjs",
  "build": "npm run images && vite build"
}
```

Move your master PNGs (`hero_1`, `hero_2`, `obsidian_ring`, `celestial_chain`, `brand_story`, `split_1`, `split_2`) into `public/img-src/`, then run `npm run images`. Expect ~0.6 MB PNGs to become **15–40 KB AVIF / 25–60 KB WebP** per width.

### Fix 1.3 — Serve them with `<picture>` + explicit dimensions (kills CLS)

Create a small helper component, e.g. `src/components/Img.jsx`:

```jsx
export default function Img({ name, alt, width, height, sizes, priority = false, className }) {
  const w = [480, 768, 1200, 1600];
  const set = (ext) => w.map(x => `/img/${name}-${x}.${ext} ${x}w`).join(', ');
  return (
    <picture>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      <img
        src={`/img/${name}-1200.webp`} alt={alt}
        width={width} height={height}            /* reserve space -> no layout shift */
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async" className={className}
      />
    </picture>
  );
}
```

Use it for the hero (only the **first** slide is `priority`), products, and editorial blocks. Always pass `width`/`height` (the intrinsic ratio of the master) so the browser reserves space.

### Fix 1.4 — Preload the LCP hero & stop eager-loading slide 2

In `index.html` `<head>`:

```html
<link rel="preload" as="image" href="/img/hero_1-1200.avif" type="image/avif"
      fetchpriority="high" imagesrcset="/img/hero_1-768.avif 768w, /img/hero_1-1200.avif 1200w" imagesizes="100vw" />
```

In `Home.jsx`, render only the active slide eagerly; give non-active slides `loading="lazy"` (or don't mount them until first interaction/interval).

### Fix 1.5 — Long-cache the generated images

`public/img/*` filenames are stable, so cache them hard. Add to `vercel.json` `headers`:

```json
{ "source": "/img/(.*)", "headers": [
  { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" } ] }
```

### Fix 1.6 — Trim and split JavaScript

- **Remove unused 3D deps** (they're installed but never imported; `CanvasBackground` is an empty div):
  ```bash
  npm uninstall three @react-three/fiber @react-three/drei
  ```
- **Code-split routes** so the initial bundle only loads the home page. In `App.jsx`:
  ```jsx
  import { lazy, Suspense } from 'react';
  const Products      = lazy(() => import('./pages/Products'));
  const ProductDetails= lazy(() => import('./pages/ProductDetails'));
  const Checkout      = lazy(() => import('./pages/Checkout'));
  const AdminDashboard= lazy(() => import('./pages/admin/AdminDashboard'));
  // ...wrap <Routes> in <Suspense fallback={<PageSkeleton/>}>
  ```
  Admin and Stripe code should never load for a first-time shopper.
- **Defer GSAP** (68 KB): import it dynamically inside the effect that uses it, or replace simple fades with CSS transitions / the Web Animations API.

### Fix 1.7 — Compression & fonts

- On Vercel, Brotli/gzip is automatic. For the **self-hosted Express path**, add `compression`:
  ```js
  import compression from 'compression';
  app.use(compression());
  ```
- Fonts already use `display=swap` + preconnect. Subset to the weights you actually use (you load Cinzel 400–700 and Inter 300–600) to shave the CSS/woff payload.

### Performance "definition of done" (→ 9–10)

- Lighthouse **Performance ≥ 95** on mobile for Home and a Product page.
- **LCP < 2.0 s**, **CLS < 0.05**, **TBT < 150 ms** (Chrome DevTools, mobile throttling).
- No single image over ~150 KB on the wire; hero in AVIF.
- Deployed `public/` under ~2 MB (down from 44 MB).

---

## 2. Security → 10

### 2.1 (P0‑1) Remove the customer-login auth bypass — *Critical*

**Problem:** `server/auth.js → loginCustomer` skips the password check when the request body says `auth_provider` is `google` or `otp`. The client controls that field, so anyone can log in as any account by email/phone alone.

**Fix:** the password route must *always* verify a password. Google and OTP already have their own verified routes (`/customer/google`, `/customer/verify-otp`) — `loginCustomer` should never trust a provider claim.

```js
export const loginCustomer = (req, res) => {
  const { email, phone, password } = req.body;          // <- drop auth_provider
  const param = email || phone;
  if (!param) return res.status(400).json({ error: 'Email or Phone is required' });
  const query = email ? 'SELECT * FROM customers WHERE email = ?' : 'SELECT * FROM customers WHERE phone = ?';
  db.get(query, [param], (err, user) => {
    if (err)  return res.status(500).json({ error: 'Database error' });
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });
    if (!password || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, message: 'Login successful', user: { name: user.name, email: user.email, phone: user.phone } });
  });
};
```

Accounts created via Google/OTP have no password, so they correctly cannot use the password route — they keep using their own verified flows.

### 2.2 (P0‑2) Purge committed data & secrets from git — *High*

**Problem:** `server/database.sqlite` is tracked and contains real customer rows, password hashes, orders, and the admin hash.

**Fix:**
```bash
# stop tracking it and ignore going forward
git rm --cached server/database.sqlite
printf "\nserver/database.sqlite\n*.sqlite\n" >> .gitignore
git commit -m "Stop tracking local database"

# scrub it from history (choose one)
pipx run git-filter-repo --invert-paths --path server/database.sqlite
#   or: java -jar bfg.jar --delete-files database.sqlite && git reflog expire --expire=now --all && git gc --prune=now
git push --force-with-lease
```
Then: **rotate the admin password**, and because customer hashes were exposed, force a password reset for affected accounts. Seed/dev data should be created by a script (`scripts/seed.mjs`), never committed as a binary DB.

### 2.3 (P0‑3) Move to a durable database — *High (architectural)*

**Problem:** on Vercel the SQLite file lives in `/tmp`, which is wiped on cold starts. Customer signups, inventory changes, reviews, newsletter sign‑ups and OTPs silently disappear.

**Fix (lowest-friction):** switch to **Turso / libSQL** — SQLite-compatible, so your SQL barely changes.

```bash
npm i @libsql/client
```
```js
// server/db.js
import { createClient } from '@libsql/client';
export const sqlite = createClient({
  url: process.env.TURSO_DATABASE_URL,        // libsql://...
  authToken: process.env.TURSO_AUTH_TOKEN,
});
// wrap .execute() to keep your existing db.get/all/run signatures
```
Alternatives: **Vercel Postgres / Neon** (more migration work) or **Prisma + Postgres**. After migrating, you can also retire the Blob order store and keep everything in one place (one source of truth fixes the customer-table-vs-Blob split too).

### 2.4 Remove the default admin fallback — *High*

In `server/db.js`, never seed `admin / Admin123!`. Require the env var and fail fast:

```js
const configuredPassword = process.env.ADMIN_PASSWORD;
if (!configuredPassword) throw new Error('FATAL: ADMIN_PASSWORD must be set.');
// hash & upsert as today, and delete the console.log that prints credentials
```

### 2.5 Make payment status honest — *Medium*

In `server/orderStore.js → normalizeCheckout`, don't hardcode `status: 'Completed'`. Pass the real result from the checkout route: `'Paid'` only when Stripe returns `succeeded`, otherwise `'Unpaid'`/`'Pending'`. In `server/index.js`, when Stripe is configured, **require** a successful PaymentIntent before creating the order; when it isn't, mark the order `Unpaid` and don't claim it's paid.

### 2.6 Make inventory updates atomic — *Medium*

Replace the check-then-decrement with a single conditional update inside a transaction, and treat "0 rows changed" as out-of-stock:

```js
const r = db.run(
  'UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?',
  [qty, item.id, qty]
);
if (r.changes === 0) return res.status(409).json({ error: `Insufficient stock for ${item.id}` });
```
Wrap the loop in `BEGIN` / `COMMIT` (and `ROLLBACK` on failure).

### 2.7 Tighten CSP, tokens, CORS, OTP — *Medium/Low*

- **CSP:** drop `'unsafe-inline'` from `script-src`; serve a per-request nonce and attach it to any inline script. Inline styles can stay or move to classes.
- **Tokens:** stop storing JWTs in `localStorage`. Set an **httpOnly, Secure, SameSite=Strict cookie** on login and read it server-side (you already read `req.cookies.authToken`). This removes the XSS token-theft path.
- **CORS:** require an allow-list always; don't open up just because `NODE_ENV !== 'production'`. Set `NODE_ENV=production` in Vercel.
- **OTP:** generate with `crypto.randomInt(100000, 1000000)` and store a **hash** of the code; you already expire in 10 min and rate-limit (good).
- **Reviews:** require a logged-in customer (ideally a verified purchase) to post, and never label anonymous authors "Verified Customer".
- **Sessions:** shorten admin token to ~2 h and add a refresh flow, or keep a server-side denylist so logout truly invalidates.

### Security "definition of done" (→ 9–10)

- No auth route trusts client-declared identity; passwords always verified.
- `git log --all -- server/database.sqlite` shows it removed; no secrets in history; `npm audit` clean.
- Data survives a redeploy/cold start (durable DB).
- Payments can't be "Completed" without a charge; stock can't oversell.
- Tokens in httpOnly cookies; CSP has no `unsafe-inline`.

---

## 3. UI/UX → 10

### 3.1 Make product cards real links (a11y + crawlability) — *High*

In `Products.jsx` (and the Home "Our Picks" cards), wrap the card in a `<Link>` instead of a `div onClick`. Keep the inner quick-add / wishlist as `<button>`s and stop propagation.

```jsx
<Link to={`/product/${product.id}`} className="product-card ...">
  {/* image, title, price */}
  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(...); }}>Add to Cart</button>
</Link>
```
This gives keyboard focus, Enter/Space activation, and a real `href` for crawlers.

### 3.2 Make the Categories menu keyboard/touch accessible — *Medium*

Convert the hover-only `<span>` into a `<button aria-expanded aria-haspopup="menu">` that toggles on click and closes on `Esc`/outside-click (mirror the pattern you already wrote for the search combobox). Don't rely on `:hover` + `pointer-events`.

### 3.3 Show shipping & tax at checkout — *Medium*

In `Checkout.jsx`, add Subtotal, Shipping (free over $100, else flat), and Tax rows, and compute Total from them. Have the server return the authoritative breakdown so the displayed total matches the charge.

### 3.4 Replace `alert()`/`confirm()` in admin — *Medium*

You already have a `Toast` provider and can add a confirm modal. Swap the native dialogs in `AdminDashboard.jsx` for an in-app confirm modal (especially for "delete all …"), with a typed confirmation for bulk deletes.

### 3.5 Fix small semantics — *Low*

- Mobile-menu social links: point them at the real Instagram/Pinterest URLs (or remove), matching the footer.
- Homepage: keep a **single `<h1>`** (e.g., a visually-hidden page title) and demote per-slide headings to `<h2>`/`<p>`.
- Respect `prefers-reduced-motion` for GSAP/transition-heavy sections.

### UI/UX "definition of done" (→ 10)

- Full keyboard pass: every interactive element focusable, visible focus ring, Enter/Space works; menus close on `Esc`.
- Lighthouse **Accessibility ≥ 98**; axe DevTools shows no serious violations.
- No native `alert/confirm`; no dead `#` links; one `<h1>` per page.

---

## 4. Content → 10

### 4.1 Drive the homepage from real data — *High*

Replace `mockProducts` in `Home.jsx` with a fetch from `/api/products` (add a `featured` boolean column, or just take the first N). This removes catalog drift and the risk of "Our Picks" linking to product IDs that don't exist.

```jsx
const [picks, setPicks] = useState([]);
useEffect(() => { fetch('/api/products').then(r => r.json())
  .then(d => setPicks(d.filter(p => p.featured).slice(0, 4))); }, []);
```
Then delete `src/data/mockProducts.js`.

### 4.2 Own your imagery — *Medium*

Replace `images.unsplash.com` hotlinks with brand-owned, optimized assets (run them through Fix 1.2). Third-party URLs can vanish and aren't yours to use commercially by default.

### 4.3 Tighten copy accuracy — *Low*

- Privacy Policy: correct the "cookies keep you logged in" line to reflect token storage, and disclose Google sign-in and Twilio (SMS) data handling.
- Reviews: only show "Verified Customer" for authenticated buyers; show real names/initials otherwise; don't display a default 5-star summary for unrated products.
- Replace the boilerplate Vite `README.md` with real setup/run/deploy docs and an env-var table.

### Content "definition of done" (→ 10)

- Everything shown on the homepage exists in the live catalog and links resolve.
- All imagery is owned and optimized.
- Legal pages are accurate to actual data flows; README documents the project.

---

## 5. SEO / AEO / GEO → 10

### 5.1 (P0‑4) Fix the metadata layer — *Critical*

The duplicate/empty `<title>` and double canonical/description come from `react-helmet-async@^3` not replacing the static tags under React 19.

**Recommended fix — use React 19 native document metadata** (React 19 hoists and de-dupes `<title>`/`<meta>`/`<link>` rendered anywhere), and **remove Helmet**:

1. Delete the per-page meta from `index.html` except a minimal default, and remove the duplicate canonical/OG there.
2. In each page component, render tags directly — no Helmet needed:
   ```jsx
   export default function ProductDetails() {
     // ...after product loads
     return (<>
       <title>{`${product.name} | Selestial`}</title>
       <meta name="description" content={product.description} />
       <link rel="canonical" href={`${SITE_URL}/product/${product.id}`} />
       <meta property="og:title" content={`${product.name} | Selestial`} />
       <script type="application/ld+json">{productSchema}</script>
       {/* page UI */}
     </>);
   }
   ```
3. Remove `react-helmet-async` and `HelmetProvider` from `main.jsx`.

(If you prefer to keep Helmet, pin a React‑19‑compatible release and ensure it owns *all* head tags so none are duplicated — but native metadata is simpler and is the root-cause fix.)

### 5.2 (P0‑4) One canonical domain, set in one place — *Critical/High*

`selestial.vercel.app` now serves a different app ("AURICLE"); your store is on `selestial-lovat.vercel.app`. Pick the **one** domain you'll keep (ideally a custom domain like `selestial.com`), then:

- Add `src/config/site.js`: `export const SITE_URL = import.meta.env.VITE_SITE_URL;`
- Use `SITE_URL` for **every** canonical/OG/JSON-LD URL (kills the `selestial-lovat` vs `selestial.vercel.app` split in `Products.jsx`).
- Set `VITE_SITE_URL` and the server `SITE_URL` to the same value.
- Either reclaim/redirect `selestial.vercel.app` or stop referencing it entirely.

### 5.3 (P0‑5) Restore the sitemap — *High*

The Vercel catch-all rewrite swallows the Express `/sitemap.xml`. Generate it **statically at build** so it's served as a real file (static files beat rewrites):

`scripts/generate-sitemap.mjs`:
```js
import { writeFileSync } from 'fs';
const base = process.env.VITE_SITE_URL;
const staticPaths = ['/', '/products', '/about', '/faq', '/care-guide', '/size-guide',
  '/shipping-returns', '/privacy', '/terms', '/contact'];
// fetch product ids from your DB/API at build time:
const ids = await fetch(`${base}/api/products`).then(r => r.json()).then(d => d.map(p => p.id));
const urls = [...staticPaths, ...ids.map(id => `/product/${id}`)]
  .map(p => `<url><loc>${base}${p}</loc><changefreq>weekly</changefreq></url>`).join('');
writeFileSync('public/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
```
Add to build: `"build": "npm run images && node scripts/generate-sitemap.mjs && vite build"`. Update `robots.txt` to the chosen domain.

### 5.4 Pre-render for AEO/GEO (non-JS crawlers) — *High*

Client-only rendering means answer engines, LLM crawlers, and social scrapers see an empty shell with the wrong meta. Render real HTML for key routes:

- **Lightest:** add **prerendering** for static + product routes with `vite-react-ssg` or a Puppeteer prerender step that writes static HTML per route at build.
- **Most robust:** migrate to **Next.js** (App Router) for true SSR/ISR of product pages — best long-term for SEO/AEO/GEO and would also solve metadata and sitemap natively.

Either way, ensure each route's HTML contains the title, description, canonical, OG, and Product JSON-LD **without** running JS.

### 5.5 Structured data & crawl path — *Medium/Low*

- Make product cards `<a>` links (Fix 3.1) so crawlers can walk the catalog.
- Add **BreadcrumbList** JSON-LD (you already render breadcrumbs visually).
- Only emit `aggregateRating` when real reviews exist, and include `review` items; otherwise omit it to avoid Rich Results warnings.
- Point the WebSite `SearchAction` target at the chosen domain.

### SEO/AEO/GEO "definition of done" (→ 9–10)

- View-source (JS disabled) on Home + a Product page shows the correct unique title, one canonical (right domain), description, and Product JSON-LD.
- Google **Rich Results Test** passes for Product and Breadcrumb with no errors.
- `https://<domain>/sitemap.xml` returns valid XML; Search Console accepts it.
- No duplicate `<title>`/canonical tags anywhere.

---

## 6. Remaining bug fixes

- **Customer `address` field:** add an `address` column to the `customers` table (or stop selecting/returning `user.address`), so the "Pre-filled from your profile" badge is truthful and checkout can pre-fill it.
- **Conditional React hooks in `Checkout.jsx`:** call `useStripe()`/`useElements()` unconditionally at the top of the component; branch on their values afterward.
- **Node version:** align `package.json` `engines` (22.x) with the Vercel project (24.x). `node:sqlite` is experimental — pin the runtime you test on, or move to libSQL (Fix 2.3) which is stable.
- **Free checkout when Stripe absent:** gate order creation on a successful charge whenever Stripe is configured (see Fix 2.5).

---

## 7. Suggested sequence (2 sprints)

**Sprint 1 — correctness & safety (unblocks Security + SEO):**
P0‑1 auth bypass → P0‑2 purge repo + rotate creds → 2.4 admin password → P0‑3 durable DB → 2.5/2.6 payment & inventory → P0‑4 metadata + single domain → P0‑5 sitemap.

**Sprint 2 — experience & polish:**
Performance §1 (images, code-split, drop 3D deps) → UI/UX §3 (links, menu, checkout, modals) → Content §4 (real homepage data, owned images, copy) → SEO §5.4 prerender/SSR → structured data → bug list §6.

---

## 8. Final verification checklist (your "10/10" gate)

- [ ] **Security:** no client-trusted auth; DB scrubbed from history; data durable; payments verified; stock atomic; httpOnly cookies; CSP without `unsafe-inline`; `npm audit` clean.
- [ ] **Performance:** Lighthouse mobile ≥ 95; LCP < 2.0 s; CLS < 0.05; no image > ~150 KB; `public/` < 2 MB; routes code-split; unused deps removed.
- [ ] **UI/UX:** Accessibility ≥ 98; full keyboard pass; no native dialogs; one `<h1>`/page; no dead links.
- [ ] **Content:** homepage = live catalog; owned imagery; accurate legal pages; real README.
- [ ] **SEO/AEO/GEO:** correct unique meta in raw HTML; one canonical on the right domain; valid sitemap; Rich Results pass; prerender/SSR for product routes.
- [ ] **Regression:** extend the test suite to cover `loginCustomer`, the checkout/payment path, and metadata output — the areas that currently have none.

---

*Reaching a genuine 10 is mostly about Sprint 1 (which moves Security 4→9 and SEO 3→8) plus the image work (Performance, and it lifts UX). Measure with Lighthouse and the Rich Results Test after each change so the scores are evidence-based, not assumed.*
