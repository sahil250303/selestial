import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ChevronDown } from 'lucide-react';

const faqs = [
  { q: 'What metal is used in Selestial jewellery?', a: 'All Selestial pieces are crafted from 925 sterling silver — 92.5% pure silver alloyed with copper for durability. Every piece is hallmarked to certify authenticity.' },
  { q: 'Will sterling silver tarnish?', a: 'All silver tarnishes over time with exposure to air and moisture. This is natural and entirely reversible. Refer to our Care Guide for cleaning tips and storage advice to keep your pieces looking their best.' },
  { q: 'How do I choose the right ring size?', a: 'Please visit our Size Guide for a full ring sizing chart, including instructions on how to measure your finger at home. We recommend measuring in the evening when fingers are at their largest.' },
  { q: 'Do you ship internationally?', a: 'Yes, we ship worldwide. International delivery typically takes 7–14 business days. Customers are responsible for any applicable customs duties or import taxes. See our Shipping & Returns page for full details.' },
  { q: 'What is your return policy?', a: 'We offer a 30-day return window from the date of delivery for unused items in their original packaging. Please see our Shipping & Returns page for full details on how to initiate a return.' },
  { q: 'Is my payment information secure?', a: 'Yes. All card payments are processed by Stripe, a PCI DSS-certified payment processor. We never see or store your card number, expiry date, or CVC. Your data is encrypted end-to-end.' },
  { q: 'Can I track my order?', a: 'Yes. Once your order is dispatched, you will receive a shipping confirmation email with a tracking number. Log in to your account to view all your orders.' },
  { q: 'Do you offer gift packaging?', a: 'Yes — all Selestial orders arrive in complimentary gift-ready packaging: a signature black box with ribbon, a branded silver polishing pouch, and a care card.' },
  { q: 'Can I get a piece engraved?', a: 'We are working on a custom engraving service. Please contact us at hello@selestial.com to enquire about availability for a specific piece.' },
  { q: 'How do I care for my silver jewellery?', a: 'Store in the provided pouch away from air and moisture. Avoid contact with perfumes, lotions, cleaning products, and chlorine. Clean gently with a soft polishing cloth. See our Care Guide for detailed instructions.' },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-5 text-left group"
        aria-expanded={open}
      >
        <span className="font-serif text-sm tracking-wider text-white uppercase group-hover:text-silver-light transition-colors pr-4">{q}</span>
        <ChevronDown size={16} className={`text-silver-dark shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="text-silver-dark text-sm tracking-wider leading-relaxed pb-5 font-light">{a}</p>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="pt-32 pb-24 px-6 lg:px-12 max-w-3xl mx-auto relative z-10">
      <Helmet>
        <title>FAQ | Selestial</title>
        <meta name="description" content="Frequently asked questions about Selestial silver jewellery — materials, sizing, shipping, returns, care and more." />
        <link rel="canonical" href="https://selestial.vercel.app/faq" />
      </Helmet>
      <h1 className="font-serif text-3xl md:text-4xl text-white tracking-widest uppercase mb-4 text-center">FAQ</h1>
      <p className="text-silver-dark text-sm tracking-wider text-center mb-16">Frequently Asked Questions</p>
      <div>
        {faqs.map((item) => <FAQItem key={item.q} {...item} />)}
      </div>
    </div>
  );
}
