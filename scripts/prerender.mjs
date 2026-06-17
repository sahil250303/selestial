// Opt-in prerender for static routes -> improves SEO/AEO/GEO for crawlers and
// AI agents that don't execute JavaScript. Run AFTER `npm run build`:
//
//   npm i -D puppeteer
//   npm run build:prerender
//
// It serves dist/ with `vite preview`, renders each route with a headless
// browser, and writes the fully-rendered HTML to dist/<route>/index.html so
// Vercel serves a static, content-rich page (which beats the SPA catch-all).
//
// NOTE: product detail routes need the API for data — prerender those in an
// environment where /api is reachable (or extend this list once that's wired).
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ROUTES = ['/', '/products', '/about', '/faq', '/care-guide', '/size-guide',
  '/shipping-returns', '/privacy', '/terms', '/contact'];
const PORT = 4173;

let puppeteer;
try { puppeteer = (await import('puppeteer')).default; }
catch { console.error('Prerender needs puppeteer:  npm i -D puppeteer'); process.exit(1); }

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT)], { stdio: 'inherit', shell: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(4000);

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await wait(300);
    const html = await page.content();
    const out = route === '/' ? 'dist/index.html' : join('dist', route.replace(/^\//, ''), 'index.html');
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, html);
    console.log('prerendered', route, '->', out);
    await page.close();
  }
} finally {
  await browser.close();
  preview.kill();
}
console.log('Prerender complete.');
