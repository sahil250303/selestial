import React, { useState, useEffect } from 'react';
import { useCart } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle, ShoppingBag } from 'lucide-react';
import { getOptimizedImageUrl } from '../utils/imageUrls.js';

// ── Stripe Elements (loaded only when VITE_STRIPE_PUBLISHABLE_KEY is set) ─────
// Dynamic import so the bundle doesn't break when Stripe is not configured.
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

// ── Inner checkout form (used inside Stripe <Elements> wrapper) ───────────────
function CheckoutForm({ cart, total, formData, handleChange }) {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Stripe hooks — return null when not inside an <Elements> provider
  const stripe = stripePromise ? useStripe() : null;
  const elements = stripePromise ? useElements() : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      let paymentMethodId = null;

      // ── If Stripe is configured, create a payment method ───────────────
      if (stripe && elements) {
        const cardEl = elements.getElement(CardElement);
        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardEl,
          billing_details: {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
          },
        });
        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }
        paymentMethodId = paymentMethod.id;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cartItems: cart,
          totalAmount: total,
          paymentMethod: 'Credit Card',
          ...(paymentMethodId ? { paymentMethodId } : {}),
        }),
      });

      if (res.ok) {
        clearCart();
        setSubmitted(true);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Checkout failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An unexpected error occurred. Please try again.');
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="pt-32 px-6 lg:px-12 max-w-3xl mx-auto min-h-screen relative z-10 flex flex-col items-center justify-center text-center">
        <div className="glass-panel p-12 max-w-xl">
          <CheckCircle size={64} className="text-green-400 mx-auto mb-6" />
          <h1 className="font-serif text-4xl text-white tracking-widest uppercase mb-4">Order Complete</h1>
          <p className="text-silver tracking-widest text-lg mb-8 uppercase">Thank you for your purchase.</p>
          <p className="text-silver-dark mb-12 max-w-md mx-auto">
            Your Selestial silver pieces are being prepared for shipping. You will receive a confirmation email shortly.
          </p>
          <Link
            to="/products"
            className="px-8 py-3 text-xs font-bold tracking-widest bg-white text-black hover:bg-silver-light uppercase transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Shipping */}
      <h2 className="font-serif text-xl tracking-widest uppercase text-white border-b border-white/10 pb-4 mb-6">
        Shipping Details
      </h2>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-xs uppercase tracking-widest text-silver mb-2">First Name</label>
          <input required name="firstName" value={formData.firstName} onChange={handleChange} type="text"
            className="w-full bg-dark/50 border border-white/10 p-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus:border-white/50 transition-colors rounded-sm" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-silver mb-2">Last Name</label>
          <input required name="lastName" value={formData.lastName} onChange={handleChange} type="text"
            className="w-full bg-dark/50 border border-white/10 p-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus:border-white/50 transition-colors rounded-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-xs uppercase tracking-widest text-silver mb-2">Email</label>
          <input required name="email" value={formData.email} onChange={handleChange} type="email"
            className="w-full bg-dark/50 border border-white/10 p-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus:border-white/50 transition-colors rounded-sm" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-silver mb-2">Mobile No.</label>
          <input required name="phone" value={formData.phone} onChange={handleChange} type="tel"
            className="w-full bg-dark/50 border border-white/10 p-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus:border-white/50 transition-colors rounded-sm" />
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-widest text-silver mb-2">Address</label>
        <input required name="address" value={formData.address} onChange={handleChange} type="text"
          className="w-full bg-dark/50 border border-white/10 p-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus:border-white/50 transition-colors rounded-sm" />
      </div>

      {/* Payment */}
      <h2 className="font-serif text-xl tracking-widest uppercase text-white border-b border-white/10 pb-4 mt-12">
        Payment
      </h2>

      {stripePromise ? (
        /* ── Stripe Elements card input ──────────────────────────────────── */
        <div>
          <label className="block text-xs uppercase tracking-widest text-silver mb-3">Card Details</label>
          <div className="bg-dark/50 border border-white/10 p-4 rounded-sm">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#ffffff',
                    fontFamily: 'Inter, sans-serif',
                    '::placeholder': { color: '#6B7280' },
                  },
                  invalid: { color: '#EF4444' },
                },
              }}
            />
          </div>
          <p className="text-[10px] text-silver-dark mt-2 tracking-wider">
            Your card information is processed securely by Stripe. We never see or store your card details.
          </p>
        </div>
      ) : (
        /* ── Stripe not configured — show setup notice ───────────────────── */
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-sm p-5">
          <p className="text-yellow-300 text-xs tracking-widest uppercase font-bold mb-2">Payment Configuration Required</p>
          <p className="text-silver-dark text-xs leading-relaxed">
            Stripe has not been configured yet. Add your{' '}
            <code className="text-white bg-white/10 px-1 rounded">VITE_STRIPE_PUBLISHABLE_KEY</code> and{' '}
            <code className="text-white bg-white/10 px-1 rounded">STRIPE_SECRET_KEY</code> to your{' '}
            <code className="text-white bg-white/10 px-1 rounded">.env</code> file to enable secure payments.
            Orders placed now will be saved but marked as pending payment.
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-sm">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center py-4 px-6 bg-white text-dark hover:bg-silver-light transition-colors uppercase tracking-widest font-semibold text-sm mt-8 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing...' : `Place Order — $${total.toFixed(2)}`}
      </button>
    </form>
  );
}

// ── Main Checkout page ────────────────────────────────────────────────────────
export default function Checkout() {
  const { cart } = useCart();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', address: '',
  });

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Empty-cart guard
  useEffect(() => {
    if (cart.length === 0) navigate('/cart');
  }, [cart, navigate]);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  if (cart.length === 0) return null; // guard renders before redirect

  const formContent = <CheckoutForm cart={cart} total={total} formData={formData} handleChange={handleChange} />;

  return (
    <div className="pt-32 px-6 lg:px-12 max-w-7xl mx-auto min-h-screen relative z-10">
      <h1 className="font-serif text-4xl text-white tracking-widest uppercase mb-12">Checkout</h1>

      <div className="grid lg:grid-cols-2 gap-16">
        {/* Form */}
        <div className="glass-panel p-8">
          {stripePromise ? (
            <Elements stripe={stripePromise}>
              {formContent}
            </Elements>
          ) : (
            formContent
          )}
        </div>

        {/* Order Summary */}
        <div className="glass-panel p-8 h-fit">
          <h2 className="font-serif text-xl tracking-widest uppercase text-white border-b border-white/10 pb-4 mb-6">
            Order Summary
          </h2>
          <div className="space-y-6">
            {cart.map((item) => (
              <div key={item.cartItemId} className="flex items-center gap-4">
                <img
                  src={getOptimizedImageUrl(item.image, { width: 160, quality: 68 })}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  className="w-20 h-20 object-cover rounded-sm border border-white/10"
                />
                <div className="flex-1">
                  <h3 className="font-sans uppercase text-sm font-medium tracking-wider text-white">{item.name}</h3>
                  <p className="text-silver-dark text-[10px] uppercase mt-1 tracking-widest">
                    Size: {item.size} | Color: {item.color} | Qty: {item.quantity}
                  </p>
                </div>
                <div className="font-medium text-white">${(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 flex justify-between uppercase tracking-widest text-lg text-white font-medium">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
