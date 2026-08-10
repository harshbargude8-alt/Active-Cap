import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Lock, User, AlertCircle } from 'lucide-react';

export const Login = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-calm-border rounded-3xl shadow-xl overflow-hidden p-8 relative">
        
        {/* Decorative subtle ambient spots */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-accent-blue/5 rounded-full blur-xl"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-accent-green/5 rounded-full blur-xl"></div>

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="bg-gradient-to-tr from-accent-blue to-accent-green p-3 rounded-2xl text-white shadow-md mb-4">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-calm-text">Active Cap</h1>
          <p className="text-sm text-calm-muted mt-1">
            {isLogin ? 'Focus on max 2 active projects.' : 'Set up your single-user account.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-xl flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-medium text-calm-muted uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-calm-muted">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. demo"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-calm-border rounded-xl text-calm-text placeholder-calm-muted text-sm outline-none focus:bg-white focus:border-accent-blue transition-all duration-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-calm-muted uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-calm-muted">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-calm-border rounded-xl text-calm-text placeholder-calm-muted text-sm outline-none focus:bg-white focus:border-accent-blue transition-all duration-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-calm-slate text-white rounded-xl font-medium text-sm shadow-sm hover:bg-calm-slate/95 transition-all duration-300 transform active:scale-98 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm relative z-10">
          <span className="text-calm-muted">
            {isLogin ? "First time using Active Cap?" : "Already have an account?"}
          </span>{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-accent-blue hover:underline font-medium"
          >
            {isLogin ? 'Register here' : 'Sign in here'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default Login;
