import { del, get, list, put } from '@vercel/blob';

const defaultBlobClient = { del, get, list, put };
const blobAccess = 'private';

function makeOrderId() {
  return `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function compact(value) {
  return String(value || '').trim();
}

function safeKey(value) {
  return compact(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'guest';
}

function toAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function toDateParts(now) {
  const date = now();
  return {
    date: date.toISOString().split('T')[0],
    created_at: date.toISOString()
  };
}

function normalizeCheckout(payload, idFactory, now) {
  const id = idFactory();
  const { date, created_at } = toDateParts(now);
  const firstName = compact(payload.firstName);
  const lastName = compact(payload.lastName);
  const customerName = compact(`${firstName} ${lastName}`) || 'Guest Customer';
  const email = compact(payload.email);
  const phone = compact(payload.phone);
  const address = compact(payload.address);
  const cartItems = Array.isArray(payload.cartItems) ? payload.cartItems : [];
  const totalAmount = toAmount(payload.totalAmount);
  const paymentMethod = compact(payload.paymentMethod) || 'Credit Card';
  const customerId = `customer-${safeKey(email || phone || id)}`;

  return {
    order: {
      id,
      customer_name: customerName,
      email,
      phone,
      address,
      items: JSON.stringify(cartItems),
      total_amount: totalAmount,
      status: 'Processing',
      date,
      created_at
    },
    payment: {
      id: `payment-${id}`,
      order_id: id,
      amount: totalAmount,
      method: paymentMethod,
      status: 'Completed',
      date,
      created_at
    },
    customer: {
      id: customerId,
      name: customerName,
      email,
      phone,
      auth_provider: 'guest',
      join_date: date,
      updated_at: created_at
    }
  };
}

function createBlobOrderStore({ blobClient, env, idFactory, now }) {
  const token = env.BLOB_READ_WRITE_TOKEN;
  const commandOptions = { token };
  const jsonPutOptions = {
    access: blobAccess,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: 'application/json',
    token
  };

  async function putJson(pathname, value) {
    await blobClient.put(pathname, JSON.stringify(value), jsonPutOptions);
  }

  async function getJson(pathname) {
    const result = await blobClient.get(pathname, {
      access: blobAccess,
      token,
      useCache: false
    });

    if (!result?.stream) return null;
    return new Response(result.stream).json();
  }

  async function listJson(prefix) {
    const records = [];
    let cursor;

    do {
      const page = await blobClient.list({
        ...commandOptions,
        cursor,
        limit: 1000,
        prefix
      });

      for (const blob of page.blobs) {
        const record = await getJson(blob.pathname);
        if (record) records.push(record);
      }

      cursor = page.cursor;
      if (!page.hasMore) break;
    } while (cursor);

    return records.sort((a, b) => String(b.created_at || b.id).localeCompare(String(a.created_at || a.id)));
  }

  async function deletePrefix(prefix) {
    const paths = [];
    let cursor;

    do {
      const page = await blobClient.list({
        ...commandOptions,
        cursor,
        limit: 1000,
        prefix
      });

      paths.push(...page.blobs.map((blob) => blob.pathname));
      cursor = page.cursor;
      if (!page.hasMore) break;
    } while (cursor);

    if (paths.length > 0) {
      await blobClient.del(paths, commandOptions);
    }
  }

  return {
    async createCheckout(payload) {
      const { order, payment, customer } = normalizeCheckout(payload, idFactory, now);

      await Promise.all([
        putJson(`orders/${order.id}.json`, order),
        putJson(`payments/${payment.id}.json`, payment),
        putJson(`customers/${customer.id}.json`, customer)
      ]);

      return { orderId: order.id, order };
    },
    listOrders() {
      return listJson('orders/');
    },
    listPayments() {
      return listJson('payments/');
    },
    listCustomers() {
      return listJson('customers/');
    },
    async listCustomerOrders(email, phone) {
      const targetEmail = compact(email);
      const targetPhone = compact(phone);
      const orders = await listJson('orders/');

      return orders.filter((order) => (
        (targetEmail && order.email === targetEmail) ||
        (targetPhone && order.phone === targetPhone)
      ));
    },
    deleteOrder(id) {
      return blobClient.del(`orders/${id}.json`, commandOptions);
    },
    deletePayment(id) {
      return blobClient.del(`payments/${id}.json`, commandOptions);
    },
    deleteCustomer(id) {
      return blobClient.del(`customers/${id}.json`, commandOptions);
    },
    clearOrders() {
      return deletePrefix('orders/');
    },
    clearPayments() {
      return deletePrefix('payments/');
    },
    clearCustomers() {
      return deletePrefix('customers/');
    }
  };
}

function createSqliteOrderStore({ db, idFactory, now }) {
  if (!db) {
    throw new Error('SQLite order store requires a database instance');
  }

  return {
    async createCheckout(payload) {
      const { order, payment, customer } = normalizeCheckout(payload, idFactory, now);
      const existingCustomer = db.get('SELECT id FROM customers WHERE email = ? OR phone = ?', [customer.email || null, customer.phone || null]);

      if (!existingCustomer) {
        db.run(
          'INSERT INTO customers (name, email, phone, auth_provider, join_date) VALUES (?, ?, ?, ?, ?)',
          [customer.name, customer.email || null, customer.phone || null, customer.auth_provider, customer.join_date]
        );
      }

      const orderResult = db.run(
        'INSERT INTO orders (customer_name, email, phone, address, items, total_amount, status, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [order.customer_name, order.email, order.phone, order.address, order.items, order.total_amount, order.status, order.date]
      );
      const orderId = orderResult.lastID;
      const finalOrder = { ...order, id: orderId };

      db.run(
        'INSERT INTO payments (order_id, amount, method, status, date) VALUES (?, ?, ?, ?, ?)',
        [orderId, payment.amount, payment.method, payment.status, payment.date]
      );

      return { orderId, order: finalOrder };
    },
    async listOrders() {
      return db.all('SELECT * FROM orders ORDER BY id DESC');
    },
    async listPayments() {
      return db.all('SELECT * FROM payments ORDER BY id DESC');
    },
    async listCustomers() {
      return db.all('SELECT * FROM customers ORDER BY id DESC');
    },
    async listCustomerOrders(email, phone) {
      return db.all(
        'SELECT * FROM orders WHERE email = ? OR phone = ? ORDER BY id DESC',
        [email || null, phone || null]
      );
    },
    async deleteOrder(id) {
      db.run('DELETE FROM orders WHERE id = ?', [id]);
    },
    async deletePayment(id) {
      db.run('DELETE FROM payments WHERE id = ?', [id]);
    },
    async deleteCustomer(id) {
      db.run('DELETE FROM customers WHERE id = ?', [id]);
    },
    async clearOrders() {
      db.run('DELETE FROM orders', []);
      db.run("DELETE FROM sqlite_sequence WHERE name='orders'", []);
    },
    async clearPayments() {
      db.run('DELETE FROM payments', []);
    },
    async clearCustomers() {
      db.run('DELETE FROM customers', []);
      db.run("DELETE FROM sqlite_sequence WHERE name='customers'", []);
    }
  };
}

export function createOrderStore({
  db,
  blobClient = defaultBlobClient,
  env = globalThis.process?.env || {},
  idFactory = makeOrderId,
  now = () => new Date()
} = {}) {
  if (env.BLOB_READ_WRITE_TOKEN) {
    return createBlobOrderStore({ blobClient, env, idFactory, now });
  }

  return createSqliteOrderStore({ db, idFactory, now });
}
