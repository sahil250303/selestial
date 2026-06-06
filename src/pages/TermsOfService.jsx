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

export default function TermsOfService() {
  return (
    <div className="pt-32 pb-24 px-6 lg:px-12 max-w-3xl mx-auto relative z-10">
      <Helmet>
        <title>Terms of Service | Selestial</title>
        <meta name="description" content="Selestial terms of service — the terms governing your use of our website and purchase of our products." />
        <link rel="canonical" href="https://selestial.vercel.app/terms" />
      </Helmet>
      <h1 className="font-serif text-3xl md:text-4xl text-white tracking-widest uppercase mb-4">Terms of Service</h1>
      <p className="text-silver-dark text-xs tracking-widest mb-12">Last updated: June 2026</p>

      <Section title="Acceptance of Terms">
        <p>By accessing or purchasing from Selestial, you agree to be bound by these Terms of Service. If you do not agree, please do not use our website or services.</p>
      </Section>

      <Section title="Products & Pricing">
        <p>All prices are displayed in USD and are subject to change without notice. We reserve the right to refuse or cancel any order at our discretion. In the event of a pricing error, we will notify you and offer the option to proceed at the correct price or cancel your order.</p>
        <p>Product descriptions and images are provided in good faith. Minor variations in colour or finish may occur due to photography and screen calibration.</p>
      </Section>

      <Section title="Payment">
        <p>We accept major credit and debit cards via Stripe. Payment is charged at the time of order confirmation. All transactions are encrypted and processed securely.</p>
      </Section>

      <Section title="Shipping">
        <p>Orders are processed within 1–3 business days. Estimated delivery times vary by location. Please see our Shipping & Returns page for full details. Risk of loss transfers to you upon delivery to the carrier.</p>
      </Section>

      <Section title="Returns & Refunds">
        <p>We offer a 30-day return window for unused items in their original condition and packaging. Please see our Shipping & Returns page for the full return process. Custom or engraved pieces are non-refundable.</p>
      </Section>

      <Section title="Intellectual Property">
        <p>All content on this website — including imagery, copy, logos, and designs — is the property of Selestial and protected by copyright law. You may not reproduce or use any content without prior written permission.</p>
      </Section>

      <Section title="Limitation of Liability">
        <p>To the maximum extent permitted by law, Selestial shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or services.</p>
      </Section>

      <Section title="Contact">
        <p>For legal enquiries, contact us at <a href="mailto:hello@selestial.com" className="text-white hover:underline">hello@selestial.com</a>.</p>
      </Section>
    </div>
  );
}
