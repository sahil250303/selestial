import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderEmailService } from './email.js';

const sampleOrder = {
  id: 'order-123',
  customer_name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '9876543210',
  address: 'Moon Street\nUnit 4',
  items: JSON.stringify([
    { name: 'Lunar Ring', price: 120, quantity: 2, size: 'M', color: 'Silver' }
  ]),
  total_amount: 240,
  date: '2026-04-27'
};

function createRecordingEmailService() {
  const sent = [];
  const service = createOrderEmailService({
    env: {
      SMTP_USER: 'orders@selestial.test',
      ADMIN_EMAIL: 'owner@selestial.test',
      STORE_NAME: 'Selestial'
    },
    transporter: {
      async sendMail(message) {
        sent.push(message);
      }
    },
    logger: {
      log() {},
      warn() {},
      error() {}
    }
  });

  return { sent, service };
}

test('order email service sends order details to admin and customer', async () => {
  const { sent, service } = createRecordingEmailService();

  await service.sendOrderEmails(sampleOrder);

  assert.equal(sent.length, 2);

  const adminEmail = sent.find((message) => message.to === 'owner@selestial.test');
  assert.ok(adminEmail);
  assert.match(adminEmail.subject, /New Order Received/);
  assert.match(adminEmail.html, /Asha Rao/);
  assert.match(adminEmail.html, /asha@example\.com/);
  assert.match(adminEmail.html, /9876543210/);
  assert.match(adminEmail.html, /Lunar Ring/);
  assert.match(adminEmail.html, /\$240\.00/);

  const customerEmail = sent.find((message) => message.to === 'asha@example.com');
  assert.ok(customerEmail);
  assert.match(customerEmail.subject, /Thank you for your order/);
  assert.match(customerEmail.html, /Thank you for your order, Asha Rao!/);
  assert.match(customerEmail.html, /Order Number/);
  assert.match(customerEmail.html, /Lunar Ring/);
  assert.match(customerEmail.html, /Thank you for choosing Selestial/);
});

test('order email service escapes customer-provided order details', async () => {
  const { sent, service } = createRecordingEmailService();

  await service.sendOrderEmails({
    ...sampleOrder,
    customer_name: '<script>alert("x")</script>',
    address: '<b>Moon Street</b>',
    items: JSON.stringify([
      { name: '<img src=x onerror=alert(1)>', price: 120, quantity: 1 }
    ])
  });

  for (const message of sent) {
    assert.doesNotMatch(message.html, /<script>/);
    assert.doesNotMatch(message.html, /<img src=x/);
    assert.doesNotMatch(message.html, /<b>Moon Street<\/b>/);
    assert.match(message.html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
    assert.match(message.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  }
});
