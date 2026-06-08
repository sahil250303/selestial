import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, ChevronRight, Heart, ArrowRight } from 'lucide-react';
import { useCart } from '../App';
import { useWishlist } from '../context/WishlistContext';
import { mockProducts } from '../data/mockProducts';
import { getOptimizedImageUrl } from '../utils/imageUrls';

export default function Home() {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  // Hero Slider
  const [currentHero, setCurrentHero] = useState(0);
  const heroSlides = [
    {
      image: "/hero_1.png",
      title: "THE VENUS RAIN COLLECTION",
      subtitle: "Sensual shapes and fluid sterling silver silhouettes that capture the starlight.",
      link: "/products?cat=necklaces",
      linkText: "SHOP THE COLLECTION"
    },
    {
      image: "/hero_2.png",
      title: "ELEVATED CLASSICS",
      subtitle: "Handcrafted 925 sterling silver rings designed to make an understated statement.",
      link: "/products?cat=rings",
      linkText: "SHOP RINGS"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHero((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const prevHeroSlide = () => {
    setCurrentHero((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));
  };

  const nextHeroSlide = () => {
    setCurrentHero((prev) => (prev + 1) % heroSlides.length);
  };

  // Newsletter — calls real API, sends genuine discount code
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeMsg, setSubscribeMsg] = useState('');
  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribing(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      setSubscribeMsg(data.message || 'Welcome to the Universe of Silver. Check your inbox.');
      setSubscribed(true);
      setEmail('');
    } catch (_) {
      setSubscribeMsg('Something went wrong. Please try again.');
    }
    setSubscribing(false);
  };

  return (
    <div className="w-full bg-[#000000] text-white">
      <Helmet>
        <title>Selestial | Universe of Silver</title>
        <meta name="description" content="Premium 925 sterling silver jewellery — rings, chains, bracelets and earrings crafted with celestial precision. Free shipping over $100." />
        <link rel="canonical" href="https://selestial.vercel.app/" />
        <meta property="og:title" content="Selestial | Universe of Silver" />
        <meta property="og:description" content="Premium 925 sterling silver jewellery crafted with celestial precision." />
        <meta property="og:image" content="https://selestial.vercel.app/hero_1.png" />
        <meta property="og:url" content="https://selestial.vercel.app/" />
        <meta property="og:type" content="website" />
      </Helmet>
      {/* Hero Section */}
      <section className="relative w-full h-[65vh] md:h-[80vh] overflow-hidden bg-black select-none">
        {heroSlides.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentHero ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {/* Background Image */}
            <div className="absolute inset-0 bg-black/30 z-10" />
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover transform scale-100 transition-transform duration-[6000ms] ease-out"
              loading="eager"
            />
            {/* Content Overlay */}
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6 pt-28 md:pt-0">
              <span className="text-[10px] md:text-xs tracking-[0.4em] text-silver uppercase mb-4 font-sans font-medium">NEW COLLECTION</span>
              <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl tracking-widest text-white uppercase mb-6 max-w-3xl leading-tight">
                {slide.title}
              </h1>
              <p className="font-sans text-xs md:text-sm tracking-[0.15em] text-silver-light max-w-lg mb-10 leading-relaxed font-light">
                {slide.subtitle}
              </p>
              <div className="flex gap-4">
                <Link
                  to={slide.link}
                  className="px-8 py-3.5 text-xs font-bold tracking-widest text-black bg-white uppercase hover:bg-silver-light transition-all duration-300 rounded-sm"
                >
                  {slide.linkText}
                </Link>
                <Link
                  to="/products"
                  className="px-8 py-3.5 text-xs font-bold tracking-widest text-white border border-white uppercase hover:bg-white hover:text-black transition-all duration-300 rounded-sm"
                >
                  DISCOVER ALL
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* Hero Navigation Controls */}
        <button
          onClick={prevHeroSlide}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-30 p-2 text-white/50 hover:text-white hover:bg-black/20 rounded-full transition-all duration-300"
          aria-label="Previous Slide"
        >
          <ChevronLeft size={28} strokeWidth={1} />
        </button>
        <button
          onClick={nextHeroSlide}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-30 p-2 text-white/50 hover:text-white hover:bg-black/20 rounded-full transition-all duration-300"
          aria-label="Next Slide"
        >
          <ChevronRight size={28} strokeWidth={1} />
        </button>

        {/* Indicator dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex space-x-3">
          {heroSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentHero(idx)}
              className={`h-0.5 w-8 transition-colors duration-300 ${idx === currentHero ? 'bg-white' : 'bg-white/30'}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Shop by Category — horizontal scroll on mobile, 5-col grid on desktop */}
      <section className="py-16 md:py-24 bg-[#000000] border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-xl md:text-2xl text-center text-white tracking-[0.3em] uppercase mb-8 md:mb-16 px-6">
            SHOP BY CATEGORY
          </h2>

          {/* Mobile: full-bleed horizontal scroll strip */}
          <div className="md:hidden flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory px-5 pb-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { name: 'Chains',    img: '/categories/Chain-960.webp',     query: 'necklaces' },
              { name: 'Bracelets', img: '/categories/Bracelets-960.webp', query: 'bracelets' },
              { name: 'Rings',     img: '/categories/Rings-960.webp',     query: 'rings'     },
              { name: 'Earrings',  img: '/categories/Earrings-960.webp',  query: 'earrings'  },
              { name: 'Sets',      img: '/categories/Sets-960.webp',      query: 'sets'      },
            ].map((cat) => (
              <Link
                to={`/products?cat=${cat.query}`}
                key={cat.name}
                className="flex-none snap-start w-[42vw] max-w-[168px] flex flex-col items-center"
              >
                <div className="w-full aspect-square bg-[#0a0a0a] overflow-hidden border border-white/5 rounded-lg relative">
                  <img
                    src={cat.img}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    draggable="false"
                  />
                </div>
                <span className="font-sans font-bold text-white text-[10px] tracking-[0.2em] uppercase mt-3 text-center">
                  {cat.name}
                </span>
              </Link>
            ))}
            {/* Trailing spacer so the last card doesn't clip against the edge */}
            <div className="flex-none w-2" aria-hidden="true" />
          </div>

          {/* Desktop: standard 5-column grid */}
          <div className="hidden md:grid md:grid-cols-5 gap-6 px-6 lg:px-12">
            {[
              { name: 'Chains',    img: '/categories/Chain-960.webp',     query: 'necklaces' },
              { name: 'Bracelets', img: '/categories/Bracelets-960.webp', query: 'bracelets' },
              { name: 'Rings',     img: '/categories/Rings-960.webp',     query: 'rings'     },
              { name: 'Earrings',  img: '/categories/Earrings-960.webp',  query: 'earrings'  },
              { name: 'Sets',      img: '/categories/Sets-960.webp',      query: 'sets'      },
            ].map((cat) => (
              <Link
                to={`/products?cat=${cat.query}`}
                key={cat.name}
                className="group flex flex-col items-center cursor-pointer"
              >
                <div className="w-full aspect-square bg-[#0a0a0a] overflow-hidden border border-white/5 relative">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500 z-10 pointer-events-none" />
                  <img
                    src={cat.img}
                    alt={cat.name}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading="lazy"
                  />
                </div>
                <h3 className="font-sans font-bold text-white text-[11px] tracking-[0.25em] uppercase mt-5 text-center group-hover:text-silver-light transition-colors duration-300">
                  {cat.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Split Promotional Banners */}
      <section className="py-20 px-6 lg:px-12 bg-[#000000] border-b border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Split */}
          <div className="flex flex-col group">
            <div className="aspect-[4/5] bg-[#0a0a0a] overflow-hidden border border-white/5 mb-6">
              <img
                src="/split_1.png"
                alt="Stellar Chains Campaign"
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
            </div>
            <span className="text-[10px] tracking-[0.3em] text-silver-dark uppercase mb-2 font-medium">CAMPAIGN SPOTLIGHT</span>
            <h3 className="font-serif text-xl tracking-wider text-white uppercase mb-3">
              STELLAR CHAINS & PENDANTS
            </h3>
            <p className="text-silver-dark text-xs tracking-wider font-light leading-relaxed mb-6 max-w-md">
              Explore a curated study in sleek geometric forms and hand-finished premium link designs that catch light from every angle.
            </p>
            <Link
              to="/products?cat=necklaces"
              className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-white border-b border-white/20 pb-1 hover:border-white w-fit transition-colors group/btn"
            >
              DISCOVER CHAINS
              <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>

          {/* Right Split */}
          <div className="flex flex-col group">
            <div className="aspect-[4/5] bg-[#0a0a0a] overflow-hidden border border-white/5 mb-6">
              <img
                src="/split_2.png"
                alt="Nova Cuffs Campaign"
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
            </div>
            <span className="text-[10px] tracking-[0.3em] text-silver-dark uppercase mb-2 font-medium">SEASONAL ESSENTIALS</span>
            <h3 className="font-serif text-xl tracking-wider text-white uppercase mb-3">
              THE NOVA CUFFS
            </h3>
            <p className="text-silver-dark text-xs tracking-wider font-light leading-relaxed mb-6 max-w-md">
              Striking minimalist silhouettes engineered to wrap the wrist in timeless radiance and clean modern finish.
            </p>
            <Link
              to="/products?cat=bracelets"
              className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-white border-b border-white/20 pb-1 hover:border-white w-fit transition-colors group/btn"
            >
              DISCOVER BRACELETS
              <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trending Spotlight / "Our Picks" */}
      <section className="py-24 px-6 lg:px-12 bg-[#000000] border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-xl md:text-2xl text-center text-white tracking-[0.3em] uppercase mb-16">
            OUR PICKS FOR YOU
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {mockProducts.slice(0, 4).map((product) => {
              const inWish = isInWishlist(product.id);
              return (
                <div key={product.id} className="group flex flex-col relative">
                  {/* Image Container */}
                  <div className="w-full aspect-square bg-[#0a0a0a] border border-white/5 overflow-hidden relative">
                    <img
                      src={getOptimizedImageUrl(product.image, { width: 480, quality: 72 })}
                      alt={product.name}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                      loading="lazy"
                    />

                    {/* Wishlist Heart Icon */}
                    <button
                      onClick={() => toggleWishlist(product)}
                      className="absolute top-4 right-4 z-20 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-all duration-300"
                      title={inWish ? "Remove from Wishlist" : "Add to Wishlist"}
                    >
                      <Heart size={16} fill={inWish ? "#ffffff" : "none"} stroke="currentColor" strokeWidth={1.5} />
                    </button>

                    {/* Quick Add CTA */}
                    <button
                      onClick={() => addToCart({ ...product, size: 'Free Size', color: 'Silver' })}
                      className="absolute bottom-0 left-0 right-0 py-3 bg-white text-black text-center text-[10px] tracking-[0.25em] uppercase font-bold translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20 hover:bg-silver-light"
                    >
                      QUICK ADD
                    </button>
                  </div>

                  {/* Info below */}
                  <Link to={`/product/${product.id}`} className="mt-5 flex flex-col">
                    <h3 className="font-serif text-sm tracking-wide text-white uppercase group-hover:underline">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-silver-dark tracking-[0.1em] uppercase mt-1">
                      {product.category}
                    </p>
                    <p className="text-sm font-semibold tracking-wider text-silver-light mt-2">
                      ${product.price.toFixed(2)}
                    </p>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-24 px-6 lg:px-12 relative z-10 text-center">
        <div className="max-w-4xl mx-auto border border-white/10 p-10 md:p-16 rounded-[2rem] bg-[#070707]">
          <h2 className="font-serif text-3xl md:text-4xl text-white tracking-widest uppercase mb-10">Our Story</h2>
          <div className="space-y-8 text-silver text-sm md:text-base tracking-wider leading-loose font-light">
            <p>
              In the vast expanse of the cosmos, where stars shine with eternal brilliance, we found our inspiration. Selestial – with an 'S' instead of 'C' – represents our unique perspective on celestial beauty, reimagined through the timeless elegance of silver.
            </p>
            <p>
              Each piece in our collection is crafted with the precision of stardust and the passion of cosmic artistry. We believe that silver, like the moon's gentle glow, possesses an ethereal quality that transcends time and trend.
            </p>
            <p>
              Our journey began with a simple vision: to create jewellery that doesn't just adorn, but transforms. Every necklace, ring, bracelet, and pair of earrings tells a story – your story – written in the language of silver and light.
            </p>
            <div className="pt-6 space-y-3">
              <p className="tracking-[0.3em] uppercase text-xs text-white/80">Welcome to the Universe of Silver.</p>
              <p className="font-serif text-xl text-white">Welcome to Selestial.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Heritage/Story Section */}
      <section className="py-24 px-6 lg:px-12 bg-[#000000] border-b border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-12 lg:gap-20">
          <div className="aspect-[4/3] bg-[#0a0a0a] border border-white/5 overflow-hidden">
            <img
              src="/brand_story.png"
              alt="Selestial Craftsman at work"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[10px] tracking-[0.4em] text-silver-dark uppercase mb-3 font-medium">CRAFTSMANSHIP</span>
            <h2 className="font-serif text-2xl md:text-4xl text-white tracking-widest uppercase mb-8 leading-tight">
              COSMIC CRAFTSMANSHIP
            </h2>
            <div className="space-y-6 text-silver-dark text-xs tracking-wider leading-relaxed font-light max-w-xl">
              <p>
                Inspired by the celestial vault, where stars burn with eternal brilliance, Selestial translates the wonders of the universe into physical jewelry. 
              </p>
              <p>
                Each creation is hand-finished in premium 925 sterling silver, balancing geometric precision with fluid forms. We select and sculpt our silver to mirror the gentle brilliance of the moon's light, delivering understated statements that remain durable for lifetimes.
              </p>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-white border-b border-white/20 pb-1 hover:border-white w-fit mt-8 transition-colors group/story"
            >
              EXPLORE THE HERITAGE
              <ArrowRight size={12} className="group-hover/story:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>
        </div>
      </section>

      {/* Selestial Club / Membership Signup */}
      <section className="py-24 px-6 lg:px-12 bg-[#000000]">
        <div className="max-w-3xl mx-auto border border-white/10 p-8 md:p-16 text-center bg-[#070707]">
          <span className="text-[10px] tracking-[0.4em] text-silver uppercase mb-4 block font-medium">MEMBERSHIP</span>
          <h2 className="font-serif text-xl md:text-3xl text-white tracking-widest uppercase mb-4">
            JOIN THE SELESTIAL CLUB
          </h2>
          <p className="text-silver-dark text-xs tracking-wider leading-relaxed mb-10 max-w-md mx-auto">
            Become a member to receive 10% off your first online order, early access to new seasonal collections, and private invitations.
          </p>

          {subscribed ? (
            <div className="text-xs tracking-widest uppercase font-bold text-silver-light border border-white/20 p-4 max-w-md mx-auto">
              {subscribeMsg || 'Welcome to the Universe of Silver. Check your inbox.'}
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                required
                type="email"
                placeholder="ENTER YOUR EMAIL..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent border-b border-white/20 py-2.5 text-xs text-white text-center sm:text-left focus:border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 tracking-widest uppercase"
              />
              <button
                type="submit"
                disabled={subscribing}
                className="px-8 py-3 text-xs font-bold tracking-widest bg-white text-black hover:bg-silver-light uppercase transition-colors duration-300 rounded-sm disabled:opacity-70"
              >
                {subscribing ? 'JOINING...' : 'JOIN NOW'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
    </div>
  );
}
