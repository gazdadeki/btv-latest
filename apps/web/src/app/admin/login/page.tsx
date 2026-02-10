'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { AuthUtils } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const result = (await api.login(email.trim(), password)) as {
        user?: Record<string, unknown>;
      };
      if (result?.user) {
        AuthUtils.setUserCookie(result.user as Parameters<typeof AuthUtils.setUserCookie>[0]);
        await new Promise((r) => setTimeout(r, 50));
        window.location.href = '/admin';
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Login failed. Please check your credentials.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-5">
      <div className="w-full max-w-[400px]">
        <div className="text-center text-white text-3xl font-light mb-6">
          <b>BaltazarTV</b> Admin
        </div>

        <div className="bg-white rounded-xl p-8 shadow-2xl">
          <p className="text-center text-gray-500 mb-6">Sign in to start your session</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-11 px-3 pr-10 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <i className="fas fa-envelope" />
                </span>
              </div>
            </div>
            <div className="mb-6">
              <div className="relative">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-11 px-3 pr-10 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <i className="fas fa-lock" />
                </span>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all disabled:opacity-70 disabled:translate-y-0 cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
