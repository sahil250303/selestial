import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [loading, setLoading] = useState(true);

  // New/Edit Product Form State
  const [newProduct, setNewProduct] = useState({
    id: null, name: '', price: '', quantity: '', category: 'rings', gender: 'both', image: '', description: '', tagline: '', details: '', style_type: '', colors: '', additional_images: []
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAdditional, setUploadingAdditional] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = React.useRef(null);
  const additionalFilesRef = React.useRef(null);

  const navigate = useNavigate();
  const token = localStorage.getItem('selestial_admin_token');

  const fetchData = async (endpoint, setter) => {
    try {
      const res = await fetch(`/api/${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('selestial_admin_token');
        navigate('/admin');
        return;
      }
      const data = await res.json();
      setter(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const initFetch = async () => {
      setLoading(true);
      await Promise.all([
        fetchData('products', setProducts), // even though public, we fetch using helper
        fetchData('orders', setOrders),
        fetchData('payments', setPayments),
        fetchData('customers', setCustomers)
      ]);
      setLoading(false);
    };
    initFetch();
  }, [token, navigate]);

  useEffect(() => {
    gsap.fromTo('.dashboard-content',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
    );
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('selestial_admin_token');
    navigate('/admin');
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('images', file); // changed from 'image' to 'images' for consistency with server
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setNewProduct(prev => ({ ...prev, image: data.urls[0] }));
      } else {
        alert(data.error || 'Failed to upload image');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAdditionalUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploadingAdditional(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setNewProduct(prev => ({ 
          ...prev, 
          additional_images: [...(prev.additional_images || []), ...data.urls] 
        }));
      } else {
        alert(data.error || 'Failed to upload additional images');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading additional images');
    } finally {
      setUploadingAdditional(false);
    }
  };

  const removeAdditionalImage = (index) => {
    setNewProduct(prev => ({
      ...prev,
      additional_images: prev.additional_images.filter((_, i) => i !== index)
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const resetForm = () => {
    setNewProduct({ id: null, name: '', price: '', quantity: '', category: 'rings', gender: 'both', image: '', description: '', tagline: '', details: '', style_type: '', colors: '', additional_images: [] });
  };

  const handleEditProduct = (product) => {
    let images = [];
    try {
      images = product.additional_images ? JSON.parse(product.additional_images) : [];
    } catch (e) {
      images = [];
    }
    setNewProduct({ ...product, additional_images: images });
    setActiveTab('add-product');
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData('products', setProducts);
    } catch (err) { console.error(err); }
  };

  const handleClearAllProducts = async () => {
    if (!window.confirm('WARNING: THIS WILL DELETE ALL PRODUCTS. Proceed?')) return;
    try {
      const res = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData('products', setProducts);
    } catch (err) { console.error(err); }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('Delete this order?')) return;
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData('orders', setOrders);
    } catch (err) { console.error(err); }
  };

  const handleClearAllOrders = async () => {
    if (!window.confirm('WARNING: THIS WILL DELETE ALL ORDERS. Proceed?')) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData('orders', setOrders);
    } catch (err) { console.error(err); }
  };

  const handleDeletePayment = async (id) => {
    if (!window.confirm('Delete this payment record?')) return;
    try {
      const res = await fetch(`/api/payments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData('payments', setPayments);
    } catch (err) { console.error(err); }
  };

  const handleClearAllPayments = async () => {
    if (!window.confirm('WARNING: THIS WILL DELETE ALL PAYMENT RECORDS. Proceed?')) return;
    try {
      const res = await fetch('/api/payments', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData('payments', setPayments);
    } catch (err) { console.error(err); }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Delete this customer record?')) return;
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData('customers', setCustomers);
    } catch (err) { console.error(err); }
  };

  const handleClearAllCustomers = async () => {
    if (!window.confirm('WARNING: THIS WILL DELETE ALL CUSTOMER RECORDS. Proceed?')) return;
    try {
      const res = await fetch('/api/customers', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData('customers', setCustomers);
    } catch (err) { console.error(err); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const method = newProduct.id ? 'PUT' : 'POST';
      const endpoint = newProduct.id ? `/api/products/${newProduct.id}` : '/api/products';
      const payload = {
        ...newProduct,
        additional_images: JSON.stringify(newProduct.additional_images)
      };
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchData('products', setProducts);
        resetForm();
        setActiveTab('products');
      } else {
        alert('Failed to save product');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving product');
    }
  };

  const tabs = [
    { id: 'products', label: 'Inventory' },
    { id: 'add-product', label: 'Offerings' },
    { id: 'orders', label: 'Orders' },
    { id: 'payments', label: 'Payments' },
    { id: 'customers', label: 'Customers' }
  ];

  if (loading) return <div className="min-h-screen pt-32 px-6 text-center text-white font-serif text-2xl tracking-widest">Loading...</div>;

  return (
    <div className="pt-32 px-6 lg:px-12 max-w-7xl mx-auto min-h-screen relative z-10 pb-20">
      <div className="flex justify-between items-center mb-12 border-b border-white/20 pb-6">
        <div>
          <h1 className="font-serif text-4xl text-white tracking-widest uppercase mb-2">Command Center</h1>
          <p className="font-sans text-silver tracking-widest uppercase text-xs">Tracking & Management Dashboard</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-silver tracking-widest uppercase hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-48 flex lg:flex-col gap-4 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-left uppercase tracking-widest text-xs py-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-white border-l-2 lg:pl-4 border-white' : 'text-silver lg:border-l-2 lg:border-transparent lg:pl-4 hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 dashboard-content min-w-0">
          {activeTab === 'products' && (
            <div className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-2xl text-white tracking-widest">Inventory</h2>
                <button onClick={handleClearAllProducts} className="text-xs text-red-400 tracking-widest uppercase border border-red-500/30 px-4 py-2 hover:bg-red-500/10 transition-colors">Clear Data</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-silver">
                  <thead className="uppercase tracking-widest text-xs border-b border-white/10 text-white">
                    <tr>
                      <th className="py-4 pr-4">ID</th>
                      <th className="py-4 px-4">Image</th>
                      <th className="py-4 px-4">Name</th>
                      <th className="py-4 px-4">Category</th>
                      <th className="py-4 px-4">Price</th>
                      <th className="py-4 px-4">Quantity</th>
                      <th className="py-4 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 group">
                        <td className="py-4 pr-4 align-middle">#{p.id}</td>
                        <td className="py-4 px-4 align-middle">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-12 h-12 object-cover object-center rounded border border-white/10 opacity-70 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded flex items-center justify-center text-[8px] text-silver uppercase tracking-widest text-center leading-tight">No<br />Img</div>
                          )}
                        </td>
                        <td className="py-4 px-4 align-middle">{p.name}</td>
                        <td className="py-4 px-4 uppercase text-xs align-middle">{p.category}</td>
                        <td className="py-4 px-4 align-middle">${p.price}</td>
                        <td className="py-4 px-4 align-middle">{p.quantity ?? 0}</td>
                        <td className="py-4 pl-4 align-middle text-right w-40">
                          <button onClick={() => handleEditProduct(p)} className="text-[10px] bg-white/5 px-2 py-1 uppercase tracking-widest hover:bg-white hover:text-dark transition-all mr-3">Edit</button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="text-[10px] bg-red-500/10 px-2 py-1 uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-white transition-all">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'add-product' && (
            <div className="glass-panel p-6">
              <h2 className="font-serif text-2xl text-white tracking-widest mb-6">{newProduct.id ? 'Edit Offering' : 'New Offering'}</h2>
              <form onSubmit={handleAddProduct} className="flex flex-col gap-6 max-w-lg">
                <div className="flex gap-6">
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-xs text-silver tracking-widest uppercase">Name</label>
                    <input type="text" required value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="bg-transparent border-b border-silver-dark/30 focus:border-white text-white py-2 outline-none" />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-xs text-silver tracking-widest uppercase">Tagline</label>
                    <input type="text" value={newProduct.tagline} onChange={e => setNewProduct({ ...newProduct, tagline: e.target.value })} className="bg-transparent border-b border-silver-dark/30 focus:border-white text-white py-2 outline-none" />
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-xs text-silver tracking-widest uppercase">Price ($)</label>
                    <input type="number" step="0.01" required value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} className="bg-transparent border-b border-silver-dark/30 focus:border-white text-white py-2 outline-none" />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-xs text-silver tracking-widest uppercase">Quantity</label>
                    <input type="number" required value={newProduct.quantity} onChange={e => setNewProduct({ ...newProduct, quantity: e.target.value })} className="bg-transparent border-b border-silver-dark/30 focus:border-white text-white py-2 outline-none" />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-xs text-silver tracking-widest uppercase">Category</label>
                    <select value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} className="bg-dark border-b border-silver-dark/30 focus:border-white text-white py-2 outline-none">
                      <option value="rings">Rings</option>
                      <option value="necklaces">CHAINS</option>
                      <option value="bracelets">Bracelets</option>
                      <option value="earrings">Earrings</option>
                      <option value="sets">Sets</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-xs text-silver tracking-widest uppercase">Gender</label>
                    <select value={newProduct.gender} onChange={e => setNewProduct({ ...newProduct, gender: e.target.value })} className="bg-dark border-b border-silver-dark/30 focus:border-white text-white py-2 outline-none">
                      <option value="both">Both</option>
                      <option value="men">Men</option>
                      <option value="women">Women</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-xs text-silver tracking-widest uppercase">Style Type</label>
                    <input type="text" placeholder="e.g. Minimalist Ring" value={newProduct.style_type} onChange={e => setNewProduct({ ...newProduct, style_type: e.target.value })} className="bg-transparent border-b border-silver-dark/30 focus:border-white text-white py-2 outline-none" />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-xs text-silver tracking-widest uppercase">Available Colors</label>
                    <input type="text" placeholder="e.g. Silver, Black, Obsidian" value={newProduct.colors} onChange={e => setNewProduct({ ...newProduct, colors: e.target.value })} className="bg-transparent border-b border-silver-dark/30 focus:border-white text-white py-2 outline-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-silver tracking-widest uppercase">Image</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed ${dragging ? 'border-white bg-white/10' : 'border-silver-dark/30'} flex flex-col items-center justify-center py-8 cursor-pointer transition-colors hover:border-white/50 text-center relative`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                    {uploadingImage ? (
                      <span className="text-silver text-sm uppercase tracking-widest">Uploading...</span>
                    ) : newProduct.image ? (
                      <div className="flex flex-col items-center">
                        <img src={newProduct.image} alt="Preview" className="h-32 object-cover mb-4" />
                        <span className="text-silver text-xs uppercase tracking-widest">Click or drag to replace image</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-2">
                        <span className="text-white uppercase tracking-widest text-sm">Drag & Drop Image Here</span>
                        <span className="text-silver text-xs uppercase tracking-widest">or click to browse local files</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-silver text-xs uppercase tracking-widest">Or enter URL manually:</span>
                    <input type="text" required={!newProduct.image} value={newProduct.image} onChange={e => setNewProduct({ ...newProduct, image: e.target.value })} className="bg-transparent border-b border-silver-dark/30 focus:border-white text-white py-1 outline-none flex-1 text-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-silver tracking-widest uppercase">Additional Images</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                    {newProduct.additional_images && newProduct.additional_images.map((img, idx) => (
                      <div key={idx} className="relative group aspect-square border border-white/10 rounded overflow-hidden bg-white/5">
                        <img src={img} alt={`Additional ${idx}`} className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => removeAdditionalImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => additionalFilesRef.current?.click()}
                      disabled={uploadingAdditional}
                      className="aspect-square border-2 border-dashed border-silver-dark/30 flex flex-col items-center justify-center hover:border-white/50 transition-colors bg-white/5"
                    >
                      {uploadingAdditional ? (
                        <span className="text-[10px] uppercase tracking-widest text-silver animate-pulse">Uploading...</span>
                      ) : (
                        <>
                          <span className="text-xl text-silver">+</span>
                          <span className="text-[8px] uppercase tracking-widest text-silver">Add Images</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="file"
                    ref={additionalFilesRef}
                    multiple
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleAdditionalUpload(e.target.files);
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-silver tracking-widest uppercase">Description</label>
                  <textarea required value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} className="bg-transparent border-b border-silver-dark/30 focus:border-white text-white py-2 outline-none h-24 resize-none" ></textarea>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-silver tracking-widest uppercase">Details (Material, Specs, etc.)</label>
                  <textarea value={newProduct.details} onChange={e => setNewProduct({ ...newProduct, details: e.target.value })} className="bg-transparent border-b border-silver-dark/30 focus:border-white text-white py-2 outline-none h-24 resize-none" ></textarea>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <button type="submit" className="border border-white bg-white text-dark font-medium px-8 py-3 tracking-widest text-xs uppercase hover:bg-transparent hover:text-white transition-all">{newProduct.id ? 'Update' : 'Publish'}</button>
                  <button type="button" onClick={resetForm} className="border border-silver-dark/30 text-silver px-8 py-3 tracking-widest text-xs uppercase hover:border-white hover:text-white transition-all">Clear Form</button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-2xl text-white tracking-widest">Order Tracking</h2>
                <button onClick={handleClearAllOrders} className="text-xs text-red-400 tracking-widest uppercase border border-red-500/30 px-4 py-2 hover:bg-red-500/10 transition-colors">Clear Data</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-silver">
                  <thead className="uppercase tracking-widest text-xs border-b border-white/10 text-white">
                    <tr>
                      <th className="py-4 pr-4">Order ID</th>
                      <th className="py-4 px-4">Customer</th>
                      <th className="py-4 px-4">Date</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-4 text-right">Total</th>
                      <th className="py-4 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => {
                      const expanded = expandedOrderId === o.id;
                      let parsedItems = [];
                      try {
                        parsedItems = o.items ? JSON.parse(o.items) : [];
                      } catch (e) { }
                      return (
                        <React.Fragment key={o.id}>
                          <tr
                            className={`border-b border-white/5 hover:bg-white/5 cursor-pointer ${expanded ? 'bg-white/5' : ''}`}
                            onClick={() => setExpandedOrderId(expanded ? null : o.id)}
                          >
                            <td className="py-4 pr-4">#{o.id}</td>
                            <td className="py-4 px-4">{o.customer_name}</td>
                            <td className="py-4 px-4 text-xs tracking-wider">{o.date}</td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-1 text-[10px] uppercase tracking-widest border ${o.status === 'Delivered' ? 'border-green-500/50 text-green-400' : 'border-yellow-500/50 text-yellow-400'}`}>
                                {o.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">${o.total_amount}</td>
                            <td className="py-4 pl-4 flex gap-4 justify-end">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteOrder(o.id); }}
                                className="text-[10px] bg-red-500/10 px-2 py-1 uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-white transition-all"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="border-b border-white/10 bg-black/40">
                              <td colSpan="6" className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div>
                                    <h4 className="text-white text-xs uppercase tracking-widest mb-3 border-b border-white/10 pb-2">Customer Info</h4>
                                    <div className="space-y-2">
                                      <p className="text-sm"><span className="text-silver-dark uppercase tracking-widest text-[10px] mr-2">Email:</span> {o.email || 'N/A'}</p>
                                      <p className="text-sm"><span className="text-silver-dark uppercase tracking-widest text-[10px] mr-2">Phone:</span> {o.phone || 'N/A'}</p>
                                      <p className="text-sm"><span className="text-silver-dark uppercase tracking-widest text-[10px] mr-2">Address:</span> {o.address || 'N/A'}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="text-white text-xs uppercase tracking-widest mb-3 border-b border-white/10 pb-2">Purchased Items</h4>
                                    {parsedItems.length > 0 ? (
                                      <ul className="space-y-2">
                                        {parsedItems.map((item, idx) => (
                                          <div key={idx} className="flex gap-4 items-center mb-6 last:mb-0">
                                            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-sm overflow-hidden shrink-0">
                                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                              <p className="font-serif text-white tracking-widest">{item.name}</p>
                                              <div className="flex gap-3 text-[10px] text-silver uppercase tracking-widest mt-1">
                                                <span>Size: {item.size || 'M'}</span>
                                                <span>|</span>
                                                <span>Color: {item.color || 'Silver'}</span>
                                                <span>|</span>
                                                <span>Qty: {item.quantity}</span>
                                                <span>|</span>
                                                <span>${item.price} each</span>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-silver-dark text-xs">No items recorded.</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-2xl text-white tracking-widest">Payment Details</h2>
                <button onClick={handleClearAllPayments} className="text-xs text-red-400 tracking-widest uppercase border border-red-500/30 px-4 py-2 hover:bg-red-500/10 transition-colors">Clear Data</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-silver">
                  <thead className="uppercase tracking-widest text-xs border-b border-white/10 text-white">
                    <tr>
                      <th className="py-4 pr-4">TX ID</th>
                      <th className="py-4 px-4">Order Ref</th>
                      <th className="py-4 px-4">Method</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-4 text-right">Amount</th>
                      <th className="py-4 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-4 pr-4">TX-{p.id}00</td>
                        <td className="py-4 px-4">Order #{p.order_id}</td>
                        <td className="py-4 px-4 text-xs tracking-wider">{p.method}</td>
                        <td className="py-4 px-4">
                          <span className={`${p.status === 'Completed' ? 'text-green-400' : 'text-yellow-400'} text-xs uppercase tracking-widest`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">${p.amount}</td>
                        <td className="py-4 pl-4 flex justify-end">
                          <button onClick={() => handleDeletePayment(p.id)} className="text-[10px] bg-red-500/10 px-2 py-1 uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-white transition-all">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-2xl text-white tracking-widest">Client Register</h2>
                <button onClick={handleClearAllCustomers} className="text-xs text-red-400 tracking-widest uppercase border border-red-500/30 px-4 py-2 hover:bg-red-500/10 transition-colors">Clear Data</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-silver">
                  <thead className="uppercase tracking-widest text-xs border-b border-white/10 text-white">
                    <tr>
                      <th className="py-4 pr-4">ID</th>
                      <th className="py-4 px-4">Name</th>
                      <th className="py-4 px-4">Contact</th>
                      <th className="py-4 px-4">Auth Method</th>
                      <th className="py-4 px-4">Joined</th>
                      <th className="py-4 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(c => {
                      const isExpanded = expandedCustomerId === c.id;
                      return (
                        <React.Fragment key={c.id}>
                          <tr 
                            className={`border-b border-white/5 hover:bg-white/5 cursor-pointer ${isExpanded ? 'bg-white/5' : ''}`}
                            onClick={() => setExpandedCustomerId(isExpanded ? null : c.id)}
                          >
                            <td className="py-4 pr-4 align-middle">CUS-{c.id}</td>
                            <td className="py-4 px-4 align-middle font-medium text-white">{c.name}</td>
                            <td className="py-4 px-4 align-middle text-white/70">
                              {c.email ? <div className="truncate max-w-[150px]">{c.email}</div> : null}
                              {c.phone ? <div>{c.phone}</div> : null}
                            </td>
                            <td className="py-4 px-4 align-middle text-xs tracking-wider uppercase">{c.auth_provider || 'local'}</td>
                            <td className="py-4 px-4 align-middle text-xs tracking-wider">{c.join_date}</td>
                            <td className="py-4 pl-4 align-middle text-right">
                              <div className="flex justify-end gap-3">
                                <button 
                                  className="text-[10px] bg-white/5 px-3 py-1 uppercase tracking-widest hover:bg-white hover:text-dark transition-all"
                                >
                                  Details
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(c.id); }}
                                  className="text-[10px] bg-red-500/10 px-3 py-1 uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-black/40 border-b border-white/10">
                              <td colSpan="6" className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                  <div className="space-y-4">
                                    <h4 className="text-white text-xs uppercase tracking-widest border-b border-white/10 pb-2">Profile Info</h4>
                                    <div>
                                      <p className="text-[10px] text-silver-dark uppercase tracking-widest mb-1">Full Name</p>
                                      <p className="text-white text-sm tracking-wide">{c.name}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-silver-dark uppercase tracking-widest mb-1">Customer ID</p>
                                      <p className="text-white text-sm tracking-wide">#SELESTIAL-CUS-{c.id}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-silver-dark uppercase tracking-widest mb-1">Registration Date</p>
                                      <p className="text-white text-sm tracking-wide">{c.join_date}</p>
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    <h4 className="text-white text-xs uppercase tracking-widest border-b border-white/10 pb-2">Contact Details</h4>
                                    <div>
                                      <p className="text-[10px] text-silver-dark uppercase tracking-widest mb-1">Email Address</p>
                                      <p className="text-white text-sm tracking-wide">{c.email || 'Not Provided'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-silver-dark uppercase tracking-widest mb-1">Phone Number</p>
                                      <p className="text-white text-sm tracking-wide">{c.phone || 'Not Provided'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-silver-dark uppercase tracking-widest mb-1">Authentication</p>
                                      <p className="text-white text-sm tracking-wide uppercase">{c.auth_provider || 'local'}</p>
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    <h4 className="text-white text-xs uppercase tracking-widest border-b border-white/10 pb-2">Order Activity</h4>
                                    <div className="bg-white/5 p-4 rounded border border-white/5 text-center">
                                      <p className="text-[10px] text-silver-dark uppercase tracking-widest mb-2">Account Status</p>
                                      <span className="text-green-400 text-xs tracking-widest uppercase">Active</span>
                                    </div>
                                    <p className="text-[10px] text-silver-dark uppercase tracking-widest text-center mt-2 italic opacity-50">More detailed analytics coming soon</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
