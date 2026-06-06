import React from 'react';

export default function ProductCardSkeleton() {
  return (
    <div className="flex flex-col glass-panel overflow-hidden animate-pulse">
      {/* Image area */}
      <div className="h-96 bg-white/10" />
      {/* Text area */}
      <div className="p-6 flex flex-col items-center gap-3">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/10 rounded w-1/4" />
        <div className="h-3 bg-white/10 rounded w-full mt-2" />
        <div className="h-3 bg-white/10 rounded w-5/6" />
      </div>
    </div>
  );
}
