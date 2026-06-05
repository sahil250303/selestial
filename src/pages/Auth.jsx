import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Phone, Lock, User, ArrowRight, CheckCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

const MIN_PASSWORD_LENGTH = 8;
const googleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'
  const [step, setStep] = useState(1); // 1: form, 2: otp
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    otp: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    if (token) {
      navigate('/');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const persistSession = (data) => {
    localStorage.setItem('customerToken', data.token);
    localStorage.setItem('customerName', data.user.name);
    localStorage.setItem('customerData', JSON.stringify(data.user));
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!formData.phone) {
      setError('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/customer/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone })
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setStep(2);
      setSuccess(data.message || 'OTP sent successfully.');
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/customer/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google sign-in failed');

      persistSession(data);
      navigate(location.state?.from || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (authMethod === 'email' && !isLogin) {
      if (formData.password.length < MIN_PASSWORD_LENGTH) {
        setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

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
        if (!isLogin) {
          payload.name = formData.name;
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      setLoading(false);

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      persistSession(data);
      navigate(location.state?.from || '/');

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
    setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '', otp: '' });
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center relative z-10">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-blue-500/10 blur-3xl -z-10 rounded-full mix-blend-screen" />

        <div className="text-center mb-8">
          <h2 className="text-3xl font-light tracking-widest text-white mb-2">
            {isLogin ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
          </h2>
          <p className="text-gray-400 text-sm">
            {isLogin ? 'Log in to your Selestial account' : 'Join Selestial for exclusive access'}
          </p>
        </div>

        <div className="flex bg-black/40 rounded-lg p-1 mb-6 border border-white/5">
          <button
            onClick={() => { setAuthMethod('email'); setStep(1); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-300 flex items-center justify-center gap-2 ${authMethod === 'email' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
          >
            <Mail size={16} /> Email
          </button>
          <button
            onClick={() => { setAuthMethod('phone'); setStep(1); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-300 flex items-center justify-center gap-2 ${authMethod === 'phone' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
          >
            <Phone size={16} /> Phone (OTP)
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        <form onSubmit={authMethod === 'phone' && step === 1 ? handleSendOTP : handleSubmit} className="space-y-4">

          {!isLogin && step === 1 && (
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Full Name"
                required
                className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-black/50 transition-all"
              />
            </div>
          )}

          {authMethod === 'email' && (
            <>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email Address"
                  autoComplete="email"
                  required
                  className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-black/50 transition-all"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={isLogin ? 'Password' : `Password (min ${MIN_PASSWORD_LENGTH} chars)`}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  minLength={isLogin ? undefined : MIN_PASSWORD_LENGTH}
                  required
                  className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-black/50 transition-all"
                />
              </div>
              {!isLogin && (
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-black/50 transition-all"
                  />
                </div>
              )}
            </>
          )}

          {authMethod === 'phone' && step === 1 && (
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Mobile Number"
                required
                className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-black/50 transition-all"
              />
            </div>
          )}

          {authMethod === 'phone' && step === 2 && (
            <div className="relative">
              <CheckCircle className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                type="text"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                placeholder="Enter 4-digit OTP"
                required
                maxLength="4"
                className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-black/50 transition-all text-center tracking-[1em] font-mono text-lg"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-lg font-medium tracking-wider hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 group disabled:opacity-60"
          >
            {loading ? 'Processing...' : (
              <>
                {authMethod === 'phone' && step === 1 ? 'Send OTP' : (isLogin ? 'Log In' : 'Sign Up')}
                {authMethod !== 'phone' || step === 2 ? <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /> : null}
              </>
            )}
          </button>
        </form>

        {authMethod === 'email' && (
          <>
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-white/10"></div>
              <span className="px-4 text-gray-500 text-sm">OR</span>
              <div className="flex-1 border-t border-white/10"></div>
            </div>

            {googleConfigured ? (
              <div className="flex justify-center [color-scheme:light]">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_black"
                  text={isLogin ? 'signin_with' : 'signup_with'}
                  shape="rectangular"
                  width="320"
                  useOneTap={false}
                />
              </div>
            ) : (
              <div className="text-center text-xs text-gray-500 border border-white/10 rounded-lg py-3 px-4">
                Google sign-in is disabled. Set <code className="text-gray-300">VITE_GOOGLE_CLIENT_ID</code> to enable it.
              </div>
            )}
          </>
        )}

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={toggleMode}
              className="ml-2 text-white hover:underline focus:outline-none font-medium"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Auth;
