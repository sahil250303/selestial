import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, LogOut, Package, MapPin, Heart } from 'lucide-react';
import { getCustomerSession, clearCustomerSession } from '../utils/auth';
import { useWishlist } from '../context/WishlistContext';

// Orders persist their line items as a JSON *string*. Never let a malformed
// value throw during render (that would blank the whole page) — fall back to [].
function safeParseItems(items) {
  if (Array.isArray(items)) return items;
  if (typeof items !== 'string' || items.trim() === '') return [];
  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const Profile = () => {
  // Initialise from the validated session so there is no "null render" flash and
  // a corrupt session can never crash this route — it simply reads as logged-out.
  const [user, setUser] = useState(() => getCustomerSession()?.user ?? null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { wishlist } = useWishlist();

  useEffect(() => {
    const session = getCustomerSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    setUser(session.user);
    fetchOrders(session.token);
  }, [navigate]);

  const fetchOrders = async (token) => {
    try {
      const res = await fetch('/api/customer/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } else if (res.status === 401 || res.status === 403) {
        // Token expired/invalid — clear the stale session and send to login.
        clearCustomerSession();
        navigate('/auth');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearCustomerSession();
    navigate('/');
    window.location.reload(); // Refresh to update Navbar
  };

  // ── Derived profile data (no schema changes) ──────────────────────────────
  // The customers table doesn't store an address, but checkout does — so the
  // most recent order's address is the user's saved delivery address.
  const latestAddress = orders.find((o) => o.address && String(o.address).trim())?.address || '';
  const favoriteCount = wishlist.length;

  // Brief guard while the redirect effect runs for logged-out visitors.
  if (!user) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-6 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-silver border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row gap-12">

          {/* Sidebar */}
          <div className="w-full md:w-1/3">
            <div className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6">
                <User size={48} className="text-white/40" />
              </div>
              <h2 className="text-2xl font-light tracking-widest text-white mb-2">{user.name}</h2>
              <p className="text-gray-400 text-sm tracking-widest uppercase mb-8">Premium Member</p>

              <div className="w-full space-y-2">
                <button
                  onClick={() => navigate('/wishlist')}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 transition-colors rounded-lg text-sm tracking-widest uppercase text-white flex items-center justify-center gap-3"
                >
                  <Heart size={18} /> Favorites ({favoriteCount})
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 transition-colors rounded-lg text-sm tracking-widest uppercase text-red-400 flex items-center justify-center gap-3"
                >
                  <LogOut size={18} /> Logout
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-8">
            <div className="glass-panel p-8 rounded-2xl">
              <h3 className="text-xl font-light tracking-[0.2em] text-white mb-8 border-b border-white/10 pb-4">ACCOUNT DETAILS</h3>

              <div className="grid grid-cols-1 gap-8">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/5 rounded-lg">
                    <User size={20} className="text-silver" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 tracking-widest uppercase mb-1">Full Name</p>
                    <p className="text-lg font-light text-white">{user.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/5 rounded-lg">
                    <Mail size={20} className="text-silver" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 tracking-widest uppercase mb-1">Email Address</p>
                    <p className="text-lg font-light text-white">{user.email || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/5 rounded-lg">
                    <Phone size={20} className="text-silver" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 tracking-widest uppercase mb-1">Mobile Number</p>
                    <p className="text-lg font-light text-white">{user.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/5 rounded-lg">
                    <MapPin size={20} className="text-silver" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 tracking-widest uppercase mb-1">Saved Address</p>
                    <p className="text-lg font-light text-white">
                      {loading ? '—' : latestAddress || 'Not provided'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/5 rounded-lg">
                    <Calendar size={20} className="text-silver" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 tracking-widest uppercase mb-1">Member Since</p>
                    <p className="text-lg font-light text-white">{user.join_date || 'April 2026'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-8 rounded-2xl">
              <h3 className="text-xl font-light tracking-[0.2em] text-white mb-8 border-b border-white/10 pb-4">RECENT ORDERS</h3>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-silver border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-500 tracking-widest uppercase text-xs">Loading orders...</p>
                </div>
              ) : orders.length > 0 ? (
                <div className="space-y-6">
                  {orders.map((order) => (
                    <div key={order.id} className="p-6 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 tracking-widest uppercase mb-1">Order ID</p>
                          <p className="text-sm font-medium text-white">#ORD-{order.id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 tracking-widest uppercase mb-1">Date</p>
                          <p className="text-sm font-medium text-white">{order.date}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 tracking-widest uppercase mb-1">Status</p>
                          <span className={`px-3 py-1 rounded-full text-[10px] tracking-widest uppercase ${
                            order.status === 'Completed' ? 'bg-green-500/10 text-green-400' :
                            order.status === 'Processing' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-silver/10 text-silver'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 tracking-widest uppercase mb-1">Total</p>
                          <p className="text-sm font-bold text-white">${order.total_amount}</p>
                        </div>
                      </div>

                      <div className="border-t border-white/5 pt-4">
                         <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-2">Items</p>
                         <div className="flex flex-wrap gap-2">
                           {safeParseItems(order.items).map((item, idx) => (
                             <span key={idx} className="text-xs text-white/70 bg-white/5 px-2 py-1 rounded">
                               {item.name} (x{item.quantity})
                             </span>
                           ))}
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package size={48} className="text-white/10 mx-auto mb-4" />
                  <p className="text-gray-500 tracking-widest uppercase text-sm">No orders found yet</p>
                  <button
                    onClick={() => navigate('/products')}
                    className="mt-6 text-white hover:text-silver transition-colors text-xs tracking-[0.2em] uppercase underline underline-offset-8"
                  >
                    Start Shopping
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
