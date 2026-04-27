import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

function createTransporter(env) {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT || '587'),
    secure: env.SMTP_PORT === '465',
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

function formatCurrency(value) {
  const amount = Number(value);
  return `$${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAddressHtml(address) {
  return escapeHtml(address).replace(/\r?\n/g, '<br>');
}

function parseItems(items) {
  try {
    return typeof items === 'string' ? JSON.parse(items) : items;
  } catch (e) {
    console.error("Error parsing items for email:", e);
    return [];
  }
}

/**
 * Formats the cart items into an HTML table for the email.
 */
function formatItemsHtml(items) {
  const itemsJson = parseItems(items);

  if (!Array.isArray(itemsJson) || itemsJson.length === 0) return '<p>No items listed.</p>';

  let html = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <thead>
        <tr style="background-color: #f8f8f8; border-bottom: 2px solid #eee;">
          <th style="padding: 12px; text-align: left;">Item</th>
          <th style="padding: 12px; text-align: center;">Qty</th>
          <th style="padding: 12px; text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
  `;

  itemsJson.forEach(item => {
    const details = [
      item.size ? `Size: ${escapeHtml(item.size)}` : '',
      item.color ? `Color: ${escapeHtml(item.color)}` : ''
    ].filter(Boolean).join(' | ');

    html += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px;">
          <strong>${escapeHtml(item.name)}</strong><br>
          <small>${details}</small>
        </td>
        <td style="padding: 12px; text-align: center;">${escapeHtml(item.quantity || item.qty || 1)}</td>
        <td style="padding: 12px; text-align: right;">${formatCurrency(item.price)}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
}

/**
 * Creates an email service for order notifications.
 */
export function createOrderEmailService({
  env = globalThis.process?.env || {},
  transporter = createTransporter(env),
  logger = console
} = {}) {
  const storeName = env.STORE_NAME || 'Selestial';
  const adminEmail = env.ADMIN_EMAIL;
  const fromEmail = env.SMTP_USER;

  async function sendNewOrderAdminEmail(order) {
    if (!adminEmail || !fromEmail) {
      logger.warn("Email configuration missing. Skipping admin notification.");
      return;
    }

    const itemsHtml = formatItemsHtml(order.items);
    const orderId = escapeHtml(order.id || 'N/A');
    const customerName = escapeHtml(order.customer_name);

    const mailOptions = {
      from: `"${storeName} Notifications" <${fromEmail}>`,
      to: adminEmail,
      subject: `New Order Received - #${order.id || 'N/A'}`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
          <h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">New Order Received!</h2>
          <p>You have received a new order from <strong>${customerName}</strong>.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p><strong>Order ID:</strong> #${orderId}</p>
            <p><strong>Date:</strong> ${escapeHtml(order.date)}</p>
            <p><strong>Total Amount:</strong> ${formatCurrency(order.total_amount)}</p>
          </div>

          <h3>Customer Details:</h3>
          <p>
            <strong>Name:</strong> ${customerName}<br>
            <strong>Email:</strong> ${escapeHtml(order.email)}<br>
            <strong>Phone:</strong> ${escapeHtml(order.phone || 'N/A')}<br>
            <strong>Address:</strong> ${formatAddressHtml(order.address)}
          </p>

          <h3>Order Items:</h3>
          ${itemsHtml}

          <p style="margin-top: 30px; font-size: 12px; color: #888; text-align: center;">
            This is an automated notification from your store.
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      logger.log(`Admin notification sent for order ${order.id}`);
    } catch (error) {
      logger.error("Error sending admin email:", error);
    }
  }

  async function sendOrderConfirmationCustomerEmail(order) {
    if (!order.email || !fromEmail) {
      logger.warn("Customer email or SMTP user missing. Skipping customer confirmation.");
      return;
    }

    const itemsHtml = formatItemsHtml(order.items);
    const orderId = escapeHtml(order.id || 'N/A');
    const customerName = escapeHtml(order.customer_name);

    const mailOptions = {
      from: `"${storeName}" <${fromEmail}>`,
      to: order.email,
      subject: `Thank you for your order from ${storeName}! (#${order.id || 'N/A'})`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 30px;">
             <h1 style="color: #000; margin: 0;">${escapeHtml(storeName)}</h1>
             <p style="color: #666; font-style: italic;">Universe of Silver</p>
          </div>

          <h2 style="color: #000;">Thank you for your order, ${customerName}!</h2>
          <p>We've received your order and we're getting it ready for you. You'll receive another email when your order ships.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #000;">
            <p style="margin: 5px 0;"><strong>Order Number:</strong> #${orderId}</p>
            <p style="margin: 5px 0;"><strong>Expected Total:</strong> ${formatCurrency(order.total_amount)}</p>
          </div>

          <h3>Order Summary:</h3>
          ${itemsHtml}

          <div style="margin-top: 20px;">
            <p><strong>Shipping Address:</strong><br>${formatAddressHtml(order.address)}</p>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p>If you have any questions, just reply to this email.</p>
            <p style="font-weight: bold;">Thank you for choosing ${escapeHtml(storeName)}!</p>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      logger.log(`Customer confirmation sent to ${order.email} for order ${order.id}`);
    } catch (error) {
      logger.error("Error sending customer email:", error);
    }
  }

  async function sendOrderEmails(order) {
    await Promise.all([
      sendNewOrderAdminEmail(order),
      sendOrderConfirmationCustomerEmail(order)
    ]);
  }

  return {
    sendNewOrderAdminEmail,
    sendOrderConfirmationCustomerEmail,
    sendOrderEmails
  };
}

const defaultOrderEmailService = createOrderEmailService();

export const sendNewOrderAdminEmail = defaultOrderEmailService.sendNewOrderAdminEmail;
export const sendOrderConfirmationCustomerEmail = defaultOrderEmailService.sendOrderConfirmationCustomerEmail;
export const sendOrderEmails = defaultOrderEmailService.sendOrderEmails;
