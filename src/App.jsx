import React, { createContext, useContext, useState } from 'react';
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
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";


// Simple Cart Context
const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  
  const addToCart = (product) => {
    setCart((prev) => {
      // Create a unique cart item ID based on product id, selected size, and color
      const cartItemId = `${product.id}-${product.size || 'Free Size'}-${product.color || 'Silver'}`;
      
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, cartItemId, quantity: 1, size: product.size || 'Free Size', color: product.color || 'Silver' }];
    });
  };

  const removeFromCart = (cartItemId) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

function App() {
  return (
    <CartProvider>
      <WishlistProvider>
        <Router>
        <div className="relative min-h-screen">
          <CanvasBackground />
          <div className="relative z-10 font-sans text-silver-light pb-20">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={
                <RequireAuth>
                  <AdminDashboard />
                </RequireAuth>
              } />
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
  );
}

export default App;
