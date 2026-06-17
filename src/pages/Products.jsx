import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import gsap from 'gsap';
import { useCart } from '../App';
import { useWishlist } from '../context/WishlistContext';
import { Heart } from 'lucide-react';
import { getImageSrcSet, getOptimizedImageUrl } from '../utils/imageUrls.js';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import Breadcrumb from '../components/Breadcrumb';

export default function Products() {
  const [filterMode, setFilterMode] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    setLoading(true);
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => { setProducts(data); setLoading(false); })
      .catch((err) => { console.error('Failed to load products', err); setLoading(false); });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFilterMode(params.get('gender') || 'all');
    setCategoryFilter(params.get('cat') || 'all');
    setSearchQuery(params.get('q') || '');
  }, [location.search]);

  useEffect(() => {
    if (!loading) {
      gsap.fromTo('.product-card',
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power2.out' }
      );
    }
  }, [filterMode, categoryFilter, searchQuery, loading]);

  const filteredProducts = products.filter((p) => {
    const genderMatch = filterMode === 'all' || p.gender?.toLowerCase() === filterMode.toLowerCase();
    const catMatch = categoryFilter === 'all' || p.category?.toLowerCase() === categoryFilter.toLowerCase();
    const searchMatch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return genderMatch && catMatch && searchMatch;
  });

  const clearFilters = () => {
    setFilterMode('all');
    setCategoryFilter('all');
    setSearchQuery('');
    navigate('/products');
  };

  const pageTitle = searchQuery
    ? `Results for "${searchQuery}" | Selestial`
    : categoryFilter !== 'all'
    ? `${categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)} | Selestial`
    : 'Collection | Selestial';

  return (
    <div className="pt-32 px-6 lg:px-12 max-w-7xl mx-auto min-h-screen relative z-10">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content="Browse Selestial's complete collection of premium 925 sterling silver jewellery — rings, chains, bracelets, earrings and more." />
        <link rel="canonical" href={`https://selestial-lovat.vercel.app/products`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content="Premium 925 sterling silver jewellery — handcrafted with celestial precision." />
        <meta property="og:url" content="https://selestial-lovat.vercel.app/products" />
      </Helmet>

      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Collection' }]} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 mt-4">
        <div>
          <h1 className="font-serif text-5xl text-white tracking-widest uppercase mb-4">
            {searchQuery ? `Results for "${searchQuery}"` : 'Collection'}
          </h1>
          <p className="font-sans text-silver tracking-widest uppercase text-sm">
            {loading ? 'Loading...' : `${filteredProducts.length} item${filteredProducts.length !== 1 ? 's' : ''}`}
          </p>
          {searchQuery && (
            <button onClick={clearFilters}
              className="mt-4 text-xs tracking-widest uppercase text-white border-b border-white hover:text-silver hover:border-silver transition-colors">
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Loading skeleton grid */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      )}

      {/* Product grid */}
      {!loading && filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredProducts.map((product) => {
            const isOOS = product.quantity === 0;
            const imageSrc = getOptimizedImageUrl(product.image, { width: 640, quality: 72 });
            const imageSrcSet = getImageSrcSet(product.image, [320, 640, 960], { quality: 72 });

            return (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="product-card group flex flex-col glass-panel overflow-hidden cursor-pointer"
              >
                <div className="h-96 overflow-hidden relative">
                  <div className="absolute inset-0 bg-dark/10 group-hover:bg-transparent transition-all z-10" />
                  <img
                    src={imageSrc}
                    srcSet={imageSrcSet}
                    sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                  />

                  {/* Out-of-stock badge */}
                  {isOOS && (
                    <div className="absolute top-0 left-0 right-0 bg-black/70 text-white text-[10px] tracking-[0.25em] uppercase font-bold py-2 text-center z-20">
                      Out of Stock
                    </div>
                  )}

                  {/* Wishlist */}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product); }}
                    aria-label={isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                    className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur-md border transition-all z-20 ${isInWishlist(product.id) ? 'bg-red-500 border-red-500 text-white' : 'bg-black/20 border-white/20 text-white hover:bg-black/40 hover:border-white/40'}`}
                  >
                    <Heart size={18} fill={isInWishlist(product.id) ? 'currentColor' : 'none'} />
                  </button>

                  {/* Quick Add */}
                  {!isOOS && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addToCart({ ...product, size: 'Free Size', color: 'Silver' });
                      }}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-dark font-medium px-6 py-3 tracking-widest text-xs uppercase opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 z-20 hover:bg-silver-light whitespace-nowrap"
                    >
                      Add to Cart
                    </button>
                  )}
                </div>

                <div className="p-6 text-center">
                  <h3 className="font-serif text-lg text-white tracking-wider mb-2">{product.name}</h3>
                  <p className={`tracking-widest text-sm mb-4 uppercase ${isOOS ? 'text-red-400' : 'text-silver-dark'}`}>
                    {isOOS ? 'Out of Stock' : `$${Number(product.price).toFixed(2)}`}
                  </p>
                  <p className="text-xs text-silver leading-relaxed font-light">{product.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-24 flex flex-col items-center gap-6">
          <p className="font-serif text-2xl text-white tracking-widest uppercase">No pieces found</p>
          <p className="text-silver-dark text-sm tracking-wider">
            No products match your current selection.
          </p>
          <button
            onClick={clearFilters}
            className="px-8 py-3 text-xs font-bold tracking-widest bg-white text-black hover:bg-silver-light uppercase transition-colors rounded-sm"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
