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
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
        
        {/* Menu Panel */}
        <div className={`absolute top-0 right-0 w-[85%] max-w-[375px] h-full bg-gradient-to-b from-dark/95 to-black/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl transition-transform duration-500 ease-out transform ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
             <span className="text-white text-sm tracking-[0.2em] font-semibold uppercase">Navigation</span>
             <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-white/5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all">
                <X size={20} strokeWidth={1.5} />
             </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col space-y-6 scrollbar-hide pb-32">
            
            {/* Quick Links Glass Cards */}
            <div className="grid grid-cols-2 gap-4">
               <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`flex flex-col items-center justify-center p-5 rounded-2xl border ${location.pathname === '/' ? 'bg-white/10 border-white/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'} transition-all duration-300`}>
                  <Home size={22} className="mb-3" strokeWidth={1.5} />
                  <span className="text-[10px] tracking-widest uppercase font-medium">Home</span>
               </Link>
               <Link to="/products" onClick={() => setMobileMenuOpen(false)} className={`flex flex-col items-center justify-center p-5 rounded-2xl border ${location.pathname === '/products' ? 'bg-white/10 border-white/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'} transition-all duration-300`}>
                  <Grid size={22} className="mb-3" strokeWidth={1.5} />
                  <span className="text-[10px] tracking-widest uppercase font-medium">Shop</span>
               </Link>
               <Link to="/wishlist" onClick={() => setMobileMenuOpen(false)} className={`flex flex-col items-center justify-center p-5 rounded-2xl border ${location.pathname === '/wishlist' ? 'bg-white/10 border-white/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'} transition-all duration-300 relative`}>
                  <Heart size={22} className="mb-3" strokeWidth={1.5} />
                  <span className="text-[10px] tracking-widest uppercase font-medium">Wishlist</span>
                  {wishlistCount > 0 && <span className="absolute top-3 right-3 bg-white text-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md">{wishlistCount}</span>}
               </Link>
               {customerName ? (
                 <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className={`flex flex-col items-center justify-center p-5 rounded-2xl border ${location.pathname === '/profile' ? 'bg-white/10 border-white/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'} transition-all duration-300`}>
                    <User size={22} className="mb-3" strokeWidth={1.5} />
                    <span className="text-[10px] tracking-widest uppercase font-medium">Profile</span>
                 </Link>
               ) : (
                 <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className={`flex flex-col items-center justify-center p-5 rounded-2xl border ${location.pathname === '/auth' ? 'bg-white/10 border-white/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'} transition-all duration-300`}>
                    <User size={22} className="mb-3" strokeWidth={1.5} />
                    <span className="text-[10px] tracking-widest uppercase font-medium">Login</span>
                 </Link>
               )}
            </div>

            {/* Categories */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
               <button
                  onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                  className="w-full p-5 flex justify-between items-center text-white/90 hover:bg-white/5 transition-all"
               >
                  <span className="text-xs tracking-[0.15em] uppercase font-semibold">Categories</span>
                  <svg className={`w-4 h-4 transition-transform duration-300 ${isCategoriesOpen ? 'rotate-180 text-white' : 'text-white/50'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
               </button>
               <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isCategoriesOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-5 pt-0 flex flex-col space-y-4 border-t border-white/5 mt-2">
                     <Link to="/products?cat=sets" onClick={() => setMobileMenuOpen(false)} className="text-xs text-white/60 hover:text-white tracking-[0.15em] uppercase flex items-center space-x-4 transition-colors p-2 hover:bg-white/5 rounded-lg"><span className="w-1.5 h-1.5 rounded-full bg-white/20"></span><span>Sets</span></Link>
                     <Link to="/products?cat=earrings" onClick={() => setMobileMenuOpen(false)} className="text-xs text-white/60 hover:text-white tracking-[0.15em] uppercase flex items-center space-x-4 transition-colors p-2 hover:bg-white/5 rounded-lg"><span className="w-1.5 h-1.5 rounded-full bg-white/20"></span><span>Earrings</span></Link>
                     <Link to="/products?cat=bracelets" onClick={() => setMobileMenuOpen(false)} className="text-xs text-white/60 hover:text-white tracking-[0.15em] uppercase flex items-center space-x-4 transition-colors p-2 hover:bg-white/5 rounded-lg"><span className="w-1.5 h-1.5 rounded-full bg-white/20"></span><span>Bracelets</span></Link>
                     <Link to="/products?cat=rings" onClick={() => setMobileMenuOpen(false)} className="text-xs text-white/60 hover:text-white tracking-[0.15em] uppercase flex items-center space-x-4 transition-colors p-2 hover:bg-white/5 rounded-lg"><span className="w-1.5 h-1.5 rounded-full bg-white/20"></span><span>Rings</span></Link>
                     <Link to="/products?cat=necklaces" onClick={() => setMobileMenuOpen(false)} className="text-xs text-white/60 hover:text-white tracking-[0.15em] uppercase flex items-center space-x-4 transition-colors p-2 hover:bg-white/5 rounded-lg"><span className="w-1.5 h-1.5 rounded-full bg-white/20"></span><span>Chains</span></Link>
                  </div>
               </div>
            </div>

            {/* User Actions */}
            {customerName && (
               <div className="mt-8 pt-4">
                 <button onClick={handleLogout} className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs tracking-widest uppercase font-semibold hover:bg-red-500/20 transition-all flex items-center justify-center space-x-2">
                   <span>Logout</span>
                 </button>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-[400px] z-40 transition-transform duration-500">
        <div className="bg-dark/80 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3.5 flex justify-between items-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <Link to="/" className={`relative p-2 flex flex-col items-center justify-center transition-all duration-300 ${location.pathname === '/' ? 'text-white scale-110' : 'text-white/40 hover:text-white'}`}>
             <Home size={22} strokeWidth={location.pathname === '/' ? 2 : 1.5} />
             {location.pathname === '/' && <span className="absolute -bottom-1 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>}
          </Link>
          <Link to="/products" className={`relative p-2 flex flex-col items-center justify-center transition-all duration-300 ${location.pathname === '/products' ? 'text-white scale-110' : 'text-white/40 hover:text-white'}`}>
             <Grid size={22} strokeWidth={location.pathname === '/products' ? 2 : 1.5} />
             {location.pathname === '/products' && <span className="absolute -bottom-1 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>}
          </Link>
          <Link to="/cart" className={`relative flex flex-col items-center justify-center transition-all duration-300 -mt-10 ${location.pathname === '/cart' ? 'scale-105' : 'hover:scale-105'}`}>
             <div className="bg-gradient-to-tr from-gray-800 to-black p-4 rounded-full border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex items-center justify-center">
                <ShoppingBag size={22} strokeWidth={1.5} className="text-white" />
                {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-white text-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-sm">{cartCount}</span>}
             </div>
          </Link>
          <Link to="/wishlist" className={`relative p-2 flex flex-col items-center justify-center transition-all duration-300 ${location.pathname === '/wishlist' ? 'text-white scale-110' : 'text-white/40 hover:text-white'}`}>
             <Heart size={22} strokeWidth={location.pathname === '/wishlist' ? 2 : 1.5} />
             {wishlistCount > 0 && <span className="absolute top-1 -right-1 bg-white text-black text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">{wishlistCount}</span>}
             {location.pathname === '/wishlist' && <span className="absolute -bottom-1 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>}
          </Link>
          <Link to={customerName ? "/profile" : "/auth"} className={`relative p-2 flex flex-col items-center justify-center transition-all duration-300 ${location.pathname === '/profile' || location.pathname === '/auth' ? 'text-white scale-110' : 'text-white/40 hover:text-white'}`}>
             <User size={22} strokeWidth={location.pathname === '/profile' || location.pathname === '/auth' ? 2 : 1.5} />
             {(location.pathname === '/profile' || location.pathname === '/auth') && <span className="absolute -bottom-1 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>}
          </Link>
        </div>
      </div>
    </nav>
  );
}
