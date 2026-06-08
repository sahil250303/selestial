import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App.jsx';
import { googleClientId, googleEnabled } from './config/google.js';

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

// GoogleOAuthProvider must always wrap the tree so the useGoogleLogin hook stays
// valid (hooks cannot be conditional). When unconfigured we pass the empty ID
// but the button itself is hidden via `googleEnabled`.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
      </GoogleOAuthProvider>
    </HelmetProvider>
  </StrictMode>
);
