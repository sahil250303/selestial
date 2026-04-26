import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const STORE_NAME = process.env.STORE_NAME || 'Selestial';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

/**
 * Formats the cart items into an HTML table for the email.
 */
function formatItemsHtml(items) {
  let itemsJson = [];
  try {
    itemsJson = typeof items === 'string' ? JSON.parse(items) : items;
  } catch (e) {
    console.error("Error parsing items for email:", e);
  }

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
    html += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px;">
          <strong>${item.name}</strong><br>
          <small>${item.size ? `Size: ${item.size}` : ''} ${item.color ? `| Color: ${item.color}` : ''}</small>
        </td>
        <td style="padding: 12px; text-align: center;">${item.quantity || item.qty || 1}</td>
        <td style="padding: 12px; text-align: right;">$${item.price}</td>
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
 * Sends a notification email to the admin about a new order.
 */
export async function sendNewOrderAdminEmail(order) {
  if (!ADMIN_EMAIL || !process.env.SMTP_USER) {
    console.warn("Email configuration missing. Skipping admin notification.");
    return;
  }

  const itemsHtml = formatItemsHtml(order.items);

  const mailOptions = {
    from: `"${STORE_NAME} Notifications" <${process.env.SMTP_USER}>`,
    to: ADMIN_EMAIL,
    subject: `New Order Received - #${order.id || 'N/A'}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
        <h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">New Order Received!</h2>
        <p>You have received a new order from <strong>${order.customer_name}</strong>.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p><strong>Order ID:</strong> #${order.id}</p>
          <p><strong>Date:</strong> ${order.date}</p>
          <p><strong>Total Amount:</strong> $${order.total_amount}</p>
        </div>

        <h3>Customer Details:</h3>
        <p>
          <strong>Name:</strong> ${order.customer_name}<br>
          <strong>Email:</strong> ${order.email}<br>
          <strong>Phone:</strong> ${order.phone || 'N/A'}<br>
          <strong>Address:</strong> ${order.address}
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
    console.log(`Admin notification sent for order ${order.id}`);
  } catch (error) {
    console.error("Error sending admin email:", error);
  }
}

/**
 * Sends an order confirmation and thank-you email to the customer.
 */
export async function sendOrderConfirmationCustomerEmail(order) {
  if (!order.email || !process.env.SMTP_USER) {
    console.warn("Customer email or SMTP user missing. Skipping customer confirmation.");
    return;
  }

  const itemsHtml = formatItemsHtml(order.items);

  const mailOptions = {
    from: `"${STORE_NAME}" <${process.env.SMTP_USER}>`,
    to: order.email,
    subject: `Thank you for your order from ${STORE_NAME}! (#${order.id || 'N/A'})`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
           <h1 style="color: #000; margin: 0;">${STORE_NAME}</h1>
           <p style="color: #666; font-style: italic;">Universe of Silver</p>
        </div>

        <h2 style="color: #000;">Thank you for your order, ${order.customer_name}!</h2>
        <p>We've received your order and we're getting it ready for you. You'll receive another email when your order ships.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #000;">
          <p style="margin: 5px 0;"><strong>Order Number:</strong> #${order.id}</p>
          <p style="margin: 5px 0;"><strong>Expected Total:</strong> $${order.total_amount}</p>
        </div>

        <h3>Order Summary:</h3>
        ${itemsHtml}

        <div style="margin-top: 20px;">
          <p><strong>Shipping Address:</strong><br>${order.address.replace(/\n/g, '<br>')}</p>
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
          <p>If you have any questions, just reply to this email.</p>
          <p style="font-weight: bold;">Thank you for choosing ${STORE_NAME}!</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Customer confirmation sent to ${order.email} for order ${order.id}`);
  } catch (error) {
    console.error("Error sending customer email:", error);
  }
}
