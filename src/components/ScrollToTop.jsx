import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Resets scroll position on client-side navigation.
 *
 * A full page load always starts at the top, but a client-side route change does
 * not — the browser has no reason to move the scroll position, so it stays
 * exactly where it was. Scrolling down the homepage and clicking a product
 * therefore opened the product page already scrolled near its footer.
 *
 * React Router only handles this automatically through <ScrollRestoration />,
 * which requires a data router; this app uses <BrowserRouter> + <Routes>, so it
 * has to be done here.
 *
 * Two deliberate exceptions:
 *  - Back/forward ("POP") is left alone so the browser can restore the position
 *    the user was at, which is what they expect from those buttons.
 *  - A URL with a hash scrolls to that element instead of the top, so in-page
 *    anchor links keep working.
 *
 * Only `pathname` is a dependency: changing a query string (say a category
 * filter on /products) should not yank the user back to the top.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === 'POP') return;

    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }

    // 'instant' rather than the default: an animated jump from the bottom of a
    // long page is disorienting, and smooth scrolling during load is what broke
    // Largest Contentful Paint on mobile once already (see Home.jsx).
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash, navigationType]);

  return null;
}
