import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, User, Menu, X, Heart, Home, Grid, ArrowRight } from 'lucide-react';
import { useCart } from '../App';
import { useWishlist } from '../context/WishlistContext';
import { getCustomerSession, clearCustomerSession } from '../utils/auth';

function HighlightMatch({ text, query }) {
  if (!query) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <span className="text-white font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </span>
  );
}

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
  const [customerName, setCustomerName] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef(null);
  const searchWrapperRef = useRef(null);
  const inputRef = useRef(null);
  const productsCache = useRef(null);

  const announcements = [
    'COMPLIMENTARY SHIPPING ON ORDERS OVER $100',
    'JOIN THE SELESTIAL CLUB & RECEIVE 10% OFF YOUR FIRST ORDER',
    'EXQUISITE COMPLIMENTARY GIFT PACKAGING ON ALL ORDERS',
  ];
  const [announcementIndex, setAnnouncementIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setAnnouncementIndex(i => (i + 1) % announcements.length), 4000);
    return () => clearInterval(t);
  }, [announcements.length]);

  useEffect(() => {
    const session = getCustomerSession();
    setCustomerName(session?.user?.name ?? null);
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setActiveSuggestion(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    clearCustomerSession();
    setCustomerName(null);
    setShowUserDropdown(false);
    navigate('/');
  };

  const fetchSuggestions = useCallback((q) => {
    clearTimeout(debounceTimer.current);
    if (!q || q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        // There is no /api/products/search route — that path resolves to
        // /api/products/:id (id="search") and 404s. Reuse the working
        // /api/products endpoint: fetch once, cache, then filter client-side.
        if (!productsCache.current) {
          const res = await fetch('/api/products');
          if (!res.ok) return;
          productsCache.current = await res.json();
        }
        const ql = q.toLowerCase();
        const matches = (productsCache.current || [])
          .filter((p) => p.name?.toLowerCase().includes(ql) || p.category?.toLowerCase().includes(ql))
          .slice(0, 6);
        setSuggestions(matches);
        setShowSuggestions(matches.length > 0);
        setActiveSuggestion(-1);
      } catch {
        setSuggestions([]);
      }
    }, 180);
  }, []);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchSuggestions(val);
  };

  const commitSearch = (q) => {
    const trimmed = (q || searchQuery).trim();
    if (!trimmed) return;
    navigate('/products?q=' + encodeURIComponent(trimmed));
    closeSearch();
  };

  const selectSuggestion = (product) => {
    navigate('/product/' + product.id);
    closeSearch();
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
  };

  const openSearch = () => {
    setIsSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) {
      if (e.key === 'Enter') commitSearch();
      if (e.key === 'Escape') closeSearch();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestion >= 0) {
        selectSuggestion(suggestions[activeSuggestion]);
      } else {
        commitSearch();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }
  };

  const navBg = scrolled ? 'bg-white shadow-lg' : 'bg-transparent';
  const iconColor = scrolled ? 'text-dark' : 'text-silver';
  const hoverColor = scrolled ? 'hover:text-gray-600' : 'hover:text-white';

  return (
    <nav className={'fixed top-0 w-full z-50 flex flex-col transition-all duration-300 ' + navBg}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:text-xs focus:tracking-widest focus:uppercase focus:rounded"
      >
        Skip to main content
      </a>

      {/* Announcement bar */}
      <div className={'w-full border-b border-white/5 bg-[#0d0d0d] overflow-hidden transition-all duration-300 ease-in-out ' + (scrolled ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100')}>
        <div className="relative h-9 flex items-center justify-center px-4">
          {announcements.map((text, idx) => (
            <span
              key={idx}
              className={'absolute text-[10px] font-sans tracking-[0.22em] uppercase text-silver-light transition-all duration-700 ease-in-out whitespace-nowrap ' + (idx === announcementIndex ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none')}
            >
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* Nav row */}
      <div className={'transition-all duration-300 ' + (scrolled ? 'py-3' : 'py-5')}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex justify-between items-center">

          {/* Logo */}
          <Link to="/" className={'flex items-center justify-center relative transition-transform duration-300 hover:scale-105 ' + (isSearchOpen ? 'hidden lg:flex' : 'flex')}>
            <img
              src={scrolled ? '/SVG/SELESTIAL.LGOG%20IN%20BLUE.svg?v=2' : '/SVG/SELESTIAL.LGOG%20IN%20WHITE.svg?v=2'}
              alt="Selestial Logo"
              className="h-8 md:h-[38px] w-auto object-contain transition-all duration-300"
            />
          </Link>

          {/* Centre: search bar or nav links */}
          <div className="flex-1 flex justify-center items-center px-8">
            {isSearchOpen ? (
              <div ref={searchWrapperRef} className="relative w-full max-w-xl">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search
                      size={14}
                      strokeWidth={1.5}
                      className={'absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none ' + (scrolled ? 'text-dark/40' : 'text-white/40')}
                    />
                    <input
                      ref={inputRef}
                      autoFocus
                      type="text"
                      value={searchQuery}
                      onChange={handleQueryChange}
                      onKeyDown={handleKeyDown}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="SEARCH UNIVERSE OF SILVER..."
                      aria-label="Search products"
                      aria-autocomplete="list"
                      aria-expanded={showSuggestions}
                      className={'w-full bg-transparent border-b outline-none text-sm tracking-widest uppercase py-1 pl-6 transition-colors duration-300 ' + (scrolled ? 'border-dark text-dark placeholder:text-dark/40' : 'border-white text-white placeholder:text-white/40')}
                    />
                  </div>
                  <button
                    onClick={closeSearch}
                    className={'text-xs tracking-widest uppercase font-semibold shrink-0 transition-colors ' + (scrolled ? 'text-dark hover:text-gray-500' : 'text-white hover:text-silver')}
                  >
                    CLOSE
                  </button>
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && (
                  <div className={'absolute top-full left-0 right-0 mt-3 rounded-xl overflow-hidden shadow-2xl border z-[100] ' + (scrolled ? 'bg-white border-black/10' : 'bg-[#111] border-white/10')}>
                    <div className={'px-4 py-2.5 border-b flex items-center justify-between ' + (scrolled ? 'border-black/5' : 'border-white/5')}>
                      <span className={'text-[9px] tracking-[0.25em] uppercase font-medium ' + (scrolled ? 'text-black/40' : 'text-white/30')}>
                        Top Results
                      </span>
                      <span className={'text-[9px] tracking-[0.2em] uppercase ' + (scrolled ? 'text-black/30' : 'text-white/20')}>
                        {suggestions.length} found
                      </span>
                    </div>

                    <ul role="listbox">
                      {suggestions.map((product, idx) => (
                        <li
                          key={product.id}
                          role="option"
                          aria-selected={idx === activeSuggestion}
                          onMouseEnter={() => setActiveSuggestion(idx)}
                          onMouseDown={(e) => { e.preventDefault(); selectSuggestion(product); }}
                          className={'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 ' + (idx === activeSuggestion ? (scrolled ? 'bg-black/5' : 'bg-white/10') : (scrolled ? 'hover:bg-black/5' : 'hover:bg-white/5')) + ' ' + (idx < suggestions.length - 1 ? (scrolled ? 'border-b border-black/5' : 'border-b border-white/5') : '')}
                        >
                          <div className={'w-10 h-10 shrink-0 rounded-md overflow-hidden border ' + (scrolled ? 'border-black/10 bg-gray-100' : 'border-white/10 bg-white/5')}>
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={'text-xs tracking-wider uppercase truncate ' + (scrolled ? 'text-black/70' : 'text-white/70')}>
                              <HighlightMatch text={product.name} query={searchQuery} />
                            </p>
                            <p className={'text-[10px] tracking-widest uppercase mt-0.5 ' + (scrolled ? 'text-black/30' : 'text-white/30')}>
                              {product.category}
                            </p>
                          </div>
                          <span className={'text-xs font-semibold tracking-wider shrink-0 ' + (scrolled ? 'text-black/70' : 'text-white/60')}>
                            ${product.price}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onMouseDown={(e) => { e.preventDefault(); commitSearch(); }}
                      className={'w-full flex items-center justify-between px-4 py-3 text-[10px] tracking-[0.2em] uppercase font-medium transition-colors border-t group ' + (scrolled ? 'border-black/5 text-black/40 hover:text-black hover:bg-black/5' : 'border-white/5 text-white/30 hover:text-white hover:bg-white/5')}
                    >
                      <span>See all results for &ldquo;{searchQuery}&rdquo;</span>
                      <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform duration-200" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={'hidden md:flex items-center space-x-10 text-sm font-medium tracking-wider transition-colors duration-300 ' + (scrolled ? 'text-gray-700' : 'text-silver')}>
                <Link to="/" className={'transition-colors duration-200 ' + hoverColor + ' ' + (location.pathname === '/' ? (scrolled ? 'text-dark font-semibold' : 'text-white') : '')}>HOME</Link>
                <Link to="/products" className={'transition-colors duration-200 ' + hoverColor + ' ' + (location.pathname === '/products' && !location.search ? (scrolled ? 'text-dark font-semibold' : 'text-white') : '')}>ALL PRODUCTS</Link>
                <div className="relative group cursor-pointer">
                  <span className={'transition-colors duration-200 uppercase ' + hoverColor + ' ' + (location.search.includes('cat=') ? (scrolled ? 'text-dark font-semibold' : 'text-white') : '')}>CATEGORIES</span>
                  <div className="absolute top-full left-0 mt-2 w-48 glass-panel opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-300 p-4 space-y-3 flex flex-col">
                    <Link to="/products?cat=sets" className="hover:text-white transition-colors">Sets</Link>
                    <Link to="/products?cat=earrings" className="hover:text-white transition-colors">Earrings</Link>
                    <Link to="/products?cat=bracelets" className="hover:text-white transition-colors">Bracelets</Link>
                    <Link to="/products?cat=rings" className="hover:text-white transition-colors">Rings</Link>
                    <Link to="/products?cat=pendants" className="hover:text-white transition-colors">Pendants</Link>
                    <Link to="/products?cat=necklaces" className="hover:text-white transition-colors">Chains</Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Icons */}
          <div className={'flex items-center space-x-6 transition-colors duration-300 ' + iconColor}>
            <button
              onClick={isSearchOpen ? closeSearch : openSearch}
              aria-label="Search"
              className={hoverColor + ' transition'}
            >
              {isSearchOpen
                ? <X size={20} strokeWidth={1.5} />
                : <Search size={20} strokeWidth={1.5} />
              }
            </button>

            <div className="relative hidden sm:block">
              {customerName ? (
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className={'flex items-center space-x-2 text-xs tracking-widest font-semibold uppercase ' + hoverColor + ' transition'}
                >
                  <User size={20} strokeWidth={1.5} />
                  <span className="hidden lg:inline">{customerName.split(' ')[0]}</span>
                </button>
              ) : (
                <Link to="/auth" className={hoverColor + ' transition'}>
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

            <Link to="/wishlist" className={'relative hidden sm:block ' + hoverColor + ' transition'}>
              <Heart size={20} strokeWidth={1.5} />
              {wishlistCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-silver-light text-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link to="/cart" className={'relative hidden md:block ' + hoverColor + ' transition'}>
              <ShoppingBag size={20} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Link>

            <button
              className={'md:hidden transition-colors duration-300 ' + (scrolled ? 'text-dark hover:text-gray-600' : 'text-white/80 hover:text-white')}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={24} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={'md:hidden fixed inset-0 z-[60] transition-all duration-500 ease-in-out ' + (mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setMobileMenuOpen(false)} />

        <div className={'absolute top-0 right-0 w-[85%] max-w-[400px] h-full bg-dark/90 backdrop-blur-3xl border-l border-white/5 shadow-2xl transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] transform flex flex-col ' + (mobileMenuOpen ? 'translate-x-0' : 'translate-x-full')}>
          <div className="absolute left-0 top-0 w-[1px] h-full bg-gradient-to-b from-transparent via-silver/20 to-transparent" />

          <div className="flex items-center justify-between p-8">
            <div className="flex flex-col">
              <span className="text-white font-serif text-lg tracking-[0.3em] uppercase">Menu</span>
              <div className="h-[1px] w-8 bg-silver/30 mt-1" />
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="group relative p-2 overflow-hidden rounded-full">
              <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors" />
              <X size={24} strokeWidth={1} className="text-white/70 group-hover:text-white transition-all duration-300 group-hover:rotate-90" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-4 flex flex-col space-y-12 scrollbar-hide">
            <div className="flex flex-col space-y-6">
              {[
                { label: 'Home',     path: '/',         icon: Home,  num: '01' },
                { label: 'Shop All', path: '/products', icon: Grid,  num: '02' },
                { label: 'Wishlist', path: '/wishlist', icon: Heart, num: '03', badge: wishlistCount },
                { label: customerName ? 'Profile' : 'Login', path: customerName ? '/profile' : '/auth', icon: User, num: '04' },
              ].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="group flex items-end justify-between py-2 border-b border-white/5"
                >
                  <div className="flex items-baseline space-x-4">
                    <span className="text-[10px] font-sans text-silver/40 tracking-tighter">{item.num}</span>
                    <span className={'text-2xl font-serif tracking-widest uppercase transition-all duration-300 ' + (location.pathname === item.path ? 'text-white' : 'text-white/40 group-hover:text-white group-hover:translate-x-2')}>
                      {item.label}
                    </span>
                  </div>
                  <div className="relative">
                    <item.icon size={18} strokeWidth={1} className={'transition-all duration-500 ' + (location.pathname === item.path ? 'text-white scale-110' : 'text-white/20 group-hover:text-white group-hover:-translate-y-1')} />
                    {item.badge > 0 && (
                      <span className="absolute -top-3 -right-3 bg-white text-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{item.badge}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            <div className="pt-4">
              <div className="flex items-center space-x-3 mb-6">
                <span className="text-[10px] text-silver/40 uppercase tracking-[0.2em]">Curated Collections</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { name: 'Sets',      path: '/products?cat=sets'      },
                  { name: 'Earrings',  path: '/products?cat=earrings'  },
                  { name: 'Bracelets', path: '/products?cat=bracelets' },
                  { name: 'Rings',     path: '/products?cat=rings'     },
                  { name: 'Chains',    path: '/products?cat=necklaces' },
                ].map((cat) => (
                  <Link
                    key={cat.name}
                    to={cat.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-sans text-white/50 hover:text-white tracking-[0.15em] uppercase py-2 flex items-center justify-between group transition-colors"
                  >
                    <span>{cat.name}</span>
                    <div className="w-0 h-[1px] bg-silver/30 group-hover:w-12 transition-all duration-500" />
                  </Link>
                ))}
              </div>
            </div>

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
