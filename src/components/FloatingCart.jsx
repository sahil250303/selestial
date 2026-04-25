import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../App';
import gsap from 'gsap';

export default function FloatingCart() {
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const prevCount = useRef(cartCount);
  const containerRef = useRef(null);

  useEffect(() => {
    if (cartCount > 0 && prevCount.current === 0) {
      // First item added - animate entry
      gsap.fromTo(containerRef.current, 
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
      );
      gsap.fromTo('.cart-thumbnail',
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, stagger: 0.1, delay: 0.3, ease: 'back.out(1.5)' }
      );
    } else if (cartCount > prevCount.current && containerRef.current) {
      // Subsequent additions - pulse animation and thumbnail animation
      gsap.to(containerRef.current, {
        scale: 1.05,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut'
      });
      // Animate the thumbnails sliding in
      gsap.fromTo('.cart-thumbnail', 
        { scale: 0.5, x: -20, opacity: 0 },
        { scale: 1, x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(1.5)' }
      );
    }
    prevCount.current = cartCount;
  }, [cartCount]);

  // Don't show on cart or checkout pages or if empty
  if (cartCount === 0 || location.pathname === '/cart' || location.pathname === '/checkout') {
    return null;
  }

  // Get active unique items for thumbnails
  const recentItems = [...cart].reverse().filter((item, index, self) => 
    index === self.findIndex((t) => t.id === item.id)
  ).slice(0, 3);

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] px-4 w-full max-w-xs sm:max-w-none sm:w-auto"
    >
      <button
        onClick={() => navigate('/cart')}
        className="glass-panel bg-black/40 backdrop-blur-2xl group flex items-center gap-3 px-2 py-2 pr-4 rounded-full border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:border-white/40 hover:bg-black/50 transition-all duration-300 w-full sm:w-auto justify-between sm:justify-start active:scale-95"
      >
        <div className="flex -space-x-4 items-center">
          {recentItems.map((item, index) => (
            <img 
              key={`${item.id}-${cartCount}`} // Force refresh for GSAP hook on change
              src={item.image} 
              alt={item.name}
              className="cart-thumbnail w-11 h-11 rounded-full border-2 border-black object-cover bg-white"
              style={{ zIndex: 10 - index }}
            />
          ))}
        </div>
        
        <div className="flex flex-col items-start leading-none gap-0.5 ml-3 mr-6">
          <span className="text-sm text-white font-semibold flex items-center gap-2">
            View Cart
          </span>
          <span className="text-[10px] text-silver font-medium tracking-[0.15em] uppercase">
            {cartCount} ITEM{cartCount !== 1 ? 'S' : ''}
          </span>
        </div>
        
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
          <svg className="w-4 h-4 text-white transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path>
          </svg>
        </div>
      </button>
    </div>
  );
}
