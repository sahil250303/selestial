import React from 'react';
import { Link } from 'react-router-dom';

function InstagramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PinterestIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="w-full bg-black border-t border-white/10 pt-16 pb-8 px-6 lg:px-12 relative z-10 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        {/* Brand */}
        <div className="md:col-span-2">
          <Link to="/" className="inline-flex items-center mb-6 transition-transform duration-300 hover:scale-105 origin-left">
            <img src="/SVG/SELESTIAL.LGOG%20IN%20WHITE.svg?v=2" alt="Selestial Logo" className="h-8 md:h-[38px] w-auto object-contain" />
          </Link>
          <p className="text-silver-dark text-sm max-w-sm tracking-widest leading-loose mb-6">
            Universe of Silver. We create jewellery that doesn't just adorn, but transforms — written in the language of silver and light.
          </p>
          {/* Social links */}
          <div className="flex gap-4">
            <a href="https://www.instagram.com/selestial" target="_blank" rel="noopener noreferrer"
              aria-label="Selestial on Instagram"
              className="text-silver-dark hover:text-white transition-colors">
              <InstagramIcon />
            </a>
            <a href="https://www.pinterest.com/selestial" target="_blank" rel="noopener noreferrer"
              aria-label="Selestial on Pinterest"
              className="text-silver-dark hover:text-white transition-colors">
              <PinterestIcon />
            </a>
          </div>
        </div>

        {/* Shop */}
        <div>
          <h4 className="text-white font-serif tracking-widest uppercase mb-6 text-sm">Shop</h4>
          <ul className="space-y-4 text-sm text-silver tracking-wider">
            <li><Link to="/products?cat=necklaces" className="hover:text-white transition-colors">Chains</Link></li>
            <li><Link to="/products?cat=rings" className="hover:text-white transition-colors">Rings</Link></li>
            <li><Link to="/products?cat=bracelets" className="hover:text-white transition-colors">Bracelets</Link></li>
            <li><Link to="/products?cat=earrings" className="hover:text-white transition-colors">Earrings</Link></li>
            <li><Link to="/products?cat=sets" className="hover:text-white transition-colors">Sets</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="text-white font-serif tracking-widest uppercase mb-6 text-sm">Support</h4>
          <ul className="space-y-4 text-sm text-silver tracking-wider">
            <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            <li><Link to="/shipping-returns" className="hover:text-white transition-colors">Shipping & Returns</Link></li>
            <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
            <li><Link to="/care-guide" className="hover:text-white transition-colors">Care Guide</Link></li>
            <li><Link to="/size-guide" className="hover:text-white transition-colors">Size Guide</Link></li>
            <li><Link to="/about" className="hover:text-white transition-colors">Our Story</Link></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-silver-dark tracking-widest uppercase">
        <p>&copy; {new Date().getFullYear()} Selestial. All rights reserved.</p>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
