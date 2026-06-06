import React from 'react';
import { Helmet } from 'react-helmet-async';

function Tip({ number, title, children }) {
  return (
    <div className="flex gap-5 mb-8">
      <div className="font-serif text-3xl text-white/10 leading-none w-10 shrink-0">{number}</div>
      <div>
        <h3 className="font-serif text-white tracking-widest uppercase text-sm mb-2">{title}</h3>
        <div className="text-silver-dark text-sm tracking-wider leading-relaxed font-light">{children}</div>
      </div>
    </div>
  );
}

export default function CareGuide() {
  return (
    <div className="pt-32 pb-24 px-6 lg:px-12 max-w-3xl mx-auto relative z-10">
      <Helmet>
        <title>Silver Care Guide | Selestial</title>
        <meta name="description" content="How to clean and care for your Selestial 925 sterling silver jewellery — storage tips, cleaning guide, and what to avoid." />
        <link rel="canonical" href="https://selestial.vercel.app/care-guide" />
      </Helmet>
      <h1 className="font-serif text-3xl md:text-4xl text-white tracking-widest uppercase mb-4 text-center">Care Guide</h1>
      <p className="text-silver-dark text-sm tracking-wider text-center max-w-xl mx-auto mb-16">
        Sterling silver is a living metal that develops a beautiful patina over time. With a little care, your Selestial pieces will look stunning for a lifetime.
      </p>

      <div className="border border-white/10 p-8 rounded-xl bg-[#070707] mb-12">
        <h2 className="font-serif text-lg text-white tracking-widest uppercase mb-8 text-center">Daily Care</h2>
        <Tip number="01" title="Clean Regularly">
          Gently buff your silver with the provided Selestial polishing cloth after each wear to remove skin oils and surface tarnish. A soft microfibre cloth works well too. Avoid paper towels or rough fabrics that can scratch the surface.
        </Tip>
        <Tip number="02" title="Apply Fragrance First">
          Always put on your jewellery after applying perfume, body lotion, hairspray, and sunscreen. Chemicals in these products accelerate tarnishing. The rule of thumb: jewellery goes on last, comes off first.
        </Tip>
        <Tip number="03" title="Remove Before Activities">
          Take off your pieces before swimming (chlorine and salt water are highly damaging), showering, exercising (sweat accelerates tarnishing), sleeping (stress on chains and clasps), and doing household chores (cleaning products contain harsh chemicals).
        </Tip>
      </div>

      <div className="border border-white/10 p-8 rounded-xl bg-[#070707] mb-12">
        <h2 className="font-serif text-lg text-white tracking-widest uppercase mb-8 text-center">Storage</h2>
        <Tip number="04" title="Use the Provided Pouch">
          Store each piece in the individual Selestial silver pouch that came with your order. The anti-tarnish lining slows oxidation. Keep pouches in a cool, dry, dark place — a drawer or jewellery box is ideal.
        </Tip>
        <Tip number="05" title="Store Separately">
          Store pieces individually to prevent scratching. Chains should be laid flat or hung to avoid tangling and kinking.
        </Tip>
        <Tip number="06" title="Silica Gel Packets">
          Place a small silica gel packet in your jewellery box to absorb excess moisture. This is especially helpful in humid climates.
        </Tip>
      </div>

      <div className="border border-white/10 p-8 rounded-xl bg-[#070707]">
        <h2 className="font-serif text-lg text-white tracking-widest uppercase mb-8 text-center">Cleaning Tarnished Silver</h2>
        <Tip number="07" title="Polishing Cloth Method (Recommended)">
          Use the polishing cloth provided with your Selestial piece, or any silver polishing cloth. Rub gently in straight strokes (not circles) to remove tarnish and restore shine. This is safe for all pieces.
        </Tip>
        <Tip number="08" title="Warm Soapy Water (Mild Tarnish)">
          For light tarnish: gently wash with a small drop of mild dish soap in warm water using a soft toothbrush. Rinse thoroughly with clean water. Dry immediately and completely with a soft cloth — never leave silver wet.
        </Tip>
        <Tip number="09" title="What to Avoid">
          Never use toothpaste, baking soda paste, or ultrasonic cleaners on Selestial pieces. These are abrasive or too aggressive and can permanently damage the surface finish. Avoid bleach, ammonia, and any commercial silver dips not formulated for jewellery.
        </Tip>
      </div>
    </div>
  );
}
