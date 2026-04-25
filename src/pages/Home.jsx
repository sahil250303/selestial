import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const heroRef = useRef();
  const titleRef = useRef();
  const subRef = useRef();
  const btnRef = useRef();

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(titleRef.current, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.5, ease: 'power3.out' })
      .fromTo(subRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }, "-=1")
      .fromTo(btnRef.current, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.7)' }, "-=0.5");

    gsap.utils.toArray('.reveal-section').forEach(section => {
      gsap.fromTo(section,
        { y: 100, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 1.2, ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
          }
        }
      );
    });
  }, []);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section ref={heroRef} className="h-screen flex flex-col items-center justify-center text-center px-4 relative z-10">
        <h1 ref={titleRef} className="font-serif text-5xl md:text-7xl lg:text-8xl tracking-widest text-white uppercase mb-4 opacity-0">
          Selestial
        </h1>
        <p ref={subRef} className="font-sans text-sm md:text-lg tracking-[0.3em] text-silver mb-10 uppercase opacity-0">
          Universe of Silver
        </p>
        <div ref={btnRef} className="opacity-0">
          <Link to="/products" className="group relative inline-flex items-center justify-center px-8 py-4 font-medium tracking-widest text-white uppercase bg-white/10 border border-white/20 backdrop-blur-sm hover:bg-white hover:text-dark transition-all duration-500">
            Explore Collection
          </Link>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-24 px-6 lg:px-12 relative z-10 reveal-section text-center">
        <div className="max-w-4xl mx-auto glass-panel p-10 md:p-16">
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
            <div className="pt-4 space-y-2">
              <p className="tracking-[0.3em] uppercase text-xs text-white/80">Welcome to the Universe of Silver.</p>
              <p className="font-serif text-xl text-white">Welcome to Selestial.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories from Reference (Glassmorphism Styled) */}
      <section className="py-24 relative z-10 reveal-section overflow-hidden px-4 lg:px-12">
        <div className="max-w-[100rem] mx-auto glass-panel rounded-[2rem] p-8 lg:p-16 border border-white/10 shadow-2xl">
          <div className="flex justify-between items-end mb-12">
            <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl text-white tracking-tight uppercase max-w-2xl leading-none">
              Browse a wide range of <span className="font-bold">Selestial</span> pieces
            </h2>

          </div>

          <div className="flex overflow-x-auto md:grid md:grid-cols-5 gap-6 pb-8 md:pb-0 hide-scrollbar snap-x">
            {[
              { name: 'CHAINS', img: '/categories/Chain.png', query: 'necklaces' },
              { name: 'BRACELETS', img: '/categories/Bracelets.png', query: 'bracelets' },
              { name: 'RINGS', img: '/categories/Rings.png', query: 'rings' },
              { name: 'EARRINGS', img: '/categories/Earrings.png', query: 'earrings' },
              { name: 'SETS', img: '/categories/Sets.png', query: 'sets' }
            ].map((cat) => (
              <Link to={`/products?cat=${cat.query}`} key={cat.name} className="group flex flex-col min-w-[70vw] sm:min-w-[40vw] md:min-w-0 snap-start cursor-pointer">
                <div className="aspect-square bg-dark/50 overflow-hidden mb-6 border border-white/5 rounded-xl shadow-lg relative">
                  <div className="absolute inset-0 bg-white/5 mix-blend-overlay group-hover:bg-transparent transition-colors z-10 pointer-events-none"></div>
                  <img
                    src={cat.img}
                    alt={cat.name}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <h3 className="font-sans font-bold text-white text-sm tracking-widest uppercase ml-2">{cat.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>


    </div>
  );
}
