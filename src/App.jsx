import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Products from './pages/Products';
import Checkout from './pages/Checkout';
import CartPage from './pages/CartPage';
import ProductDetails from './pages/ProductDetails';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import CanvasBackground from './components/CanvasBackground';
import Footer from './components/Footer';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import RequireAuth from './pages/admin/RequireAuth';
import FloatingCart from './components/FloatingCart';
import ServiceSection from './components/ServiceSection';
import { WishlistProvider } from './context/WishlistContext';
import WishlistPage from './pages/WishlistPage';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import NotFound from './pages/NotFound';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ShippingReturns from './pages/ShippingReturns';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import CareGuide from './pages/CareGuide';
import SizeGuide from './pages/SizeGuide';
import About from './pages/About';
import { ToastProvider } from './components/Toast';

// ── Cart Context ──────────────────────────────────────────────────────────────
const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  // Persist cart to localStorage — survives page refresh
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('selestialCart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('selestialCart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    setCart((prev) => {
      const cartItemId = `${product.id}-${product.size || 'Free Size'}-${product.color || 'Silver'}`;
      const existing = prev.find((item) => item.cartItemId === cartItemId);

      // Out-of-stock guard — check if adding another unit would exceed available stock
      const stockLimit = product.quantity ?? existing?.stockLimit ?? Infinity;
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty >= stockLimit) {
        // Silently ignore — UI should also show OOS state
        return prev;
      }

      if (existing) {
        return prev.map((item) =>
          item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        { ...product, stockLimit: product.quantity, cartItemId, quantity: 1, size: product.size || 'Free Size', color: product.color || 'Silver' },
      ];
    });
  };

  const removeFromCart = (cartItemId) =>
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));

  const updateQuantity = (cartItemId, quantity) => {
    if (quantity < 1) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId) {
          const limit = item.stockLimit ?? Infinity;
          const newQty = Math.min(quantity, limit);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('selestialCart');
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <ToastProvider>
    <CartProvider>
      <WishlistProvider>
        <Router>
          <div className="relative min-h-screen">
            <CanvasBackground />
            <div id="main-content" className="relative z-10 font-sans text-silver-light pb-20">
              <Navbar />
              <Routes>
                {/* Core */}
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/wishlist" element={<WishlistPage />} />

                {/* Brand */}
                <Route path="/about" element={<About />} />

                {/* Support & legal */}
                <Route path="/faq" element={<FAQ />} />
                <Route path="/care-guide" element={<CareGuide />} />
                <Route path="/size-guide" element={<SizeGuide />} />
                <Route path="/shipping-returns" element={<ShippingReturns />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/contact" element={<Contact />} />

                {/* Admin */}
                <Route path="/admin" element={<AdminLogin />} />
                <Route
                  path="/admin/dashboard"
                  element={
                    <RequireAuth>
                      <AdminDashboard />
                    </RequireAuth>
                  }
                />

                {/* 404 — must be last */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <ServiceSection />
              <Footer />
              <FloatingCart />
              <SpeedInsights />
              <Analytics />
            </div>
          </div>
        </Router>
      </WishlistProvider>
    </CartProvider>
    </ToastProvider>
  );
}

export default App;
