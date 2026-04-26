import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Phone, Lock, User, ArrowRight, CheckCircle } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'
  const [step, setStep] = useState(1); // 1: form, 2: otp
  const navigate = useNavigate();
  const location = useLocation();

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
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

  const handleGoogleAuth = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate Google Auth
    setTimeout(async () => {
      try {
        const url = isLogin ? '/api/auth/customer/login' : '/api/auth/customer/signup';
        // Mock payload for Google Auth
        const payload = {
          email: 'google_user@example.com',
          name: 'Google User',
          auth_provider: 'google'
        };
        
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        setLoading(false);
        if (!res.ok) throw new Error(data.error);
        
        localStorage.setItem('customerToken', data.token);
        localStorage.setItem('customerData', JSON.stringify(data.user));
        navigate(location.state?.from || '/');
      } catch (err) {
        setLoading(false);
        setError(err.message || 'Authentication failed');
      }
    }, 1500);
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

      // Store token
      localStorage.setItem('customerToken', data.token);
      localStorage.setItem('customerName', data.user.name);
      localStorage.setItem('customerData', JSON.stringify(data.user));
      
      // Redirect to homepage or profile
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
    setFormData({ name: '', email: '', phone: '', password: '', otp: '' });
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center relative z-10">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-blue-500/10 blur-3xl -z-10 rounded-full mix-blend-screen" />
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-light tracking-widest text-white mb-2">
            {isLogin ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
          </h2>
          <p className="text-gray-400 text-sm">
            {isLogin ? 'Log in to your Selestial account' : 'Join Selestial for exclusive access'}
          </p>
        </div>

        {/* Method Toggle */}
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
          
          {/* Sign Up Fields */}
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

          {/* Email Auth Form */}
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
                  placeholder="Password"
                  required
                  className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-black/50 transition-all"
                />
              </div>
            </>
          )}

          {/* Phone Auth Form */}
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

          {/* OTP Verification Step */}
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
            className="w-full bg-white text-black py-3 rounded-lg font-medium tracking-wider hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 group"
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

            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full bg-transparent border border-white/20 hover:bg-white/5 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
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
