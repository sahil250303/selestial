import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative z-10 pt-32 pb-24">
      <Helmet>
        <title>Page Not Found | Selestial</title>
      </Helmet>
      <span className="font-serif text-[80px] md:text-[120px] font-bold text-white/10 leading-none select-none">404</span>
      <h1 className="font-serif text-2xl md:text-3xl text-white tracking-widest uppercase mt-4 mb-4">
        Lost in the Cosmos
      </h1>
      <p className="text-silver-dark text-sm tracking-wider max-w-sm mx-auto mb-10">
        The page you are looking for has drifted beyond our universe. Let us guide you back.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          to="/"
          className="px-8 py-3 text-xs font-bold tracking-widest bg-white text-black hover:bg-silver-light uppercase transition-colors rounded-sm"
        >
          Return Home
        </Link>
        <Link
          to="/products"
          className="px-8 py-3 text-xs font-bold tracking-widest border border-white text-white hover:bg-white hover:text-black uppercase transition-colors rounded-sm"
        >
          Shop Collection
        </Link>
      </div>
    </div>
  );
}
