// Drop-in replacement for react-helmet-async (aliased in vite.config.js).
//
// Why: react-helmet-async@^3 under React 19 was appending a SECOND <title> and
// leaving document.title EMPTY, plus duplicating canonical/description/og tags.
// React 19 hoists and de-duplicates <title>/<meta>/<link> natively, so we simply
// render the children as native elements. This component also normalizes any
// stale deployment domain to the canonical SITE_URL in one place.
import { Children, cloneElement, isValidElement } from 'react';

export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://selestial-lovat.vercel.app').replace(/\/+$/, '');

// Old preview/duplicate domains that must never appear in canonical/OG/JSON-LD.
const STALE = /https?:\/\/selestial(?:-lovat)?\.vercel\.app/g;
const fix = (v) => (typeof v === 'string' ? v.replace(STALE, SITE_URL) : v);

export const HelmetProvider = ({ children }) => children;

export function Helmet({ children }) {
  const normalized = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const props = { ...child.props };
    if (props.href) props.href = fix(props.href);
    if (props.content) props.content = fix(props.content);
    // JSON-LD lives in a <script> string child — rewrite the domain inside it too.
    if (child.type === 'script' && typeof props.children === 'string') props.children = fix(props.children);
    return cloneElement(child, props);
  });
  return <>{normalized}</>;
}

export default Helmet;
