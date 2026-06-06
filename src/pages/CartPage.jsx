import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../App';
import { Trash2, ArrowRight } from 'lucide-react';
import { getOptimizedImageUrl } from '../utils/imageUrls.js';

export default function CartPage() {
  const { cart, removeFromCart } = useCart();
  
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div className="pt-32 px-6 lg:px-12 max-w-7xl mx-auto min-h-screen relative z-10">
      <h1 className="font-serif text-4xl text-white tracking-widest uppercase mb-12">Your Cart</h1>
      
      {cart.length === 0 ? (
        <div className="text-center py-32 glass-panel border border-white/10">
          <p className="font-serif text-xl text-silver tracking-widest mb-8">Your cart is currently empty.</p>
          <Link to="/products" className="inline-flex py-4 px-8 border border-white/20 text-white hover:bg-white hover:text-dark transition-colors tracking-widest uppercase text-sm">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            {cart.map((item) => (
              <div key={item.cartItemId} className="glass-panel p-6 flex flex-col md:flex-row items-center gap-6">
                <img
                  src={getOptimizedImageUrl(item.image, { width: 256, quality: 70 })}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  className="w-32 h-32 object-cover rounded-sm"
                />
                <div className="flex-1 text-center md:text-left">
                  <h3 className="font-serif tracking-widest text-lg text-white">{item.name}</h3>
                  <div className="text-silver text-[10px] tracking-widest uppercase mt-2 space-y-1">
                    <p>Color: <span className="text-white">{item.color}</span></p>
                    <p>Size: <span className="text-white">{item.size}</span></p>
                    <p className="mt-2">Qty: <span className="text-white">{item.quantity}</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-sans font-medium text-white mb-2">${(item.price * item.quantity).toFixed(2)}</p>
                  <button onClick={() => removeFromCart(item.cartItemId)} className="text-silver-dark hover:text-red-400 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="glass-panel p-8 h-fit">
            <h2 className="font-serif text-xl text-white tracking-widest uppercase mb-6 border-b border-white/10 pb-4">Order Summary</h2>
            <div className="flex justify-between text-silver mb-4 uppercase tracking-wider text-sm">
              <span>Subtotal</span>
              <span>${total}</span>
            </div>
            <div className="flex justify-between text-silver mb-6 uppercase tracking-wider text-sm border-b border-white/10 pb-4">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="flex justify-between text-white font-medium mb-8 uppercase tracking-widest">
              <span>Total</span>
              <span>${total}</span>
            </div>
            <Link to="/checkout" className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-white text-dark hover:bg-silver-light transition-colors uppercase tracking-widest font-semibold text-sm">
              Checkout <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
