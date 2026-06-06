const LOCAL_URL_BASE = 'https://selestial.local';
const UPLOADS_PATH_PREFIX = '/api/uploads/';

function hasProtocol(src) {
  return /^[a-z][a-z\d+.-]*:/i.test(src);
}

function boundedInteger(value, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
}

function toDisplayUrl(url, originalSrc) {
  if (hasProtocol(originalSrc) || originalSrc.startsWith('//')) {
    return url.toString();
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function getOptimizedImageUrl(src, options = {}) {
  if (!src) return src;

  const width = boundedInteger(options.width, 1, 2000);
  const quality = boundedInteger(options.quality ?? 72, 1, 100);
  if (!width || !quality) return src;

  try {
    const url = new URL(src, LOCAL_URL_BASE);

    if (url.pathname.startsWith(UPLOADS_PATH_PREFIX)) {
      url.searchParams.set('w', String(width));
      url.searchParams.set('q', String(quality));
      url.searchParams.set('format', 'webp');
      return toDisplayUrl(url, src);
    }

    if (url.hostname === 'images.unsplash.com') {
      url.searchParams.set('auto', 'format');
      url.searchParams.set('w', String(width));
      url.searchParams.set('q', String(quality));
      return url.toString();
    }
  } catch {
    return src;
  }

  return src;
}

export function getImageSrcSet(src, widths, options = {}) {
  if (!src || !Array.isArray(widths) || widths.length === 0) return undefined;

  return widths
    .map(width => `${getOptimizedImageUrl(src, { ...options, width })} ${width}w`)
    .join(', ');
}
