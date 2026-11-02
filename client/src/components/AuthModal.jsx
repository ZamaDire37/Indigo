import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, X, Sparkles, Feather } from 'lucide-react';

export default function AuthModal({ initialMode = 'login', onClose, onNavigate }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login', 'register', 'forgot'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email || username, password);
        onClose();
      } else if (mode === 'register') {
        await register(username, email, password);
        onClose();
      } else if (mode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        }).then(r => r.json());

        if (res.error) throw new Error(res.error);
        setForgotMessage(res.message + (res.resetToken ? ` (Reset Token: ${res.resetToken})` : ''));
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFDF9] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#E5DECF] animate-in zoom-in-95 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-black rounded-full hover:bg-gray-100"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-[#1E1B4B] to-[#3B3878] flex items-center justify-center text-[#FAF7F2] shadow-sm mb-2">
            <BookOpen className="w-5 h-5" />
          </div>
          <h2 className="font-cinzel text-2xl font-bold text-[#1E1B4B]">
            {mode === 'login' ? 'Welcome Back to Indigo' : mode === 'register' ? 'Join Indigo Publishing' : 'Reset Password'}
          </h2>
          <p className="text-xs text-[#5D597E] mt-1 font-serif-body">
            {mode === 'login'
              ? 'Access your reading library, author personas, and chapters.'
              : mode === 'register'
              ? 'Free publishing. Zero paywalls. Writers retain 100% ownership.'
              : 'Enter your email to receive password reset instructions.'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        {mode !== 'forgot' && (
          <div className="flex bg-[#F0EBE1] p-1 rounded-xl mb-5 text-xs font-semibold">
            <button
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${
                mode === 'login' ? 'bg-[#1E1B4B] text-white' : 'text-gray-600 hover:text-black'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${
                mode === 'register' ? 'bg-[#1E1B4B] text-white' : 'text-gray-600 hover:text-black'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Forgot message notice */}
        {forgotMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl mb-4">
            {forgotMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-[#1E1B4B] uppercase tracking-wider mb-1">
                Username *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. eleanor_v"
                className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-[#1E1B4B] uppercase tracking-wider mb-1">
              {mode === 'login' ? 'Email or Username *' : 'Email Address *'}
            </label>
            <input
              type={mode === 'login' ? 'text' : 'email'}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={mode === 'login' ? 'Your email or username' : 'name@domain.com'}
              className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-[#1E1B4B] uppercase tracking-wider">
                  Password *
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                    }}
                    className="text-[11px] text-[#312E81] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81] transition-all shadow-md disabled:opacity-50 mt-2"
          >
            {loading
              ? 'Processing...'
              : mode === 'login'
              ? 'Sign In to Indigo'
              : mode === 'register'
              ? 'Create Free Account'
              : 'Generate Reset Token'}
          </button>
        </form>

        {mode === 'forgot' && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setMode('login');
                setForgotMessage('');
              }}
              className="text-xs text-[#312E81] font-semibold hover:underline"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Demo credentials hint for testing */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-[11px] text-gray-500 bg-[#FAF7F2] p-3 rounded-xl">
          <p className="font-bold text-gray-700 mb-1">Quick Demo Credentials:</p>
          <p>Admin: <code className="bg-white px-1 py-0.5 rounded text-[#1E1B4B]">admin@indigo.lit</code> / <code className="bg-white px-1 py-0.5 rounded text-[#1E1B4B]">AdminPass123!</code></p>
          <p>Writer: <code className="bg-white px-1 py-0.5 rounded text-[#1E1B4B]">eleanor@indigo.lit</code> / <code className="bg-white px-1 py-0.5 rounded text-[#1E1B4B]">Password123!</code></p>
        </div>
      </div>
    </div>
  );
}
