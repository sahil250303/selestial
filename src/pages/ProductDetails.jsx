import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import gsap from 'gsap';
import { useCart } from '../App';
import { useWishlist } from '../context/WishlistContext';
import { Heart } from 'lucide-react';

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState('Silver');
  const [selectedSize, setSelectedSize] = useState('Free Size');
  const [accordionOpen, setAccordionOpen] = useState(null);
  const [activeImage, setActiveImage] = useState('');
  const [additionalImages, setAdditionalImages] = useState([]);
  
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  
  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        if (data.error) throw new Error(data.error);
        setProduct(data);
        setActiveImage(data.image);
        try {
          const extra = data.additional_images ? JSON.parse(data.additional_images) : [];
          setAdditionalImages(extra);
        } catch (e) {
          setAdditionalImages([]);
        }
        const mappedColors = data.colors ? data.colors.split(',').map(c => c.trim()).filter(Boolean) : ['Silver'];
        setSelectedColor(mappedColors[0] || 'Silver');
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (product) {
      gsap.fromTo('.pdp-anim', 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power2.out' }
      );
    }
  }, [product]);

  const handleAddToCart = () => {
    if (product) {
      addToCart({ ...product, size: selectedSize, color: selectedColor });
    }
  };

  const toggleAccordion = (section) => {
    setAccordionOpen(accordionOpen === section ? null : section);
  };

  if (loading) {
    return <div className="min-h-screen pt-32 px-6 text-center text-white font-serif text-2xl tracking-widest">Loading...</div>;
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-32 px-6 text-center text-white font-serif text-2xl tracking-widest">
        Product not found.
        <div className="mt-8">
          <Link to="/products" className="text-sm font-sans tracking-widest uppercase border-b border-white hover:text-silver hover:border-silver pb-1 transition-all">Back to Collection</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 px-6 lg:px-12 max-w-7xl mx-auto min-h-screen relative z-10 pb-20">
      <div className="flex flex-col lg:flex-row gap-16">
        
        {/* Left: Image Gallery */}
        <div className="w-full lg:w-1/2 pdp-anim flex flex-col md:flex-row gap-6">
          {/* Thumbnails */}
          {additionalImages.length > 0 && (
            <div className="flex md:flex-col gap-4 order-2 md:order-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {[product.image, ...additionalImages].map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-20 h-20 shrink-0 border transition-all ${activeImage === img ? 'border-white bg-white/5' : 'border-white/10 hover:border-white/30'}`}
                >
                  <img src={img} alt={`${product.name} ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          
          <div className="flex-1 order-1 md:order-2">
            <div className="glass-panel overflow-hidden border border-white/10 p-2 relative group">
              <div className="absolute inset-0 bg-dark/10 group-hover:bg-transparent transition-all z-10"></div>
              <img 
                src={activeImage} 
                alt={product.name} 
                className="w-full h-auto max-h-[800px] object-cover rounded-sm object-center"
              />
            </div>
          </div>
        </div>

        {/* Right: Product Info */}
        <div className="w-full lg:w-1/2 pdp-anim flex flex-col pt-4">
          <div className="glass-panel p-8 lg:p-10">
            <div className="mb-2">
              <h1 className="font-serif text-4xl text-white tracking-wider uppercase leading-tight">{product.name}</h1>
              {product.tagline && <p className="text-silver italic tracking-wide text-sm mt-2">{product.tagline}</p>}
            </div>
            <div className="mb-4">
              <p className="text-xl text-silver-light tracking-widest">${product.price.toFixed(2)}</p>
              {product.style_type && <p className="text-[10px] text-silver-dark uppercase tracking-widest mt-2 border border-white/10 inline-block px-3 py-1 bg-white/5">{product.style_type}</p>}
            </div>
          
          <div className="flex items-center gap-1 mb-8">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className={`w-4 h-4 ${i < 4 ? 'text-yellow-500' : 'text-white/20'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-silver-dark text-xs ml-2 tracking-widest uppercase mt-0.5">22 reviews</span>
          </div>

          {/* Color Selector */}
          <div className="mb-6 border-b border-white/10 pb-6">
            <p className="text-xs text-white uppercase tracking-widest mb-3">Color: <span className="text-silver ml-1">{selectedColor}</span></p>
            <div className="flex gap-3">
              {(product.colors ? product.colors.split(',').map(c => c.trim()).filter(Boolean) : ['Silver']).map(c => {
                const colorGradients = {
                  Silver: 'from-gray-200 to-gray-400',
                  Black: 'from-gray-700 to-gray-900',
                  Obsidian: 'from-neutral-800 to-black',
                };
                const mapping = colorGradients[c] || 'from-gray-400 to-gray-500';
                return (
                  <button 
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${selectedColor === c ? 'border-white' : 'border-transparent'}`}
                    aria-label={c}
                  >
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${mapping} border border-black/20`}></div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size Indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-end mb-3">
              <p className="text-xs text-white uppercase tracking-widest">Size: <span className="text-silver ml-1">Free Size</span></p>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleAddToCart}
              disabled={product.quantity === 0}
              className={`flex-[4] py-4 tracking-widest text-sm uppercase transition-all flex items-center justify-center gap-2 font-medium ${product.quantity > 0 ? 'bg-white text-dark hover:bg-silver-light' : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'}`}
            >
              {product.quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
            </button>
            <button 
              onClick={() => toggleWishlist(product)}
              className={`flex-1 flex items-center justify-center border transition-all ${isInWishlist(product.id) ? 'bg-red-500 border-red-500 text-white' : 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/40'}`}
              title={isInWishlist(product.id) ? "Remove from Wishlist" : "Add to Wishlist"}
            >
              <Heart size={20} fill={isInWishlist(product.id) ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Stock Indicator */}
          <div className="mt-4 mb-8 space-y-2 text-xs tracking-widest">
            {product.quantity > 0 ? (
              <p className="text-green-400 flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                In Stock - {product.quantity} units available
              </p>
            ) : (
              <p className="text-red-400 flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                Currently Out of Stock
              </p>
            )}
            <p className="text-silver flex items-center gap-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              Easy Returns & Exchanges
            </p>
          </div>

          {/* Value Props */}
          <div className="mb-8 border-t border-b border-white/10 py-6">
            <h3 className="text-sm text-white tracking-widest uppercase mb-4">Our materials ensure Selestial will last a lifetime.</h3>
            <ul className="space-y-4">
              <li className="flex gap-4">
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center shrink-0 bg-white/5">
                  <span className="text-[14px]">✨</span>
                </div>
                <div>
                  <p className="text-xs text-white uppercase tracking-widest mb-1">Lifetime Guarantee</p>
                  <p className="text-xs text-silver-dark leading-relaxed">Our premium materials ensure Selestial jewelry will last you a lifetime.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center shrink-0 bg-white/5">
                  <span className="text-[14px]">💧</span>
                </div>
                <div>
                  <p className="text-xs text-white uppercase tracking-widest mb-1">Water, Heat & Sweat-Proof</p>
                  <p className="text-xs text-silver-dark leading-relaxed">Hit the gym, go for a run or even take a shower.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Accordions */}
          <div className="space-y-2">
            {[
              { id: 'details', title: 'Product details', content: product.description },
              ...(product.details ? [{ id: 'specs', title: 'Specifications & Details', content: product.details }] : []),
              { id: 'materials', title: 'Our Materials', content: 'Crafted with premium 316L stainless steel and rhodium plating for ultimate durability.' },
              { id: 'warranty', title: 'Lifetime Warranty', content: 'All pieces come with a lifetime warranty against fading and tarnishing.' },
              { id: 'shipping', title: 'Shipping & Returns', content: 'Free worldwide shipping on orders over $100. Easy 30-day returns.' },
            ].map(section => (
              <div key={section.id} className="border border-white/10 glass-panel bg-black/20">
                <button 
                  onClick={() => toggleAccordion(section.id)}
                  className="w-full px-6 py-4 flex justify-between items-center text-xs tracking-widest uppercase text-white hover:bg-white/5 transition-colors focus:outline-none"
                >
                  {section.title}
                  <span className="text-silver text-lg leading-none font-light">{accordionOpen === section.id ? '−' : '+'}</span>
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ${accordionOpen === section.id ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="px-6 pb-6 text-xs text-silver leading-relaxed font-light">
                    {section.content}
                  </div>
                </div>
              </div>
            ))}
          </div>

          </div>
        </div>
      </div>
    </div>
  );
}
