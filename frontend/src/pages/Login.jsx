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
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-4 transition-colors duration-200">
      <div className="w-full max-w-md bg-graphite-800 border border-border-default rounded-2xl shadow-xl overflow-hidden p-8 relative transition-colors duration-200">
        
        {/* Decorative subtle ambient spots */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-lime-accent/5 rounded-full blur-xl"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-mint-accent/5 rounded-full blur-xl"></div>

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="bg-gradient-to-tr from-lime-accent to-mint-accent p-3 rounded-2xl text-graphite-950 shadow-md mb-4">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-text-primary">Active Cap</h1>
          <p className="text-sm text-text-muted mt-1">
            {isLogin ? 'Focus on max 2 active projects.' : 'Set up your single-user account.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-error/10 border border-error/20 text-error text-sm p-3 rounded-xl flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. demo"
                required
                className="w-full pl-10 pr-4 py-3 bg-graphite-700 border border-border-default rounded-xl text-text-primary placeholder-text-muted text-sm outline-none focus:border-lime-accent transition-all duration-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-3 bg-graphite-700 border border-border-default rounded-xl text-text-primary placeholder-text-muted text-sm outline-none focus:border-lime-accent transition-all duration-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-lime-accent hover:bg-lime-accent-hover text-graphite-950 rounded-xl font-medium text-sm shadow-sm transition-all duration-300 transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm relative z-10">
          <span className="text-text-muted">
            {isLogin ? "First time using Active Cap?" : "Already have an account?"}
          </span>{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-lime-accent hover:underline font-medium"
          >
            {isLogin ? 'Register here' : 'Sign in here'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default Login;
