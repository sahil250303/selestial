import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderStore } from './orderStore.js';

function createMemoryBlobClient() {
  const files = new Map();

  return {
    async put(pathname, body) {
      files.set(pathname, String(body));
      return { pathname, url: `memory://${pathname}`, downloadUrl: `memory://${pathname}` };
    },
    async list({ prefix = '' } = {}) {
      const blobs = [...files.keys()]
        .filter((pathname) => pathname.startsWith(prefix))
        .sort()
        .map((pathname) => ({
          pathname,
          url: `memory://${pathname}`,
          downloadUrl: `memory://${pathname}`,
          uploadedAt: new Date(0),
          size: files.get(pathname).length,
          etag: pathname
        }));

      return { blobs, hasMore: false };
    },
    async get(pathname) {
      const body = files.get(pathname);
      if (!body) return null;

      return {
        statusCode: 200,
        stream: new Response(body).body,
        blob: { pathname, url: `memory://${pathname}`, contentType: 'application/json' }
      };
    },
    async del(pathnames) {
      for (const pathname of Array.isArray(pathnames) ? pathnames : [pathnames]) {
        files.delete(pathname);
      }
    }
  };
}

test('blob checkout storage persists records for admin readers', async () => {
  const blobClient = createMemoryBlobClient();
  const store = createOrderStore({
    blobClient,
    env: { BLOB_READ_WRITE_TOKEN: 'test-token' },
    idFactory: () => 'order-100'
  });

  const result = await store.createCheckout({
    firstName: 'Asha',
    lastName: 'Rao',
    email: 'asha@example.com',
    phone: '9876543210',
    address: 'Moon Street',
    cartItems: [{ name: 'Lunar Ring', price: 120, quantity: 2, size: 'M', color: 'Silver' }],
    totalAmount: 240,
    paymentMethod: 'Credit Card'
  });

  assert.equal(result.orderId, 'order-100');

  const [orders, payments, customers] = await Promise.all([
    store.listOrders(),
    store.listPayments(),
    store.listCustomers()
  ]);

  assert.equal(orders.length, 1);
  assert.equal(orders[0].id, 'order-100');
  assert.equal(orders[0].customer_name, 'Asha Rao');
  assert.equal(orders[0].total_amount, 240);
  assert.equal(JSON.parse(orders[0].items)[0].name, 'Lunar Ring');

  assert.equal(payments.length, 1);
  assert.equal(payments[0].order_id, 'order-100');
  assert.equal(payments[0].status, 'Completed');

  assert.equal(customers.length, 1);
  assert.equal(customers[0].email, 'asha@example.com');
});
