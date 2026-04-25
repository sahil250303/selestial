import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full glass-panel bg-black/40 backdrop-blur-2xl border-t border-white/10 pt-16 pb-8 px-6 lg:px-12 relative z-10 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="md:col-span-2">
          <Link to="/" className="inline-flex items-center mb-6 transition-transform duration-300 hover:scale-105 origin-left">
            <img 
              src="/SVG/white%20logo.svg" 
              alt="Selestial Logo" 
              className="h-10 md:h-12 w-auto object-contain"
            />
          </Link>
          <p className="text-silver-dark text-sm max-w-sm tracking-widest leading-loose">
            Universe of Silver. We create jewellery that doesn't just adorn, but transforms. Written in the language of silver and light.
          </p>
        </div>
        
        <div>
          <h4 className="text-white font-serif tracking-widest uppercase mb-6 text-sm">Shop</h4>
          <ul className="space-y-4 text-sm text-silver tracking-wider">
            <li><Link to="/products?cat=rings" className="hover:text-white transition-colors">Rings</Link></li>
            <li><Link to="/products?cat=bracelets" className="hover:text-white transition-colors">Bracelets</Link></li>
            <li><Link to="/products?cat=earrings" className="hover:text-white transition-colors">Earrings</Link></li>
          </ul>
        </div>

        <div>
           <h4 className="text-white font-serif tracking-widest uppercase mb-6 text-sm">Support</h4>
           <ul className="space-y-4 text-sm text-silver tracking-wider">
            <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Shipping & Returns</a></li>
            <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Care Guide</a></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-silver-dark tracking-widest uppercase">
        <p>&copy; {new Date().getFullYear()} Selestial. All rights reserved.</p>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
