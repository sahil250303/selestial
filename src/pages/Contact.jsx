import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Mail, MessageSquare, Clock } from 'lucide-react';

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Opens default email client with pre-filled message
    const subject = encodeURIComponent(`Selestial Enquiry from ${form.name}`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\nMessage:\n${form.message}`);
    window.location.href = `mailto:hello@selestial.com?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <div className="pt-32 pb-24 px-6 lg:px-12 max-w-4xl mx-auto relative z-10">
      <Helmet>
        <title>Contact Us | Selestial</title>
        <meta name="description" content="Get in touch with the Selestial team. We're happy to help with orders, product questions, or anything else." />
        <link rel="canonical" href="https://selestial.vercel.app/contact" />
      </Helmet>

      <h1 className="font-serif text-3xl md:text-4xl text-white tracking-widest uppercase mb-4 text-center">Contact Us</h1>
      <p className="text-silver-dark text-sm tracking-wider text-center max-w-md mx-auto mb-16">
        We'd love to hear from you. Our team typically responds within one business day.
      </p>

      <div className="grid md:grid-cols-2 gap-16">
        {/* Info */}
        <div className="space-y-8">
          {[
            { icon: <Mail size={20} />, title: 'Email Us', text: 'hello@selestial.com', href: 'mailto:hello@selestial.com' },
            { icon: <Clock size={20} />, title: 'Response Time', text: 'Within 1 business day' },
            { icon: <MessageSquare size={20} />, title: 'Order Enquiries', text: 'For order tracking or issues, please include your order number in your message.' },
          ].map((item) => (
            <div key={item.title} className="flex gap-4">
              <div className="text-silver-dark mt-0.5 shrink-0">{item.icon}</div>
              <div>
                <h3 className="font-serif text-white tracking-widest uppercase text-sm mb-1">{item.title}</h3>
                {item.href
                  ? <a href={item.href} className="text-silver-dark text-sm hover:text-white transition-colors">{item.text}</a>
                  : <p className="text-silver-dark text-sm">{item.text}</p>
                }
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        {sent ? (
          <div className="flex flex-col items-center justify-center text-center">
            <p className="font-serif text-xl text-white tracking-widest uppercase mb-4">Thank You</p>
            <p className="text-silver-dark text-sm tracking-wider">Your email client has opened with your message. We'll be in touch shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-widest text-silver mb-2">Your Name</label>
              <input required type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                className="w-full bg-dark/50 border border-white/10 p-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus:border-white/50 transition-colors rounded-sm" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-silver mb-2">Email Address</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                className="w-full bg-dark/50 border border-white/10 p-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus:border-white/50 transition-colors rounded-sm" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-silver mb-2">Message</label>
              <textarea required rows={5} value={form.message} onChange={(e) => setForm({...form, message: e.target.value})}
                className="w-full bg-dark/50 border border-white/10 p-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus:border-white/50 transition-colors rounded-sm resize-none" />
            </div>
            <button type="submit"
              className="w-full py-3 text-xs font-bold tracking-widest bg-white text-black hover:bg-silver-light uppercase transition-colors rounded-sm">
              Send Message
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
