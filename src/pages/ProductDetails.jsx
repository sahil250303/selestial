import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import gsap from 'gsap';
import { useCart } from '../App';
import { useWishlist } from '../context/WishlistContext';
import { Heart, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { getImageSrcSet, getOptimizedImageUrl } from '../utils/imageUrls.js';
import Breadcrumb from '../components/Breadcrumb';
import { getCustomerToken } from '../utils/auth';

function StarRating({ rating, max = 5, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} size={size} className={i < rating ? 'text-yellow-400' : 'text-white/20'}
          fill={i < rating ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState('Silver');
  const [selectedSize, setSelectedSize] = useState('Free Size');
  const [accordionOpen, setAccordionOpen] = useState(null);
  const [activeImage, setActiveImage] = useState('');
  const [additionalImages, setAdditionalImages] = useState([]);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const loggedIn = !!getCustomerToken();

  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((res) => { if (!res.ok) throw new Error('Not found'); return res.json(); })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProduct(data);
        setActiveImage(data.image);
        try { setAdditionalImages(data.additional_images ? JSON.parse(data.additional_images) : []); }
        catch { setAdditionalImages([]); }
        const colors = data.colors ? data.colors.split(',').map((c) => c.trim()).filter(Boolean) : ['Silver'];
        setSelectedColor(colors[0] || 'Silver');
        setLoading(false);
      })
      .catch((err) => { console.error(err); setLoading(false); });
  }, [id]);

  useEffect(() => {
    fetch(`/api/products/${id}/reviews`)
      .then((res) => res.json())
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setReviews([]));
  }, [id]);

  useEffect(() => {
    if (product) {
      gsap.fromTo('.pdp-anim', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power2.out' });
    }
  }, [product]);

  const handleAddToCart = () => {
    if (product && product.quantity > 0) {
      addToCart({ ...product, size: selectedSize, color: selectedColor });
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewSubmitting(true);
    setReviewError('');
    try {
      const token = getCustomerToken();
      const res = await fetch(`/api/products/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(reviewForm),
      });
      if (res.ok) {
        const newReview = await res.json();
        setReviews((prev) => [{ id: newReview.id, ...reviewForm, date: new Date().toISOString().split('T')[0], customer_name: 'You' }, ...prev]);
        setReviewSubmitted(true);
        setShowReviewForm(false);
      } else {
        const d = await res.json().catch(() => ({}));
        setReviewError(d.error || 'Could not submit your review. Please try again.');
      }
    } catch (_) {
      setReviewError('Network error. Please try again.');
    }
    setReviewSubmitting(false);
  };

  const avgRating = reviews.length > 0
    ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
    : 5;

  const isOOS = product?.quantity === 0;

  if (loading) {
    return (
      <div className="min-h-screen pt-32 px-6 flex items-center justify-center">
        <div className="grid grid-cols-2 gap-16 max-w-7xl w-full">
          <div className="h-[500px] bg-white/10 animate-pulse rounded-xl" />
          <div className="space-y-4 pt-4">
            <div className="h-8 bg-white/10 animate-pulse rounded w-3/4" />
            <div className="h-5 bg-white/10 animate-pulse rounded w-1/4" />
            <div className="h-4 bg-white/10 animate-pulse rounded w-full mt-8" />
            <div className="h-4 bg-white/10 animate-pulse rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-32 px-6 text-center text-white font-serif text-2xl tracking-widest">
        Product not found.
        <div className="mt-8">
          <Link to="/products" className="text-sm font-sans tracking-widest uppercase border-b border-white pb-1">Back to Collection</Link>
        </div>
      </div>
    );
  }

  // Build JSON-LD Product schema
  const productSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    material: '925 Sterling Silver',
    brand: { '@type': 'Brand', name: 'Selestial' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: product.price,
      availability: isOOS ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: `https://selestial.vercel.app/product/${product.id}`,
    },
    aggregateRating: reviews.length > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: avgRating,
      reviewCount: reviews.length,
    } : undefined,
  });

  return (
    <div className="pt-32 px-6 lg:px-12 max-w-7xl mx-auto min-h-screen relative z-10 pb-20">
      <Helmet>
        <title>{product.name} | Selestial</title>
        <meta name="description" content={product.description} />
        <link rel="canonical" href={`https://selestial.vercel.app/product/${product.id}`} />
        <meta property="og:title" content={`${product.name} | Selestial`} />
        <meta property="og:description" content={product.description} />
        <meta property="og:image" content={product.image} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={`https://selestial.vercel.app/product/${product.id}`} />
        <script type="application/ld+json">{productSchema}</script>
      </Helmet>

      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Collection', href: '/products' },
        { label: product.category?.charAt(0).toUpperCase() + product.category?.slice(1), href: `/products?cat=${product.category}` },
        { label: product.name },
      ]} />

      <div className="flex flex-col lg:flex-row gap-16 mt-4">
        {/* Image Gallery */}
        <div className="w-full lg:w-1/2 pdp-anim flex flex-col md:flex-row gap-6">
          {additionalImages.length > 0 && (
            <div className="flex md:flex-col gap-4 order-2 md:order-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {[product.image, ...additionalImages].map((img, idx) => (
                <button key={idx} onClick={() => setActiveImage(img)}
                  aria-label={`View image ${idx + 1}`}
                  className={`w-20 h-20 shrink-0 border transition-all ${activeImage === img ? 'border-white' : 'border-white/10 hover:border-white/30'}`}>
                  <img src={getOptimizedImageUrl(img, { width: 160, quality: 60 })} alt={`${product.name} view ${idx + 1}`}
                    loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 order-1 md:order-2">
            <div className="glass-panel overflow-hidden border border-white/10 p-2 relative group">
              {isOOS && (
                <div className="absolute top-4 left-4 z-20 bg-black/80 text-white text-[10px] tracking-widest uppercase px-3 py-1 font-bold">
                  Out of Stock
                </div>
              )}
              <img
                src={getOptimizedImageUrl(activeImage, { width: 1200, quality: 82 })}
                srcSet={getImageSrcSet(activeImage, [640, 960, 1200, 1600], { quality: 82 })}
                sizes="(min-width:1024px) 50vw, 100vw"
                alt={product.name}
                fetchPriority="high"
                decoding="async"
                className="w-full h-auto max-h-[800px] object-cover rounded-sm"
              />
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="w-full lg:w-1/2 pdp-anim flex flex-col pt-4">
          <div className="glass-panel p-8 lg:p-10">
            <h1 className="font-serif text-4xl text-white tracking-wider uppercase leading-tight mb-2">{product.name}</h1>
            {product.tagline && <p className="text-silver italic tracking-wide text-sm mb-4">{product.tagline}</p>}

            <div className="flex items-center gap-3 mb-4">
              <p className={`text-xl tracking-widest ${isOOS ? 'text-red-400' : 'text-silver-light'}`}>
                {isOOS ? 'Out of Stock' : `$${Number(product.price).toFixed(2)}`}
              </p>
            </div>

            {/* Rating summary */}
            <div className="flex items-center gap-2 mb-6">
              <StarRating rating={avgRating} />
              <span className="text-silver-dark text-xs tracking-widest uppercase">
                {reviews.length > 0 ? `${avgRating}/5 · ${reviews.length} review${reviews.length !== 1 ? 's' : ''}` : 'Be the first to review'}
              </span>
              <Link to="/size-guide" className="ml-auto text-[10px] tracking-widest uppercase text-silver-dark hover:text-white border-b border-silver-dark/30 hover:border-white transition-colors">
                Size Guide
              </Link>
            </div>

            {/* Color selector */}
            {product.colors && (
              <div className="mb-6 border-b border-white/10 pb-6">
                <p className="text-xs text-white uppercase tracking-widest mb-3">Color: <span className="text-silver ml-1">{selectedColor}</span></p>
                <div className="flex gap-3">
                  {product.colors.split(',').map((c) => c.trim()).filter(Boolean).map((c) => {
                    const map = { Silver: 'from-gray-200 to-gray-400', Black: 'from-gray-700 to-gray-900', Obsidian: 'from-neutral-800 to-black' };
                    return (
                      <button key={c} onClick={() => setSelectedColor(c)} aria-label={`Select colour ${c}`}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${selectedColor === c ? 'border-white' : 'border-transparent'}`}>
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${map[c] || 'from-gray-400 to-gray-500'} border border-black/20`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add to cart */}
            <div className="flex gap-4 mb-4">
              <button onClick={handleAddToCart} disabled={isOOS}
                className={`flex-[4] py-4 tracking-widest text-sm uppercase transition-all font-medium ${!isOOS ? 'bg-white text-dark hover:bg-silver-light' : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'}`}>
                {isOOS ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button onClick={() => toggleWishlist(product)} aria-label={isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                className={`flex-1 flex items-center justify-center border transition-all ${isInWishlist(product.id) ? 'bg-red-500 border-red-500 text-white' : 'bg-white/5 border-white/20 text-white hover:bg-white/10'}`}>
                <Heart size={20} fill={isInWishlist(product.id) ? 'currentColor' : 'none'} />
              </button>
            </div>

            <p className={`text-xs tracking-widest mb-6 ${!isOOS ? 'text-green-400' : 'text-red-400'}`}>
              {!isOOS ? `✓ In Stock — ${product.quantity} available` : '✕ Currently Out of Stock'}
            </p>

            {/* Accordions */}
            <div className="space-y-2">
              {[
                { id: 'details', title: 'Product Description', content: product.description },
                ...(product.details ? [{ id: 'specs', title: 'Specifications & Details', content: product.details }] : []),
                { id: 'materials', title: 'Materials', content: 'Crafted from premium 925 sterling silver (92.5% pure silver). Hallmarked for authenticity. Tarnish-resistant with proper care — see our Care Guide.' },
                { id: 'shipping', title: 'Shipping & Returns', content: 'Free standard shipping on orders over $100. Express options available. Easy 30-day returns. See our Shipping & Returns page for full details.' },
              ].map((s) => (
                <div key={s.id} className="border border-white/10 bg-black/20 rounded-sm">
                  <button onClick={() => setAccordionOpen(accordionOpen === s.id ? null : s.id)}
                    className="w-full px-6 py-4 flex justify-between items-center text-xs tracking-widest uppercase text-white hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                    aria-expanded={accordionOpen === s.id}>
                    {s.title}
                    {accordionOpen === s.id ? <ChevronUp size={14} className="text-silver-dark" /> : <ChevronDown size={14} className="text-silver-dark" />}
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${accordionOpen === s.id ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="px-6 pb-6 text-xs text-silver leading-relaxed font-light">{s.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Reviews Section ──────────────────────────────────────────────────── */}
      <div className="mt-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-2xl text-white tracking-widest uppercase">
            Customer Reviews {reviews.length > 0 && <span className="text-silver-dark text-sm ml-2">({reviews.length})</span>}
          </h2>
          {!reviewSubmitted && (loggedIn ? (
            <button onClick={() => setShowReviewForm(!showReviewForm)}
              className="px-6 py-2 text-xs font-bold tracking-widest border border-white/20 text-white hover:bg-white/5 uppercase transition-colors rounded-sm">
              {showReviewForm ? 'Cancel' : 'Write a Review'}
            </button>
          ) : (
            <Link to="/auth"
              className="px-6 py-2 text-xs font-bold tracking-widest border border-white/20 text-white hover:bg-white/5 uppercase transition-colors rounded-sm">
              Sign in to review
            </Link>
          ))}
        </div>

        {/* Review form */}
        {showReviewForm && (
          <form onSubmit={handleReviewSubmit} className="glass-panel p-8 mb-8">
            <h3 className="font-serif text-white tracking-widest uppercase text-sm mb-6">Your Review</h3>
            <div className="mb-4">
              <p className="text-xs uppercase tracking-widest text-silver mb-3">Rating</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setReviewForm((f) => ({ ...f, rating: star }))}
                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}>
                    <Star size={24} className={star <= reviewForm.rating ? 'text-yellow-400' : 'text-white/20'}
                      fill={star <= reviewForm.rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-xs uppercase tracking-widest text-silver mb-2">Comment</label>
              <textarea required rows={4} value={reviewForm.comment} onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                placeholder="Share your experience with this piece..."
                className="w-full bg-dark/50 border border-white/10 p-3 text-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus:border-white/50 transition-colors rounded-sm resize-none" />
            </div>
            {reviewError && <p className="text-red-400 text-xs mb-3 tracking-wider">{reviewError}</p>}
            <button type="submit" disabled={reviewSubmitting}
              className="px-8 py-3 text-xs font-bold tracking-widest bg-white text-black hover:bg-silver-light uppercase transition-colors rounded-sm disabled:opacity-70">
              {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}

        {reviewSubmitted && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-4 rounded-sm mb-8 tracking-wider">
            Thank you for your review!
          </div>
        )}

        {/* Reviews list */}
        {reviews.length > 0 ? (
          <div className="space-y-6">
            {reviews.map((r) => (
              <div key={r.id} className="glass-panel p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white text-sm font-medium tracking-wide">{r.customer_name}</p>
                    <p className="text-silver-dark text-[10px] tracking-widest mt-0.5">{r.date}</p>
                  </div>
                  <StarRating rating={r.rating} size={14} />
                </div>
                <p className="text-silver-dark text-sm leading-relaxed font-light">{r.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-white/10 rounded-xl">
            <p className="text-silver-dark text-sm tracking-wider">No reviews yet. Be the first to share your experience.</p>
          </div>
        )}
      </div>
    </div>
  );
}
