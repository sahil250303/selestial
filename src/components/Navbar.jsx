import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, User, Menu, X, Heart, Home, Grid } from 'lucide-react';
import { useCart } from '../App';
import { useWishlist } from '../context/WishlistContext';

export default function Navbar() {
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const wishlistCount = wishlist.length;
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [customerName, setCustomerName] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem('customerName');
    if (name) {
      setCustomerName(name);
    }

    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerName');
    localStorage.removeItem('customerData');
    setCustomerName(null);
    setShowUserDropdown(false);
    navigate('/');
  };

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      if (searchQuery.trim()) {
        navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    }
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-lg py-4' : 'bg-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex justify-between items-center">

        {/* Logo */}
        <Link to="/" className={`flex items-center justify-center relative transition-transform duration-300 hover:scale-105 ${isSearchOpen ? 'hidden lg:flex' : 'flex'}`}>
          <img
            src={scrolled ? "/SVG/Black%20logo.svg" : "/SVG/white%20logo.svg"}
            alt="Selestial Logo"
            className="h-10 md:h-12 w-auto object-contain transition-all duration-300"
          />
        </Link>

        {/* Desktop Links / Search Input */}
        <div className="flex-1 flex justify-center items-center px-8">
          {isSearchOpen ? (
            <div className="w-full max-w-xl flex items-center space-x-4">
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchSubmit}
                placeholder="SEARCH UNIVERSE OF SILVER..."
                className={`w-full bg-transparent border-b outline-none text-sm tracking-widest uppercase py-1 transition-colors duration-300 ${scrolled ? 'border-dark text-dark placeholder:text-dark/50' : 'border-white text-white placeholder:text-white/50'}`}
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className={`text-xs tracking-widest uppercase font-semibold transition-colors ${scrolled ? 'text-dark hover:text-gray-500' : 'text-white hover:text-silver'}`}
              >
                CLOSE
              </button>
            </div>
          ) : (
            <div className={`hidden md:flex items-center space-x-10 text-sm font-medium tracking-wider transition-colors duration-300 ${scrolled ? 'text-gray-700' : 'text-silver'}`}>
              <Link to="/" className={`transition-colors duration-200 ${scrolled ? 'hover:text-dark' : 'hover:text-white'} ${location.pathname === '/' ? (scrolled ? 'text-dark font-semibold' : 'text-white') : ''}`}>HOME</Link>
              <Link to="/products" className={`transition-colors duration-200 ${scrolled ? 'hover:text-dark' : 'hover:text-white'} ${location.pathname === '/products' && !location.search ? (scrolled ? 'text-dark font-semibold' : 'text-white') : ''}`}>ALL PRODUCTS</Link>
              <div className="relative group cursor-pointer">
                <span className={`transition-colors duration-200 uppercase ${scrolled ? 'hover:text-dark' : 'hover:text-white'} ${location.search.includes('cat=') ? (scrolled ? 'text-dark font-semibold' : 'text-white') : ''}`}>CATEGORIES</span>
                {/* Simple dropdown for categories */}
                <div className="absolute top-full left-0 mt-2 w-48 glass-panel opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-300 p-4 space-y-3 flex flex-col">
                  <Link to="/products?cat=sets" className="hover:text-white transition-colors">Sets</Link>
                  <Link to="/products?cat=earrings" className="hover:text-white transition-colors">Earrings</Link>
                  <Link to="/products?cat=bracelets" className="hover:text-white transition-colors">Bracelets</Link>
                  <Link to="/products?cat=rings" className="hover:text-white transition-colors">Rings</Link>
                  <Link to="/products?cat=necklaces" className="hover:text-white transition-colors">CHAINS</Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Icons */}
        <div className={`flex items-center space-x-6 transition-colors duration-300 ${scrolled ? 'text-dark' : 'text-silver'}`}>
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`${scrolled ? 'hover:text-gray-600' : 'hover:text-white'} transition`}
          >
            <Search size={20} strokeWidth={1.5} />
          </button>
          
          <div className="relative hidden sm:block">
            {customerName ? (
              <button 
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className={`flex items-center space-x-2 text-xs tracking-widest font-semibold uppercase ${scrolled ? 'hover:text-gray-600' : 'hover:text-white'} transition`}
              >
                <User size={20} strokeWidth={1.5} />
                <span className="hidden lg:inline">{customerName.split(' ')[0]}</span>
              </button>
            ) : (
              <Link to="/auth" className={`${scrolled ? 'hover:text-gray-600' : 'hover:text-white'} transition`}>
                <User size={20} strokeWidth={1.5} />
              </Link>
            )}

            {showUserDropdown && customerName && (
              <div className="absolute right-0 mt-4 w-48 glass-panel p-4 space-y-3 flex flex-col z-50">
                <span className="text-xs text-white/50 tracking-widest uppercase pb-2 border-b border-white/10">Hi, {customerName}</span>
                <Link to="/profile" onClick={() => setShowUserDropdown(false)} className="hover:text-white transition-colors text-sm">PROFILE</Link>
                <button onClick={handleLogout} className="text-left hover:text-red-400 transition-colors text-sm uppercase tracking-widest">LOGOUT</button>
              </div>
            )}
          </div>

          <Link to="/wishlist" className={`relative hidden sm:block ${scrolled ? 'hover:text-gray-600' : 'hover:text-white'} transition`}>
            <Heart size={20} strokeWidth={1.5} />
            {wishlistCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-silver-light text-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link to="/cart" className={`relative hidden md:block ${scrolled ? 'hover:text-gray-600' : 'hover:text-white'} transition`}>
            <ShoppingBag size={20} strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            className={`md:hidden transition-colors duration-300 ${scrolled ? 'text-dark hover:text-gray-600' : 'text-white/80 hover:text-white'}`}
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={24} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`md:hidden fixed inset-0 z-[60] transition-all duration-500 ease-in-out ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setMobileMenuOpen(false)}></div>
        
        {/* Menu Panel */}
        <div className={`absolute top-0 right-0 w-[85%] max-w-[400px] h-full bg-dark/90 backdrop-blur-3xl border-l border-white/5 shadow-2xl transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] transform ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
          {/* Decorative Edge */}
          <div className="absolute left-0 top-0 w-[1px] h-full bg-gradient-to-b from-transparent via-silver/20 to-transparent"></div>

          {/* Header */}
          <div className="flex items-center justify-between p-8">
             <div className="flex flex-col">
               <span className="text-white font-serif text-lg tracking-[0.3em] uppercase">Menu</span>
               <div className="h-[1px] w-8 bg-silver/30 mt-1"></div>
             </div>
             <button onClick={() => setMobileMenuOpen(false)} className="group relative p-2 overflow-hidden rounded-full">
                <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors"></div>
                <X size={24} strokeWidth={1} className="text-white/70 group-hover:text-white transition-all duration-300 group-hover:rotate-90" />
             </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-4 flex flex-col space-y-12 scrollbar-hide">
            
            {/* Primary Links - Editorial Style */}
            <div className="flex flex-col space-y-6">
              {[
                { label: 'Home', path: '/', icon: Home, num: '01' },
                { label: 'Shop All', path: '/products', icon: Grid, num: '02' },
                { label: 'Wishlist', path: '/wishlist', icon: Heart, num: '03', badge: wishlistCount },
                { label: customerName ? 'Profile' : 'Login', path: customerName ? '/profile' : '/auth', icon: User, num: '04' }
              ].map((item, idx) => (
                <Link 
                  key={item.path}
                  to={item.path} 
                  onClick={() => setMobileMenuOpen(false)}
                  className="group flex items-end justify-between py-2 border-b border-white/5"
                >
                  <div className="flex items-baseline space-x-4">
                    <span className="text-[10px] font-sans text-silver/40 tracking-tighter">{item.num}</span>
                    <span className={`text-2xl font-serif tracking-widest uppercase transition-all duration-300 ${location.pathname === item.path ? 'text-white' : 'text-white/40 group-hover:text-white group-hover:translate-x-2'}`}>
                      {item.label}
                    </span>
                  </div>
                  <div className="relative">
                    <item.icon size={18} strokeWidth={1} className={`transition-all duration-500 ${location.pathname === item.path ? 'text-white scale-110' : 'text-white/20 group-hover:text-white group-hover:-translate-y-1'}`} />
                    {item.badge > 0 && (
                      <span className="absolute -top-3 -right-3 bg-white text-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Collections / Categories Section */}
            <div className="pt-4">
               <div className="flex items-center space-x-3 mb-6">
                  <span className="text-[10px] text-silver/40 uppercase tracking-[0.2em]">Curated Collections</span>
                  <div className="h-[1px] flex-1 bg-white/5"></div>
               </div>
               
               <div className="grid grid-cols-1 gap-2">
                  {[
                    { name: 'Sets', path: '/products?cat=sets' },
                    { name: 'Earrings', path: '/products?cat=earrings' },
                    { name: 'Bracelets', path: '/products?cat=bracelets' },
                    { name: 'Rings', path: '/products?cat=rings' },
                    { name: 'Chains', path: '/products?cat=necklaces' }
                  ].map((cat) => (
                    <Link 
                      key={cat.name}
                      to={cat.path} 
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-sans text-white/50 hover:text-white tracking-[0.15em] uppercase py-2 flex items-center justify-between group transition-colors"
                    >
                      <span>{cat.name}</span>
                      <div className="w-0 h-[1px] bg-silver/30 group-hover:w-12 transition-all duration-500"></div>
                    </Link>
                  ))}
               </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-8 mt-auto border-t border-white/5 space-y-8 pb-12">
               {customerName ? (
                 <div className="flex flex-col space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <User size={14} className="text-white/60" />
                      </div>
                      <span className="text-xs text-white/60 tracking-widest uppercase">Signed in as {customerName.split(' ')[0]}</span>
                    </div>
                    <button onClick={handleLogout} className="w-full py-4 rounded-lg bg-red-500/5 border border-red-500/10 text-red-400 text-[10px] tracking-[0.3em] uppercase font-medium hover:bg-red-500/10 transition-all">
                      Logout Account
                    </button>
                 </div>
               ) : (
                 <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center space-y-3">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">Join the Universe</p>
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="block w-full py-3 bg-white text-black text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-silver-light transition-colors rounded-sm">
                      Create Account
                    </Link>
                 </div>
               )}

               {/* Socials */}
               <div className="flex justify-center space-x-8 text-white/20">
                  <a href="#" className="hover:text-white transition-colors"><span className="text-[10px] tracking-widest uppercase font-sans">Instagram</span></a>
                  <a href="#" className="hover:text-white transition-colors"><span className="text-[10px] tracking-widest uppercase font-sans">Pinterest</span></a>
                  <a href="#" className="hover:text-white transition-colors"><span className="text-[10px] tracking-widest uppercase font-sans">Support</span></a>
               </div>
            </div>
          </div>
        </div>
      </div>

    </nav>
  );
}
