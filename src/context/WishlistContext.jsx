import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getCustomerSession, getCustomerToken } from '../utils/auth';

const WishlistContext = createContext();

export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem('selestialWishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track whether we've done the first DB sync so we don't repeat it
  const synced = useRef(false);

  // Keep localStorage in sync with in-memory state
  useEffect(() => {
    localStorage.setItem('selestialWishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // On mount: if the user is logged in, fetch their persisted wishlist from the
  // DB and merge it with whatever is already in localStorage (handles the case
  // where a guest adds items, then logs in).
  useEffect(() => {
    if (synced.current) return;
    const session = getCustomerSession();
    if (!session) return;
    synced.current = true;

    fetch('/api/customer/wishlist', {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((dbItems) => {
        if (!Array.isArray(dbItems)) return;
        setWishlist((prev) => {
          // DB items take precedence (freshest data); local-only items get appended
          const merged = [...dbItems];
          for (const item of prev) {
            if (!merged.find((d) => d.id === item.id)) {
              merged.push(item);
              // Back-fill the DB with locally-stored items the server doesn't know about
              fetch('/api/customer/wishlist', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify({ productId: item.id }),
              }).catch(() => {});
            }
          }
          return merged;
        });
      })
      .catch(() => {});
  }, []);

  /**
   * Toggle a product in/out of the wishlist.
   * Syncs to the DB when the user is authenticated.
   */
  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      const next = exists
        ? prev.filter((item) => item.id !== product.id)
        : [...prev, product];

      const token = getCustomerToken();
      if (token) {
        if (exists) {
          fetch(`/api/customer/wishlist/${product.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        } else {
          fetch('/api/customer/wishlist', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ productId: product.id }),
          }).catch(() => {});
        }
      }

      return next;
    });
  };

  const isInWishlist = (productId) => wishlist.some((item) => item.id === productId);

  const removeFromWishlist = (productId) => {
    setWishlist((prev) => prev.filter((item) => item.id !== productId));
    const token = getCustomerToken();
    if (token) {
      fetch(`/api/customer/wishlist/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isInWishlist, removeFromWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};
