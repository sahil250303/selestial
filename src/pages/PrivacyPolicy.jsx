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

export default function PrivacyPolicy() {
  return (
    <div className="pt-32 pb-24 px-6 lg:px-12 max-w-3xl mx-auto relative z-10">
      <Helmet>
        <title>Privacy Policy | Selestial</title>
        <meta name="description" content="Selestial's privacy policy — how we collect, use, and protect your personal data." />
        <link rel="canonical" href="https://selestial.vercel.app/privacy" />
      </Helmet>
      <h1 className="font-serif text-3xl md:text-4xl text-white tracking-widest uppercase mb-4">Privacy Policy</h1>
      <p className="text-silver-dark text-xs tracking-widest mb-12">Last updated: June 2026</p>

      <Section title="Information We Collect">
        <p>When you place an order or create an account, we collect your name, email address, phone number, and shipping address. We also collect transaction data including items purchased, payment status, and order history.</p>
        <p>We do not store raw payment card data. All card transactions are processed by Stripe, a PCI DSS-compliant payment processor. We receive only a transaction confirmation and a token — never your card number, expiry date, or CVC.</p>
      </Section>

      <Section title="How We Use Your Information">
        <p>We use your information to fulfil orders, send shipping and order confirmations, respond to customer support requests, and (with your consent) send promotional emails about new collections and offers.</p>
        <p>We do not sell, rent, or trade your personal information to third parties.</p>
      </Section>

      <Section title="Cookies & Local Storage">
        <p>We keep you signed in using a token stored in your browser&rsquo;s local storage (not a tracking cookie), and we store your shopping cart locally so it survives a page refresh. We use privacy-friendly analytics (Vercel Analytics &amp; Speed Insights) to understand aggregate usage. You can clear this data at any time through your browser settings.</p>
      </Section>

      <Section title="Third-Party Services">
        <p>We rely on trusted processors to run the store: Stripe (payment processing), Google (optional &ldquo;Sign in with Google&rdquo;), Twilio (optional SMS verification codes), and our email provider (order notifications). Each receives only the data needed to perform its function, and we never store raw card details.</p>
      </Section>

      <Section title="Data Retention">
        <p>We retain your account information for as long as your account is active. Order records are retained for a minimum of 7 years for accounting and tax compliance. You may request deletion of your account data at any time by contacting us.</p>
      </Section>

      <Section title="Your Rights">
        <p>You have the right to access, correct, or delete your personal data. To exercise any of these rights, please contact us at the email address below. We will respond within 30 days.</p>
      </Section>

      <Section title="Contact">
        <p>If you have questions about this policy or how your data is handled, please email us at <a href="mailto:hello@selestial.com" className="text-white hover:underline">hello@selestial.com</a>.</p>
      </Section>
    </div>
  );
}
