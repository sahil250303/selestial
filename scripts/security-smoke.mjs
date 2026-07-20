// Security-hardening smoke test: boots the real server and probes the new
// validation, rate limiting, backoff, role enforcement and error handling.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = '3971';
const base = `http://127.0.0.1:${port}`;
const dbPath = join(mkdtempSync(join(tmpdir(), 'selestial-smoke-')), 'smoke.sqlite');

const child = spawn(process.execPath, ['server.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: port,
    JWT_SECRET: 'smoke-test-secret-not-for-production-0123456789abcdef',
    ADMIN_PASSWORD: 'Sm0ke-Admin-Pass!',
    SQLITE_DB_PATH: dbPath,
    AUTH_BACKOFF_FREE_ATTEMPTS: '2',
    AUTH_BACKOFF_BASE_MS: '60000',
    RATE_LIMIT_AUTH_MAX: '50',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', (c) => { logs += c; });
child.stderr.on('data', (c) => { logs += c; });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function ready() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited: ${child.exitCode}\n${logs}`);
    try { const r = await fetch(`${base}/api/health`); if (r.ok) return; } catch {}
    await wait(250);
  }
  throw new Error(`server never became healthy\n${logs}`);
}

let failures = 0;
async function check(name, fn) {
  try { await fn(); console.log(`PASS ${name}`); }
  catch (e) { failures++; console.log(`FAIL ${name}: ${e.message}`); }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const post = (path, body, headers = {}) => fetch(base + path, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
});

try {
  await ready();

  await check('unknown API route returns JSON 404', async () => {
    const r = await fetch(`${base}/api/customer/wishlist`);
    assert(r.status === 404, `status ${r.status}`);
    assert((r.headers.get('content-type') || '').includes('json'), 'not json');
  });

  await check('rate limit headers present on public routes', async () => {
    const r = await fetch(`${base}/api/products`);
    assert(r.ok, `status ${r.status}`);
    assert(r.headers.get('ratelimit-policy') || r.headers.get('ratelimit'), 'no RateLimit headers');
  });

  await check('unknown body field rejected (strict schema)', async () => {
    const r = await post('/api/auth/login', { username: 'admin', password: 'x', hax: 1 });
    assert(r.status === 400, `status ${r.status}`);
    const j = await r.json();
    assert(/hax/.test(j.error), `unexpected error: ${j.error}`);
  });

  await check('wrong type rejected', async () => {
    const r = await post('/api/auth/login', { username: 'admin', password: 12345 });
    assert(r.status === 400, `status ${r.status}`);
  });

  await check('oversized field rejected', async () => {
    const r = await post('/api/newsletter/subscribe', { email: 'a'.repeat(300) + '@x.com' });
    assert(r.status === 400, `status ${r.status}`);
  });

  await check('malformed JSON returns generic 400', async () => {
    const r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' });
    assert(r.status === 400, `status ${r.status}`);
    const j = await r.json();
    assert(j.error === 'Invalid JSON in request body', `got: ${j.error}`);
  });

  await check('admin login works with correct password', async () => {
    const r = await post('/api/auth/login', { username: 'admin', password: 'Sm0ke-Admin-Pass!' });
    assert(r.status === 200, `status ${r.status}`);
    const j = await r.json();
    assert(j.token, 'no token');
    globalThis.adminToken = j.token;
  });

  await check('per-account backoff kicks in after free attempts (429 + Retry-After)', async () => {
    let last;
    for (let i = 0; i < 4; i++) last = await post('/api/auth/login', { username: 'admin', password: 'wrong-pass' });
    assert(last.status === 429, `status ${last.status}`);
    assert(last.headers.get('retry-after'), 'no Retry-After header');
  });

  await check('backoff is per-account: other username unaffected', async () => {
    const r = await post('/api/auth/login', { username: 'other-admin', password: 'wrong' });
    assert(r.status === 401, `status ${r.status}`);
  });

  await check('customer token CANNOT access admin routes', async () => {
    const s = await post('/api/auth/customer/signup', { name: 'Eve', email: 'eve@smoke.test', password: 'longenough-pw-123' });
    assert(s.status === 201, `signup status ${s.status}`);
    const { token } = await s.json();
    const r = await fetch(`${base}/api/customers`, { headers: { Authorization: `Bearer ${token}` } });
    assert(r.status === 401, `expected 401, got ${r.status}`);
  });

  await check('admin token CAN access admin routes', async () => {
    const r = await fetch(`${base}/api/customers`, { headers: { Authorization: `Bearer ${globalThis.adminToken}` } });
    assert(r.status === 200, `status ${r.status}`);
  });

  await check('short signup password rejected', async () => {
    const r = await post('/api/auth/customer/signup', { name: 'A', email: 'short@smoke.test', password: 'short' });
    assert(r.status === 400, `status ${r.status}`);
  });

  await check('review with out-of-range rating rejected', async () => {
    const r = await post('/api/products/1/reviews', { rating: 9, comment: 'nice' });
    assert(r.status === 400, `status ${r.status}`);
  });

  await check('non-integer product id rejected', async () => {
    const r = await fetch(`${base}/api/products/1;DROP`);
    assert(r.status === 400 || r.status === 404, `status ${r.status}`);
  });

  await check('traversal filename on uploads rejected', async () => {
    const r = await fetch(`${base}/api/uploads/..%2F..%2Fdb.js`);
    assert(r.status === 400 || r.status === 404, `status ${r.status}`);
  });

  await check('svg filename no longer servable from uploads', async () => {
    const r = await fetch(`${base}/api/uploads/evil.svg`);
    assert(r.status === 400, `status ${r.status}`);
  });

  await check('checkout rejects unknown fields', async () => {
    const r = await post('/api/checkout', {
      firstName: 'A', email: 'a@b.co', address: '1 Main Street', cartItems: [{ id: 1, quantity: 1 }], evil: true,
    });
    assert(r.status === 400, `status ${r.status}`);
  });

  await check('valid checkout succeeds with server-side pricing', async () => {
    const r = await post('/api/checkout', {
      firstName: 'Smoke', lastName: 'Test', email: 'smoke@test.dev', phone: '+1 555 010 2030',
      address: '1 Main Street, Springfield', paymentMethod: 'Credit Card',
      cartItems: [{ id: 1, quantity: 1, cartItemId: '1-Free Size-Silver', stockLimit: 10, name: 'HACKED', price: 0.01 }],
      totalAmount: 0.01,
    });
    assert(r.status === 201, `status ${r.status}: ${await r.text()}`);
  });

  await check('stored order used DB price, not client price', async () => {
    const r = await fetch(`${base}/api/orders`, { headers: { Authorization: `Bearer ${globalThis.adminToken}` } });
    const orders = await r.json();
    const order = orders[0];
    assert(order && order.total_amount === 145, `total ${order && order.total_amount}`);
    const items = JSON.parse(order.items);
    assert(items[0].name !== 'HACKED' && items[0].price === 145, `item not rebuilt: ${order.items}`);
  });

  console.log(failures === 0 ? '\nALL SMOKE CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
} finally {
  child.kill();
}
process.exit(failures === 0 ? 0 : 1);
