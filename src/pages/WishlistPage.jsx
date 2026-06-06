import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, ArrowLeft } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../App';
import { getImageSrcSet, getOptimizedImageUrl } from '../utils/imageUrls.js';

const WishlistPage = () => {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleMoveToCart = (product) => {
    addToCart(product);
    removeFromWishlist(product.id);
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 md:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <Link to="/products" className="flex items-center gap-2 text-silver-light hover:text-white transition-colors text-xs tracking-widest uppercase mb-4">
              <ArrowLeft size={14} /> Back to Shop
            </Link>
            <h1 className="text-4xl font-light tracking-[0.2em] text-white">MY WISHLIST</h1>
          </div>
          <div className="text-right">
            <span className="text-gray-500 text-sm tracking-widest uppercase">{wishlist.length} ITEMS</span>
          </div>
        </div>

        {wishlist.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-16 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart size={32} className="text-gray-600" />
            </div>
            <h2 className="text-2xl font-light text-white mb-4 tracking-wide">YOUR WISHLIST IS EMPTY</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Save your favorite silver pieces to your wishlist and they'll appear here for easy access later.
            </p>
            <Link 
              to="/products"
              className="inline-block bg-white text-black px-10 py-4 rounded-full font-medium tracking-widest hover:bg-silver transition-colors"
            >
              EXPLORE COLLECTIONS
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {wishlist.map((product) => (
              <div 
                key={product.id}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden group hover:border-white/20 transition-all duration-500"
              >
                <div className="relative aspect-square overflow-hidden bg-black/40">
                  <img 
                    src={getOptimizedImageUrl(product.image || "/api/placeholder/400/400", { width: 640, quality: 72 })}
                    srcSet={getImageSrcSet(product.image, [320, 640, 960], { quality: 72 })}
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <button 
                    onClick={() => removeFromWishlist(product.id)}
                    className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-light text-white tracking-wide uppercase">{product.name}</h3>
                    <p className="text-silver-light font-medium">${product.price}</p>
                  </div>
                  <p className="text-xs text-gray-500 tracking-widest uppercase mb-6">{product.category}</p>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleMoveToCart(product)}
                      className="flex-1 bg-white text-black py-3 rounded-xl text-xs font-bold tracking-widest hover:bg-silver transition-all flex items-center justify-center gap-2"
                    >
                      <ShoppingBag size={14} /> ADD TO BAG
                    </button>
                    <Link 
                      to={`/product/${product.id}`}
                      className="p-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all"
                    >
                      VIEW
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
