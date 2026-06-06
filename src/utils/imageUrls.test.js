import assert from 'node:assert/strict';
import test from 'node:test';
import { getImageSrcSet, getOptimizedImageUrl } from './imageUrls.js';

test('adds responsive transform params to uploaded product images', () => {
  assert.equal(
    getOptimizedImageUrl('/api/uploads/ring.jpg', { width: 640, quality: 72 }),
    '/api/uploads/ring.jpg?w=640&q=72&format=webp'
  );
});

test('keeps uploaded image query params when building a srcset', () => {
  assert.equal(
    getImageSrcSet('/api/uploads/ring.jpg?token=abc', [160, 320], { quality: 68 }),
    '/api/uploads/ring.jpg?token=abc&w=160&q=68&format=webp 160w, /api/uploads/ring.jpg?token=abc&w=320&q=68&format=webp 320w'
  );
});

test('updates Unsplash width and quality instead of routing through the API transformer', () => {
  const actual = getOptimizedImageUrl(
    'https://images.unsplash.com/photo-123?auto=format&fit=crop&q=80&w=400',
    { width: 960, quality: 70 }
  );
  const url = new URL(actual);

  assert.equal(url.origin, 'https://images.unsplash.com');
  assert.equal(url.searchParams.get('w'), '960');
  assert.equal(url.searchParams.get('q'), '70');
  assert.equal(url.searchParams.get('auto'), 'format');
  assert.equal(url.searchParams.get('fit'), 'crop');
});
