import React, { useState } from 'react';
import { useCart } from '../App';
import { CheckCircle } from 'lucide-react';

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    cardNumber: '',
    expiryDate: '',
    cvc: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        cartItems: cart,
        totalAmount: total,
        paymentMethod: paymentMethod
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        clearCart();
        setSubmitted(true);
      } else {
        alert('Checkout failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during checkout.');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (submitted) {
    return (
      <div className="pt-32 px-6 lg:px-12 max-w-3xl mx-auto min-h-screen relative z-10 flex flex-col items-center justify-center text-center">
        <div className="glass-panel p-12 max-w-xl">
          <CheckCircle size={64} className="text-green-400 mx-auto mb-6" />
          <h1 className="font-serif text-4xl text-white tracking-widest uppercase mb-4">Order Complete</h1>
          <p className="text-silver tracking-widest text-lg mb-8 uppercase">Thank you for your purchase.</p>
          <p className="text-silver-dark mb-12 max-w-md mx-auto">Your Selestial silver pieces are being prepared for shipping. You will receive a confirmation email shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 px-6 lg:px-12 max-w-7xl mx-auto min-h-screen relative z-10">
      <h1 className="font-serif text-4xl text-white tracking-widest uppercase mb-12">Checkout</h1>
      
      <div className="grid lg:grid-cols-2 gap-16">
        {/* Form */}
        <div className="glass-panel p-8">
          <h2 className="font-serif text-xl tracking-widest uppercase text-white border-b border-white/10 pb-4 mb-6">Shipping Details</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs uppercase tracking-widest text-silver mb-2">First Name</label>
                <input required name="firstName" value={formData.firstName} onChange={handleChange} type="text" className="w-full bg-dark/50 border border-white/10 p-3 text-white outline-none focus:border-white/50 transition-colors rounded-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-silver mb-2">Last Name</label>
                <input required name="lastName" value={formData.lastName} onChange={handleChange} type="text" className="w-full bg-dark/50 border border-white/10 p-3 text-white outline-none focus:border-white/50 transition-colors rounded-sm" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs uppercase tracking-widest text-silver mb-2">Email</label>
                <input required name="email" value={formData.email} onChange={handleChange} type="email" className="w-full bg-dark/50 border border-white/10 p-3 text-white outline-none focus:border-white/50 transition-colors rounded-sm" />
              </div>
              
              <div>
                <label className="block text-xs uppercase tracking-widest text-silver mb-2">Mobile No.</label>
                <input required name="phone" value={formData.phone} onChange={handleChange} type="tel" className="w-full bg-dark/50 border border-white/10 p-3 text-white outline-none focus:border-white/50 transition-colors rounded-sm" />
              </div>
            </div>
            
            <div>
               <label className="block text-xs uppercase tracking-widest text-silver mb-2">Address</label>
               <input required name="address" value={formData.address} onChange={handleChange} type="text" className="w-full bg-dark/50 border border-white/10 p-3 text-white outline-none focus:border-white/50 transition-colors rounded-sm" />
            </div>

            <h2 className="font-serif text-xl tracking-widest uppercase text-white border-b border-white/10 pb-4 mb-6 mt-12">Payment</h2>
            
            <div className="flex gap-4 mb-6">
              <label className={`flex-1 border p-4 cursor-pointer text-center tracking-widest uppercase text-xs transition-colors ${paymentMethod === 'Credit Card' ? 'border-white text-white bg-white/5' : 'border-white/20 text-silver hover:border-white/50'}`}>
                <input type="radio" className="hidden" name="paymentType" value="Credit Card" checked={paymentMethod === 'Credit Card'} onChange={(e) => setPaymentMethod(e.target.value)} />
                Credit Card
              </label>
              <label className={`flex-1 border p-4 cursor-pointer text-center tracking-widest uppercase text-xs transition-colors ${paymentMethod === 'PayPal' ? 'border-white text-white bg-white/5' : 'border-white/20 text-silver hover:border-white/50'}`}>
                <input type="radio" className="hidden" name="paymentType" value="PayPal" checked={paymentMethod === 'PayPal'} onChange={(e) => setPaymentMethod(e.target.value)} />
                PayPal
              </label>
            </div>

            {paymentMethod === 'Credit Card' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-silver mb-2">Card Number</label>
                  <input required={paymentMethod === 'Credit Card'} name="cardNumber" value={formData.cardNumber} onChange={handleChange} type="text" placeholder="XXXX XXXX XXXX XXXX" className="w-full bg-dark/50 border border-white/10 p-3 text-white outline-none focus:border-white/50 transition-colors rounded-sm font-mono placeholder:text-silver-dark/50" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-silver mb-2">Expiry Date</label>
                    <input required={paymentMethod === 'Credit Card'} name="expiryDate" value={formData.expiryDate} onChange={handleChange} type="text" placeholder="MM/YY" className="w-full bg-dark/50 border border-white/10 p-3 text-white outline-none focus:border-white/50 transition-colors rounded-sm font-mono placeholder:text-silver-dark/50" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-silver mb-2">CVC</label>
                    <input required={paymentMethod === 'Credit Card'} name="cvc" value={formData.cvc} onChange={handleChange} type="text" placeholder="XXX" className="w-full bg-dark/50 border border-white/10 p-3 text-white outline-none focus:border-white/50 transition-colors rounded-sm font-mono placeholder:text-silver-dark/50" />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'PayPal' && (
              <div className="bg-[#FFC439]/10 border border-[#FFC439]/30 rounded-sm p-6 text-center my-6">
                <p className="text-white text-sm mb-4 tracking-widest uppercase font-serif">PayPal Integration Pending</p>
                <div className="inline-block bg-[#FFC439] text-[#003087] font-bold px-8 py-3 rounded-full uppercase tracking-wider text-sm italic">
                  PayPal
                </div>
                <p className="text-silver-dark text-xs mt-4">You will be redirected to PayPal to complete your purchase securely.</p>
              </div>
            )}

            <button type="submit" className="w-full flex items-center justify-center py-4 px-6 bg-white text-dark hover:bg-silver-light transition-colors uppercase tracking-widest font-semibold text-sm mt-8">
              {paymentMethod === 'PayPal' ? 'Proceed to PayPal' : `Place Order - $${total}`}
            </button>
          </form>
        </div>

        {/* Order Summary Checkout */}
        <div className="glass-panel p-8 h-fit">
          <h2 className="font-serif text-xl tracking-widest uppercase text-white border-b border-white/10 pb-4 mb-6">Cart Items</h2>
          <div className="space-y-6">
            {cart.map((item) => (
              <div key={item.cartItemId} className="flex items-center gap-4">
                <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-sm border border-white/10" />
                <div className="flex-1">
                  <h3 className="font-sans uppercase text-sm font-medium tracking-wider text-white">{item.name}</h3>
                  <p className="text-silver-dark text-[10px] uppercase mt-1 tracking-widest">
                    Size: {item.size} | Color: {item.color} | Qty: {item.quantity}
                  </p>
                </div>
                <div className="font-medium text-white">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 flex justify-between uppercase tracking-widest text-lg text-white font-medium">
            <span>Total</span>
            <span>${total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
