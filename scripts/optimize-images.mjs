// Build-time responsive image generation (AVIF + WebP).
// Runs automatically via `npm run build`. Reads master PNG/JPG files from
// public/ and writes optimized variants to public/img/<name>-<width>.<ext>.
//
//   node scripts/optimize-images.mjs [name ...]
//
// With no args it processes the default static-art set below. Pass explicit
// base names to override.
import sharp from 'sharp';
import { mkdir, access } from 'fs/promises';
import { join } from 'path';

const SRC = 'public';
const OUT = 'public/img';
const WIDTHS = [480, 768, 1200];

const DEFAULTS = ['hero_1', 'hero_2', 'split_1', 'split_2', 'brand_story', 'obsidian_ring', 'celestial_chain'];
const names = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULTS;

await mkdir(OUT, { recursive: true });

const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

for (const name of names) {
  let input = null;
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
    const candidate = join(SRC, `${name}.${ext}`);
    if (await exists(candidate)) { input = candidate; break; }
  }
  if (!input) { console.warn(`skip ${name} (no master in ${SRC}/)`); continue; }

  const meta = await sharp(input).metadata();
  for (const w of WIDTHS) {
    if (meta.width && w > meta.width) continue;
    const pipe = sharp(input).resize({ width: w, withoutEnlargement: true });
    await pipe.clone().avif({ quality: 50, effort: 3 }).toFile(join(OUT, `${name}-${w}.avif`));
    await pipe.clone().webp({ quality: 72, effort: 4 }).toFile(join(OUT, `${name}-${w}.webp`));
  }
  console.log(`done ${name} -> ${WIDTHS.join('/')}w (avif+webp)`);
}
console.log('Image variants written to', OUT);
