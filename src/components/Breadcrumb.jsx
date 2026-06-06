import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * items: [{ label: string, href?: string }]
 * Last item is current page (no link)
 */
export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-silver-dark mb-2">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight size={10} className="text-silver-dark/50" />}
            {item.href && !isLast ? (
              <Link to={item.href} className="hover:text-white transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-white/60' : ''}>{item.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
