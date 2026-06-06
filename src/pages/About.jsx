import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="pt-32 pb-24 px-6 lg:px-12 max-w-5xl mx-auto relative z-10">
      <Helmet>
        <title>Our Story | Selestial</title>
        <meta name="description" content="Learn the story behind Selestial — a silver jewellery brand born from a love of the cosmos and a belief in the transformative power of fine craftsmanship." />
        <link rel="canonical" href="https://selestial.vercel.app/about" />
      </Helmet>

      <h1 className="font-serif text-4xl md:text-5xl text-white tracking-widest uppercase mb-16 text-center">
        Our Story
      </h1>

      <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
        <div className="aspect-[4/3] bg-[#0a0a0a] border border-white/5 overflow-hidden rounded-sm">
          <img src="/brand_story.png" alt="Selestial craftsmanship" className="w-full h-full object-cover" loading="lazy" />
        </div>
        <div>
          <span className="text-[10px] tracking-[0.4em] text-silver-dark uppercase mb-3 block font-medium">Origin</span>
          <h2 className="font-serif text-2xl text-white tracking-widest uppercase mb-6">Born from Starlight</h2>
          <div className="space-y-5 text-silver-dark text-sm tracking-wider leading-relaxed font-light">
            <p>
              In the vast expanse of the cosmos, where stars shine with eternal brilliance, we found our inspiration.
              Selestial — with an 'S' instead of 'C' — represents our unique perspective on celestial beauty,
              reimagined through the timeless elegance of silver.
            </p>
            <p>
              Each piece in our collection is crafted with the precision of stardust and the passion of cosmic
              artistry. We believe that silver, like the moon's gentle glow, possesses an ethereal quality that
              transcends time and trend.
            </p>
          </div>
        </div>
      </div>

      <div className="border border-white/10 p-10 md:p-16 rounded-[2rem] bg-[#070707] mb-20">
        <h2 className="font-serif text-2xl text-white tracking-widest uppercase mb-10 text-center">Our Values</h2>
        <div className="grid md:grid-cols-3 gap-10 text-center">
          {[
            { title: 'Craftsmanship', body: 'Every piece is hand-finished in premium 925 sterling silver, balancing geometric precision with fluid forms.' },
            { title: 'Authenticity', body: 'We use only genuine 925 sterling silver — never plated, never compromised. Our hallmark is your guarantee.' },
            { title: 'Longevity', body: 'Designed to outlast trends. Our pieces are made to be worn every day, passed down, and treasured for lifetimes.' },
          ].map((v) => (
            <div key={v.title}>
              <h3 className="font-serif text-white tracking-widest uppercase mb-4 text-sm">{v.title}</h3>
              <p className="text-silver-dark text-xs tracking-wider leading-relaxed font-light">{v.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <p className="text-silver-dark text-sm tracking-wider mb-8 max-w-xl mx-auto">
          Our journey began with a simple vision: to create jewellery that doesn't just adorn, but transforms.
          Every necklace, ring, bracelet, and pair of earrings tells a story — your story — written in the language of silver and light.
        </p>
        <p className="font-serif text-xl text-white mb-10">Welcome to Selestial.</p>
        <Link to="/products" className="px-10 py-4 text-xs font-bold tracking-widest bg-white text-black hover:bg-silver-light uppercase transition-colors rounded-sm">
          Explore the Collection
        </Link>
      </div>
    </div>
  );
}
