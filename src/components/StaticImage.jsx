import React from 'react';

// Responsive <picture> for the build-time art assets in public/img/.
//
// `npm run images` (scripts/optimize-images.mjs) turns each master PNG in
// public/ into AVIF + WebP at 480/768/1200w. The masters are 1024px square, so
// the 1200w step is skipped — WIDTHS below must stay in sync with what the
// script actually emits or the browser will request 404s.
//
// Why this exists: the hero shipped as a 556KB PNG and was the LCP element on
// mobile, where it cost several seconds on a throttled connection. The AVIF at
// 768w is ~15KB for the same visual result.

const WIDTHS = [480, 768];

function srcSet(base, ext) {
  return WIDTHS.map((w) => `/img/${base}-${w}.${ext} ${w}w`).join(', ');
}

/**
 * @param {string} base    asset base name, e.g. "hero_1" (no extension)
 * @param {string} sizes   CSS `sizes` hint; defaults to full viewport width
 * @param {boolean} eager  true for the LCP image — eager + high priority, never lazy
 */
export default function StaticImage({
  base,
  alt,
  className = '',
  sizes = '100vw',
  eager = false,
  width = 1024,
  height = 1024,
  ...rest
}) {
  return (
    // `display: contents` keeps <picture> out of the layout entirely. Without it
    // the wrapper is an inline box with auto height, so utility classes like
    // `h-full` on the <img> resolve against the <picture> instead of the sized
    // ancestor the markup intends, and full-bleed images collapse to intrinsic
    // aspect ratio.
    <picture className="contents">
      <source type="image/avif" srcSet={srcSet(base, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(base, 'webp')} sizes={sizes} />
      <img
        src={`/img/${base}-768.webp`}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding={eager ? 'sync' : 'async'}
        {...rest}
      />
    </picture>
  );
}
