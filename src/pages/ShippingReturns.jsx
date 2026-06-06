import React from 'react';
import { Helmet } from 'react-helmet-async';

function Section({ title, children }) {
  return (
    <div className="mb-10">
      <h2 className="font-serif text-lg text-white tracking-widest uppercase mb-4 border-b border-white/10 pb-3">{title}</h2>
      <div className="text-silver-dark text-sm tracking-wider leading-loose font-light space-y-3">{children}</div>
    </div>
  );
}

export default function ShippingReturns() {
  return (
    <div className="pt-32 pb-24 px-6 lg:px-12 max-w-3xl mx-auto relative z-10">
      <Helmet>
        <title>Shipping & Returns | Selestial</title>
        <meta name="description" content="Selestial shipping policy — free shipping over $100, international delivery, and our 30-day return policy." />
        <link rel="canonical" href="https://selestial.vercel.app/shipping-returns" />
      </Helmet>
      <h1 className="font-serif text-3xl md:text-4xl text-white tracking-widest uppercase mb-12">Shipping & Returns</h1>

      <Section title="Order Processing">
        <p>All orders are processed within 1–3 business days (excluding weekends and public holidays). You will receive an order confirmation email once your order is placed, and a shipping confirmation with tracking information when your order is dispatched.</p>
      </Section>

      <Section title="Domestic Shipping (USA)">
        <p><strong className="text-white">Standard Shipping (5–7 business days):</strong> $8.00</p>
        <p><strong className="text-white">Express Shipping (2–3 business days):</strong> $18.00</p>
        <p><strong className="text-white">Free Standard Shipping</strong> on all orders over $100.</p>
      </Section>

      <Section title="International Shipping">
        <p>We ship to most countries worldwide. International shipping rates and estimated delivery times are calculated at checkout based on your location. Please note that customers are responsible for any applicable customs duties, taxes, or import fees.</p>
        <p>International delivery typically takes 7–14 business days depending on your country and customs processing times.</p>
      </Section>

      <Section title="Returns — 30-Day Window">
        <p>We want you to love your Selestial piece. If for any reason you are not completely satisfied, we offer a hassle-free 30-day return policy from the date of delivery.</p>
        <p><strong className="text-white">Eligible items:</strong> Unused, unworn items in their original condition with all original packaging and any accompanying materials.</p>
        <p><strong className="text-white">Non-eligible items:</strong> Custom or engraved pieces, earrings (for hygiene reasons), and items showing signs of wear or damage.</p>
      </Section>

      <Section title="How to Return">
        <p>1. Email us at <a href="mailto:hello@selestial.com" className="text-white hover:underline">hello@selestial.com</a> with your order number and the reason for return.</p>
        <p>2. We will provide a return authorisation and shipping instructions within 2 business days.</p>
        <p>3. Pack your item securely in its original packaging.</p>
        <p>4. Return shipping costs are at the customer's expense unless the item is faulty or incorrectly sent.</p>
        <p>5. Refunds are processed within 5–7 business days of receiving the returned item and will be credited to your original payment method.</p>
      </Section>

      <Section title="Faulty or Damaged Items">
        <p>If you receive a faulty or damaged item, please contact us within 48 hours of delivery with photographs of the damage. We will arrange a replacement or full refund at no cost to you.</p>
      </Section>
    </div>
  );
}
