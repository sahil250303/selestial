import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getUploadCacheHeaders,
  isSafeUploadFilename,
  parseImageVariantOptions
} from './imageOptimizer.js';

test('parses a bounded webp upload variant request', () => {
  assert.deepEqual(
    parseImageVariantOptions({ w: '640', q: '72', format: 'webp' }),
    { width: 640, quality: 72, format: 'webp' }
  );
});

test('clamps uploaded image variants to supported width and quality ranges', () => {
  assert.deepEqual(
    parseImageVariantOptions({ w: '9999', q: '5' }),
    { width: 1600, quality: 50, format: 'webp' }
  );
});

test('skips image transforms when no width is requested', () => {
  assert.equal(parseImageVariantOptions({ q: '70' }), null);
});

test('rejects unsafe upload filenames before touching the filesystem', () => {
  assert.equal(isSafeUploadFilename('1776272108381-527846343.jpg'), true);
  assert.equal(isSafeUploadFilename('../secret.jpg'), false);
  assert.equal(isSafeUploadFilename('nested/path.jpg'), false);
  assert.equal(isSafeUploadFilename('nested\\path.jpg'), false);
});

test('sets long-lived immutable cache headers for transformed uploads', () => {
  assert.deepEqual(getUploadCacheHeaders('image/webp'), {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'CDN-Cache-Control': 'public, s-maxage=31536000, immutable',
    'Content-Type': 'image/webp'
  });
});
