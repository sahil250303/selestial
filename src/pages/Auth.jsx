import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Phone, Lock, User, ArrowRight, CheckCircle } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { setCustomerSession } from '../utils/auth';
import { googleEnabled } from '../config/google.js';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState('email');
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    if (token) navigate('/');
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const persistAuth = (data, redirectPath) => {
    setCustomerSession(data);
    navigate(redirectPath || location.state?.from || '/');
  };

  const googleLogin = useGoogleLogin({
    flow: 'implicit',
    prompt: 'select_account',
    onSuccess: async (tokenResponse) => {
      setError('');
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        if (!userInfoRes.ok) throw new Error('Could not read your Google profile. Please try again.');
        const googleUser = await userInfoRes.json();

        const res = await fetch('/api/auth/customer/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: tokenResponse.access_token, googleUser }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Google authentication failed');
        persistAuth(data);
      } catch (err) {
        setError(err.message || 'Google authentication failed');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError('Google sign-in did not complete. Please try again.');
      setLoading(false);
    },
    onNonOAuthError: () => {
      setLoading(false);
    },
  });

  const handleGoogleClick = () => {
    if (!googleEnabled) {
      setError('Google sign-in is not configured yet. Please use email or phone, or contact support.');
      return;
    }
    setError('');
    setLoading(true);
    googleLogin();
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!formData.phone) { setError('Please enter a valid phone number'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/customer/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setStep(2);
      setSuccess(data.message || 'OTP sent. Please check your phone.');
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let endpoint = '/api/auth/customer/login';
      let payload = { email: formData.email, password: formData.password };

      if (!isLogin) {
        endpoint = '/api/auth/customer/signup';
        payload = { name: formData.name, email: formData.email, password: formData.password };
      }
      if (authMethod === 'phone') {
        endpoint = '/api/auth/customer/verify-otp';
        payload = { phone: formData.phone, otp: formData.otp };
        if (!isLogin) payload.name = formData.name;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      persistAuth(data);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setStep(1);
    setError('');
    setSuccess('');
    setFormData({ name: '', email: '', phone: '', password: '', otp: '' });
  };

  /* ── shared input style ─────────────────────────────────────────────────── */
  const inputCls =
    'w-full bg-transparent border-b border-white/20 py-3 pl-8 pr-4 text-white text-sm tracking-wider placeholder-white/30 focus:outline-none focus:border-white/60 transition-colors duration-200';

  return (
    <div className="min-h-screen flex items-stretch relative z-10 overflow-hidden">

      {/* ── Left panel — editorial hero ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative items-end p-16 overflow-hidden">
        {/* Background image layer */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/hero_2.png)' }}
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />

        <div className="relative z-10">
          <p className="text-[10px] tracking-[0.4em] text-white/40 uppercase mb-3 font-sans">
            New Collection
          </p>
          <h1 className="font-serif text-5xl xl:text-6xl text-white leading-[1.08] tracking-wider mb-6">
            ELEVATED<br />CLASSICS
          </h1>
          <div className="w-12 h-[1px] bg-white/30 mb-6" />
          <p className="text-white/50 text-sm tracking-[0.15em] uppercase font-sans leading-relaxed max-w-xs">
            925 Sterling Silver<br />Crafted with celestial precision
          </p>
        </div>
      </div>

      {/* ── Right panel — form ───────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-24 bg-[#080808]">
        <div className="w-full max-w-sm">

          {/* Brand mark (mobile) */}
          <div className="lg:hidden text-center mb-10 auth-mobile-logo">
            <img src="/SVG/SELESTIAL.LGOG%20IN%20WHITE.svg?v=2" alt="Selestial" className="h-10 mx-auto mb-4" />
            <div className="w-8 h-[1px] bg-white/20 mx-auto" />
          </div>

          {/* Heading */}
          <div className="mb-10">
            <p className="text-[10px] tracking-[0.4em] text-white/30 uppercase font-sans mb-3">
              {isLogin ? 'Welcome back' : 'New member'}
            </p>
            <h2 className="font-serif text-4xl text-white tracking-widest">
              {isLogin ? 'SIGN IN' : 'CREATE\nACCOUNT'}
            </h2>
            <div className="mt-4 w-10 h-[1px] bg-white/20" />
          </div>

          {/* Method toggle */}
          <div className="flex gap-6 mb-8 border-b border-white/10 pb-1">
            {['email', 'phone'].map(m => (
              <button
                key={m}
                onClick={() => { setAuthMethod(m); setStep(1); setError(''); setSuccess(''); }}
                className={`pb-3 text-[10px] tracking-[0.3em] uppercase font-sans transition-all duration-200 relative ${
                  authMethod === m ? 'text-white' : 'text-white/30 hover:text-white/60'
                }`}
              >
                {m === 'email' ? 'Email' : 'Phone / OTP'}
                {authMethod === m && (
                  <span className="absolute bottom-0 left-0 w-full h-[1px] bg-white" />
                )}
              </button>
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <div className="border border-red-500/20 bg-red-500/5 text-red-400 text-xs tracking-wider p-3 rounded mb-6 font-sans">
              {error}
            </div>
          )}
          {success && (
            <div className="border border-green-500/20 bg-green-500/5 text-green-400 text-xs tracking-wider p-3 rounded mb-6 font-sans">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={authMethod === 'phone' && step === 1 ? handleSendOTP : handleSubmit} className="space-y-7">

            {/* Name (signup) */}
            {!isLogin && step === 1 && (
              <div className="relative">
                <label className="block text-[9px] tracking-[0.35em] uppercase text-white/30 mb-2 font-serif">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-0 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                  <input type="text" name="name" value={formData.name} onChange={handleChange}
                    placeholder="Your name" required className={inputCls} />
                </div>
              </div>
            )}

            {/* Email fields */}
            {authMethod === 'email' && (
              <>
                <div className="relative">
                  <label className="block text-[9px] tracking-[0.35em] uppercase text-white/30 mb-2 font-serif">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                    <input type="email" name="email" value={formData.email} onChange={handleChange}
                      placeholder="you@example.com" required className={inputCls} />
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-[9px] tracking-[0.35em] uppercase text-white/30 mb-2 font-serif">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                    <input type="password" name="password" value={formData.password} onChange={handleChange}
                      placeholder="••••••••" required className={inputCls} />
                  </div>
                </div>
              </>
            )}

            {/* Phone */}
            {authMethod === 'phone' && step === 1 && (
              <div className="relative">
                <label className="block text-[9px] tracking-[0.35em] uppercase text-white/30 mb-2 font-serif">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-0 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                    placeholder="+1 234 567 8900" required className={inputCls} />
                </div>
              </div>
            )}

            {/* OTP */}
            {authMethod === 'phone' && step === 2 && (
              <div className="relative">
                <label className="block text-[9px] tracking-[0.35em] uppercase text-white/30 mb-2 font-serif">
                  Verification Code
                </label>
                <div className="relative">
                  <CheckCircle className="absolute left-0 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                  <input type="text" name="otp" value={formData.otp} onChange={handleChange}
                    placeholder="· · · · · ·" required maxLength="6" inputMode="numeric"
                    className={`${inputCls} text-center tracking-[1.2em] font-mono text-xl pl-0`} />
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 flex items-center justify-between px-6 py-4 bg-white text-black group hover:bg-white/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="font-serif text-sm tracking-[0.25em] uppercase">
                {loading ? 'Processing...' : (
                  authMethod === 'phone' && step === 1 ? 'Send OTP' :
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </span>
              {!loading && (
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
              )}
            </button>
          </form>

          {/* Google */}
          {authMethod === 'email' && googleEnabled && (
            <>
              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-[1px] bg-white/10" />
                <span className="text-[9px] tracking-[0.3em] uppercase text-white/20 font-sans">or</span>
                <div className="flex-1 h-[1px] bg-white/10" />
              </div>
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={loading}
                className="w-full border border-white/10 hover:border-white/25 text-white/60 hover:text-white py-3.5 transition-all duration-200 flex items-center justify-center gap-3 font-sans text-xs tracking-[0.2em] uppercase disabled:opacity-50"
              >
                {loading ? <span>Processing...</span> : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>
            </>
          )}

          {/* Toggle mode */}
          <p className="mt-10 text-center text-[10px] tracking-[0.2em] uppercase text-white/25 font-sans">
            {isLogin ? "Don't have an account?" : 'Already a member?'}
            {' '}
            <button
              onClick={toggleMode}
              className="text-white/60 hover:text-white transition-colors focus:outline-none underline underline-offset-4 decoration-white/20"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Auth;
