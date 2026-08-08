import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import App from './App.jsx';
import { googleEnabled } from './config/google.js';

// Promote the deferred font stylesheet (index.html ships it as media="print" so
// it does not block rendering) to apply to all media.
//
// This deliberately waits for `load`. Flipping media as soon as this module runs
// turns the stylesheet back into a render-blocking resource before the first
// paint — Lighthouse attributed ~900ms of blocked rendering to exactly that, and
// deferring it moved the mobile score from 84 to 93. Text paints immediately in
// the fallback face and the webfont swaps in after (display=swap is already set).
const promoteFonts = () => {
  for (const link of document.querySelectorAll('link[data-defer-style]')) {
    link.media = 'all';
  }
};
if (document.readyState === 'complete') promoteFonts();
else window.addEventListener('load', promoteFonts, { once: true });

// Root cause of the "Continue with Google" failure: VITE_GOOGLE_CLIENT_ID was
// absent from every .env file, so the build baked in an EMPTY client ID. With an
// empty ID the Google Identity Services library cannot open the account chooser,
// so the popup silently fails. `googleEnabled` (from ./config/google.js) lets the
// UI hide the button instead of showing one that cannot work.
if (!googleEnabled && import.meta.env.DEV) {
  console.warn(
    '[Selestial] Google sign-in is disabled: set VITE_GOOGLE_CLIENT_ID in your ' +
    '.env to your "...apps.googleusercontent.com" client ID, then rebuild.'
  );
}

// GoogleOAuthProvider deliberately does NOT live here. Mounting it at the root
// injects Google Identity Services (~70KB of JS, plus a third-party connection)
// into every page load, including the storefront pages that never offer Google
// sign-in. It now wraps only the Auth route — the one place `useGoogleLogin` is
// used — which is itself lazy-loaded, so GSI is fetched on demand.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
