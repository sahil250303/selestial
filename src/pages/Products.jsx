import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useCart } from '../App';
import { useWishlist } from '../context/WishlistContext';
import { Heart } from 'lucide-react';

export default function Products() {
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'men', 'women'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error('Failed to load products', err));
  }, []);

  useEffect(() => {
    // Parse URL params for simple routing filtering
    const params = new URLSearchParams(location.search);
    const gender = params.get('gender');
    const cat = params.get('cat');
    const q = params.get('q');
    
    setFilterMode(gender || 'all');
    setCategoryFilter(cat || 'all');
    setSearchQuery(q || '');
  }, [location.search]);

  useEffect(() => {
    gsap.fromTo('.product-card', 
      { y: 50, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power2.out' }
    );
  }, [filterMode, categoryFilter, searchQuery]);

  const filteredProducts = products.filter(p => {
    let genderMatch = filterMode === 'all' || p.gender?.toLowerCase() === filterMode.toLowerCase();
    let catMatch = categoryFilter === 'all' || p.category?.toLowerCase() === categoryFilter.toLowerCase();
    let searchMatch = !searchQuery || 
                      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return genderMatch && catMatch && searchMatch;
  });

  return (
    <div className="pt-32 px-6 lg:px-12 max-w-7xl mx-auto min-h-screen relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16">
        <div>
          <h1 className="font-serif text-5xl text-white tracking-widest uppercase mb-4">
            {searchQuery ? `Results for "${searchQuery}"` : 'Collection'}
          </h1>
          <p className="font-sans text-silver tracking-widest uppercase text-sm">
            {searchQuery ? `${filteredProducts.length} items found` : 'Explore Selestial universe'}
          </p>
          {searchQuery && (
            <button 
              onClick={() => {
                setSearchQuery('');
                // Optionally clear URL bar
                window.history.replaceState({}, '', window.location.pathname);
              }}
              className="mt-4 text-xs tracking-widest uppercase text-white border-b border-white hover:text-silver hover:border-silver transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
        

      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filteredProducts.map((product) => (
          <div key={product.id} onClick={() => navigate(`/product/${product.id}`)} className="product-card group flex flex-col glass-panel overflow-hidden cursor-pointer">
            <div className="h-96 overflow-hidden relative">
              <div className="absolute inset-0 bg-dark/10 group-hover:bg-transparent transition-all z-10"></div>
              <img 
                src={product.image} 
                alt={product.name} 
                loading="lazy" 
                decoding="async"
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
              />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(product);
                }}
                className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur-md border transition-all z-20 ${isInWishlist(product.id) ? 'bg-red-500 border-red-500 text-white' : 'bg-black/20 border-white/20 text-white hover:bg-black/40 hover:border-white/40'}`}
              >
                <Heart size={18} fill={isInWishlist(product.id) ? "currentColor" : "none"} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // Default size and color if added directly from catalog
                  addToCart({...product, size: 'Free Size', color: 'Silver'}); 
                }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-dark font-medium px-6 py-3 tracking-widest text-xs uppercase opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 z-20 hover:bg-silver-light"
              >
                Add to Cart
              </button>
            </div>
            <div className="p-6 text-center">
              <h3 className="font-serif text-lg text-white tracking-wider mb-2">{product.name}</h3>
              <p className="text-silver-dark tracking-widest text-sm mb-4 uppercase">${product.price}</p>
              <p className="text-xs text-silver leading-relaxed font-light">{product.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      {filteredProducts.length === 0 && (
        <div className="text-center py-20 text-silver font-serif text-xl tracking-widest">
          No products found in this category.
        </div>
      )}
    </div>
  );
}
