import React from 'react';
import { Helmet } from 'react-helmet-async';

const ringSizes = [
  { us: '5', uk: 'J½', eu: '49', diameter: '15.7mm', circumference: '49.3mm' },
  { us: '5.5', uk: 'K½', eu: '51', diameter: '16.1mm', circumference: '50.6mm' },
  { us: '6', uk: 'L½', eu: '52', diameter: '16.5mm', circumference: '51.9mm' },
  { us: '6.5', uk: 'M½', eu: '53', diameter: '16.9mm', circumference: '53.1mm' },
  { us: '7', uk: 'N½', eu: '54', diameter: '17.3mm', circumference: '54.4mm' },
  { us: '7.5', uk: 'O½', eu: '56', diameter: '17.7mm', circumference: '55.7mm' },
  { us: '8', uk: 'P½', eu: '57', diameter: '18.2mm', circumference: '57.2mm' },
  { us: '8.5', uk: 'Q½', eu: '58', diameter: '18.6mm', circumference: '58.5mm' },
  { us: '9', uk: 'R½', eu: '59', diameter: '19.0mm', circumference: '59.7mm' },
  { us: '9.5', uk: 'S½', eu: '61', diameter: '19.4mm', circumference: '61.0mm' },
  { us: '10', uk: 'T½', eu: '62', diameter: '19.8mm', circumference: '62.2mm' },
];

export default function SizeGuide() {
  return (
    <div className="pt-32 pb-24 px-6 lg:px-12 max-w-4xl mx-auto relative z-10">
      <Helmet>
        <title>Size Guide | Selestial</title>
        <meta name="description" content="Selestial jewellery size guide — ring sizing chart (US, UK, EU), bracelet length guide, and necklace length reference." />
        <link rel="canonical" href="https://selestial.vercel.app/size-guide" />
      </Helmet>
      <h1 className="font-serif text-3xl md:text-4xl text-white tracking-widest uppercase mb-4 text-center">Size Guide</h1>
      <p className="text-silver-dark text-sm tracking-wider text-center max-w-xl mx-auto mb-16">
        Finding the right fit is everything. Use the guides below to identify your ideal size before ordering.
      </p>

      {/* How to measure */}
      <div className="border border-white/10 p-8 rounded-xl bg-[#070707] mb-12">
        <h2 className="font-serif text-lg text-white tracking-widest uppercase mb-6">How to Measure Your Ring Size</h2>
        <ol className="space-y-4 text-silver-dark text-sm tracking-wider leading-relaxed font-light list-none">
          <li><span className="text-white font-bold mr-2">1.</span>Use a strip of paper or a flexible tape measure to wrap around the base of the finger you intend to wear the ring on.</li>
          <li><span className="text-white font-bold mr-2">2.</span>Mark where the strip meets itself and measure the length in millimetres — this is your circumference.</li>
          <li><span className="text-white font-bold mr-2">3.</span>Alternatively, measure the internal diameter of a ring that fits well.</li>
          <li><span className="text-white font-bold mr-2">4.</span>Match your measurement to the chart below. We recommend measuring in the evening when fingers are slightly larger due to natural swelling.</li>
          <li><span className="text-white font-bold mr-2">5.</span>If you are between sizes, select the larger size.</li>
        </ol>
      </div>

      {/* Ring size chart */}
      <div className="mb-12">
        <h2 className="font-serif text-lg text-white tracking-widest uppercase mb-6 text-center">Ring Size Chart</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-silver-dark border-collapse">
            <thead>
              <tr className="bg-white/5">
                {['US Size', 'UK Size', 'EU Size', 'Diameter', 'Circumference'].map((h) => (
                  <th key={h} className="text-white font-serif text-[10px] tracking-widest uppercase px-4 py-3 text-center border border-white/10">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ringSizes.map((row, i) => (
                <tr key={row.us} className={i % 2 === 0 ? '' : 'bg-white/5'}>
                  <td className="px-4 py-3 text-center border border-white/10 text-white font-bold">{row.us}</td>
                  <td className="px-4 py-3 text-center border border-white/10">{row.uk}</td>
                  <td className="px-4 py-3 text-center border border-white/10">{row.eu}</td>
                  <td className="px-4 py-3 text-center border border-white/10">{row.diameter}</td>
                  <td className="px-4 py-3 text-center border border-white/10">{row.circumference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bracelet guide */}
      <div className="border border-white/10 p-8 rounded-xl bg-[#070707] mb-12">
        <h2 className="font-serif text-lg text-white tracking-widest uppercase mb-6">Bracelet Length Guide</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-silver-dark border-collapse">
            <thead>
              <tr className="bg-white/5">
                {['Wrist Size', 'Recommended Bracelet Length', 'Fit'].map((h) => (
                  <th key={h} className="text-white font-serif text-[10px] tracking-widest uppercase px-4 py-3 text-center border border-white/10">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['5.5" – 6"', '6.5" / 16.5cm', 'Snug / slim fit'],
                ['6" – 6.5"', '7" / 18cm', 'Standard fit'],
                ['6.5" – 7"', '7.5" / 19cm', 'Comfortable fit'],
                ['7" – 7.5"', '8" / 20cm', 'Relaxed fit'],
              ].map(([wrist, length, fit], i) => (
                <tr key={wrist} className={i % 2 === 0 ? '' : 'bg-white/5'}>
                  <td className="px-4 py-3 text-center border border-white/10">{wrist}</td>
                  <td className="px-4 py-3 text-center border border-white/10 text-white font-bold">{length}</td>
                  <td className="px-4 py-3 text-center border border-white/10">{fit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-silver-dark text-xs tracking-wider mt-4">Measure your wrist with a flexible tape measure. Add 1–1.5cm for a comfortable fit; add 2–2.5cm for a loose, stacked-bracelet fit.</p>
      </div>

      {/* Necklace guide */}
      <div className="border border-white/10 p-8 rounded-xl bg-[#070707]">
        <h2 className="font-serif text-lg text-white tracking-widest uppercase mb-6">Necklace Length Guide</h2>
        <div className="space-y-4 text-silver-dark text-sm tracking-wider font-light">
          {[
            ['14" / 35cm', 'Choker — sits snugly at the base of the neck'],
            ['16" / 40cm', 'Collar — classic, elegant, sits at the collarbone'],
            ['18" / 45cm', 'Princess — the most popular length; sits just below the collarbone'],
            ['20" / 50cm', 'Matinee — falls at the top of the chest; versatile for layering'],
            ['24" / 60cm', 'Opera — hangs at the bust; suits V-necks and open collars'],
          ].map(([length, desc]) => (
            <div key={length} className="flex gap-4">
              <span className="text-white font-bold w-28 shrink-0">{length}</span>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
