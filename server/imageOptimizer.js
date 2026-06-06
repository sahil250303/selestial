import fs from 'fs/promises';
import { existsSync } from 'fs';
import { basename, extname, join, parse } from 'path';
import sharp from 'sharp';

const SUPPORTED_WIDTHS = [96, 160, 240, 320, 480, 640, 960, 1200, 1600];
const MIN_QUALITY = 50;
const MAX_QUALITY = 85;
const DEFAULT_UPLOAD_QUALITY = 82;
const DEFAULT_MAX_DIMENSION = 1600;

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function nearestSupportedWidth(width) {
  return SUPPORTED_WIDTHS.find(supportedWidth => width <= supportedWidth) || SUPPORTED_WIDTHS.at(-1);
}

function contentTypeForFilename(filename) {
  const extension = extname(filename).toLowerCase();
  if (extension === '.webp') return 'image/webp';
  if (extension === '.png') return 'image/png';
  if (extension === '.gif') return 'image/gif';
  if (extension === '.svg') return 'image/svg+xml';
  return 'image/jpeg';
}

export function isSafeUploadFilename(filename) {
  return (
    typeof filename === 'string' &&
    filename.length > 0 &&
    basename(filename) === filename &&
    !filename.includes('..') &&
    /^[A-Za-z0-9._-]+$/.test(filename)
  );
}

export function parseImageVariantOptions(query = {}) {
  const requestedWidth = Number.parseInt(firstQueryValue(query.w), 10);
  if (!Number.isFinite(requestedWidth) || requestedWidth <= 0) {
    return null;
  }

  return {
    width: nearestSupportedWidth(requestedWidth),
    quality: clampNumber(firstQueryValue(query.q), MIN_QUALITY, MAX_QUALITY, 72),
    format: 'webp'
  };
}

export function getUploadCacheHeaders(contentType) {
  return {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'CDN-Cache-Control': 'public, s-maxage=31536000, immutable',
    'Content-Type': contentType
  };
}

export async function optimizeUploadedImage(file, options = {}) {
  const outputDir = options.outputDir || parse(file.path).dir;
  const maxDimension = options.maxDimension || DEFAULT_MAX_DIMENSION;
  const quality = options.quality || DEFAULT_UPLOAD_QUALITY;
  const safeBase = parse(file.filename).name.replace(/[^A-Za-z0-9_-]/g, '-');
  const optimizedFilename = `${safeBase}-optimized.webp`;
  const optimizedPath = join(outputDir, optimizedFilename);

  await sharp(file.path)
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality, effort: 4 })
    .toFile(optimizedPath);

  if (file.path !== optimizedPath) {
    await fs.unlink(file.path).catch(() => {});
  }

  return {
    filename: optimizedFilename,
    path: optimizedPath,
    url: `/api/uploads/${optimizedFilename}`
  };
}

function variantFilenameFor(filename, variant) {
  const safeBase = parse(filename).name.replace(/[^A-Za-z0-9_-]/g, '-');
  return `${safeBase}-w${variant.width}-q${variant.quality}.${variant.format}`;
}

export async function sendUploadImage(req, res, { uploadDir }) {
  const { filename } = req.params;
  if (!isSafeUploadFilename(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const sourcePath = join(uploadDir, filename);
  if (!existsSync(sourcePath)) {
    return res.status(404).json({ error: 'Image not found' });
  }

  const variant = parseImageVariantOptions(req.query);
  if (!variant) {
    return res.sendFile(sourcePath, {
      headers: getUploadCacheHeaders(contentTypeForFilename(filename))
    });
  }

  const cacheDir = join(uploadDir, 'cache');
  await fs.mkdir(cacheDir, { recursive: true });
  const cachedVariantPath = join(cacheDir, variantFilenameFor(filename, variant));

  if (!existsSync(cachedVariantPath)) {
    await sharp(sourcePath)
      .rotate()
      .resize({
        width: variant.width,
        height: variant.width,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: variant.quality, effort: 4 })
      .toFile(cachedVariantPath);
  }

  return res.sendFile(cachedVariantPath, {
    headers: getUploadCacheHeaders('image/webp')
  });
}
