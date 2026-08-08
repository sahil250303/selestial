// Inline the built stylesheet into index.html after `vite build`.
//
// index.html paints a static hero (see the #lcp-hero block there) so the page
// has real content before any JavaScript runs. Once that was in place the ONLY
// remaining render-blocking resource was the stylesheet: the browser parsed the
// HTML, found <link rel="stylesheet">, and held the paint for a separate round
// trip — Lighthouse measured ~166ms of blocking and ~1s of LCP "render delay"
// behind it on throttled mobile.
//
// The stylesheet is ~43KB raw but compresses to ~8KB, so folding it into the
// document trades a small HTML increase for removing a request from the critical
// path entirely. The trade-off is that the CSS is no longer separately
// cacheable, which is acceptable because Vite renames it on every build anyway.
import { readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const INDEX = join(DIST, 'index.html');
const MAX_INLINE_BYTES = 120 * 1024;

let html;
try {
  html = await readFile(INDEX, 'utf8');
} catch {
  console.warn('[inline-css] no dist/index.html — skipping');
  process.exit(0);
}

const linkRe = /<link[^>]+rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/;
const match = html.match(linkRe);
if (!match) {
  console.warn('[inline-css] no built stylesheet link found — skipping');
  process.exit(0);
}

let css;
try {
  css = await readFile(join(DIST, match[1]), 'utf8');
} catch {
  console.warn(`[inline-css] ${match[1]} unreadable — skipping`);
  process.exit(0);
}

if (css.length > MAX_INLINE_BYTES) {
  console.warn(`[inline-css] ${Math.round(css.length / 1024)}KB exceeds the ${MAX_INLINE_BYTES / 1024}KB budget — leaving external`);
  process.exit(0);
}

// A literal </style> inside the CSS would close the tag early.
const safeCss = css.replace(/<\/style>/gi, '<\\/style>');
html = html.replace(linkRe, `<style>${safeCss}</style>`);
await writeFile(INDEX, html);

const { size } = await stat(INDEX);
console.log(`[inline-css] inlined ${Math.round(css.length / 1024)}KB — index.html is now ${Math.round(size / 1024)}KB`);
