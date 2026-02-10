'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo, useState } from 'react';

type Mode = 'form' | 'success' | 'error' | 'no-token';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [mode, setMode] = useState<Mode>(token ? 'form' : 'no-token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [errorCardMessage, setErrorCardMessage] = useState(
    'This password reset link is invalid or has expired. Please request a new password reset.',
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const requirements = useMemo(
    () => ({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    }),
    [password],
  );

  const isPasswordValid = useMemo(
    () => Object.values(requirements).every(Boolean),
    [requirements],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError('');

      if (!token) {
        setMode('no-token');
        return;
      }

      if (!isPasswordValid) {
        setError('Please ensure your password meets all requirements.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('/api/v1/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password }),
        });

        const data = (await response.json()) as { message?: string };
        if (response.ok) {
          setMode('success');
        } else if (response.status === 401) {
          setErrorCardMessage(
            data.message ||
              'This password reset link is invalid or has expired. Please request a new password reset.',
          );
          setMode('error');
        } else {
          setError(data.message || 'An error occurred. Please try again.');
        }
      } catch {
        setError('Network error. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    },
    [token, password, confirmPassword, isPasswordValid],
  );

  const RequirementItem = ({
    met,
    label,
  }: {
    met: boolean;
    label: string;
  }) => (
    <li className={met ? 'text-green-600' : 'text-red-500'}>
      <i className={`fas ${met ? 'fa-check-circle' : 'fa-circle'} mr-1`} />
      {label}
    </li>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-5">
      <div className="w-full max-w-[400px]">
        <div className="text-center text-white text-3xl font-light mb-6">
          <b>BaltazarTV</b>
        </div>

        {mode === 'form' && (
          <div className="bg-white rounded-xl p-8 shadow-2xl">
            <h4 className="text-center text-xl font-semibold mb-2">
              <i className="fas fa-key mr-2" />
              Reset Password
            </h4>
            <p className="text-center text-gray-500 text-sm mb-6">
              Enter your new password below. Make sure it&apos;s strong and secure.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="relative mb-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  placeholder="New Password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
                  onClick={() => setShowPassword((p) => !p)}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                </span>
              </div>

              <ul className="text-xs mb-4 space-y-0.5 list-none pl-0">
                <RequirementItem met={requirements.length} label="At least 8 characters" />
                <RequirementItem met={requirements.upper} label="One uppercase letter" />
                <RequirementItem met={requirements.lower} label="One lowercase letter" />
                <RequirementItem met={requirements.number} label="One number" />
              </ul>

              <div className="relative mb-4">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  placeholder="Confirm New Password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                >
                  <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all disabled:opacity-70 disabled:translate-y-0"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </div>
        )}

        {mode === 'success' && (
          <div className="bg-white rounded-xl p-8 shadow-2xl text-center">
            <div className="text-6xl text-green-500 mb-5">
              <i className="fas fa-check-circle" />
            </div>
            <h4 className="text-xl font-semibold mb-2">Password Reset Successful!</h4>
            <p className="text-gray-500 text-sm mb-6">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <a
              href="/admin/login"
              className="block w-full h-11 leading-[44px] bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold text-center"
            >
              <i className="fas fa-sign-in-alt mr-2" />
              Go to Login
            </a>
          </div>
        )}

        {mode === 'error' && (
          <div className="bg-white rounded-xl p-8 shadow-2xl text-center">
            <div className="text-6xl text-red-500 mb-5">
              <i className="fas fa-times-circle" />
            </div>
            <h4 className="text-xl font-semibold mb-2">Invalid or Expired Link</h4>
            <p className="text-gray-500 text-sm mb-6">{errorCardMessage}</p>
            <a
              href="/admin/login"
              className="block w-full h-11 leading-[44px] bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold text-center"
            >
              <i className="fas fa-arrow-left mr-2" />
              Back to Login
            </a>
          </div>
        )}

        {mode === 'no-token' && (
          <div className="bg-white rounded-xl p-8 shadow-2xl text-center">
            <div className="text-6xl text-red-500 mb-5">
              <i className="fas fa-exclamation-triangle" />
            </div>
            <h4 className="text-xl font-semibold mb-2">Missing Reset Token</h4>
            <p className="text-gray-500 text-sm mb-6">
              No password reset token was provided. Please use the link from your password reset
              email.
            </p>
            <a
              href="/admin/login"
              className="block w-full h-11 leading-[44px] bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold text-center"
            >
              <i className="fas fa-arrow-left mr-2" />
              Back to Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
          <div className="text-white text-xl">Loading...</div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
