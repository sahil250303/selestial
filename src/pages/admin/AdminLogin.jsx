import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    gsap.fromTo('.login-form',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
    );
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
      } else {
        localStorage.setItem('selestial_admin_token', data.token);
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError('Network error: Ensure backend is running.');
    }
  };

  return (
    <div className="min-h-screen pt-32 px-6 lg:px-12 max-w-lg mx-auto relative z-10 flex flex-col justify-center pb-32">
      <div className="login-form glass-panel p-10 text-center">
        <h1 className="font-serif text-3xl text-white tracking-widest uppercase mb-2">System Access</h1>
        <p className="text-silver tracking-widest uppercase text-xs mb-8">Admin Gateway</p>

        {error && <p className="text-red-400 text-sm mb-4 tracking-wider">{error}</p>}

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div className="flex flex-col text-left">
            <label className="text-xs text-silver tracking-widest uppercase mb-2">Username</label>
            <input
              type="text"
              className="bg-transparent border-b border-silver-dark/30 focus:border-white text-white py-2 outline-none transition-colors"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col text-left">
            <label className="text-xs text-silver tracking-widest uppercase mb-2">Password</label>
            <input
              type="password"
              className="bg-transparent border-b border-silver-dark/30 focus:border-white text-white py-2 outline-none transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="mt-6 border border-white text-white font-medium px-6 py-3 tracking-widest text-xs uppercase hover:bg-white hover:text-dark transition-all duration-300"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}
