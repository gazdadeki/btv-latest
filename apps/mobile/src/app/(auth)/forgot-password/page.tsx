'use client';

// Translated from Mobile/lib/features/auth/pages/forgot_password_page.dart
// On success: show success message inline, do NOT navigate

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/button';
import { validateEmail } from '@/lib/utils';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) { setEmailError(err); return; }
    setEmailError('');
    setIsLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4 text-center">
        <CheckCircle className="w-16 h-16 text-green-500" />
        <h2 className="text-xl font-bold text-gray-900">Check your email</h2>
        <p className="text-sm text-gray-500">
          If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
        </p>
        <Link href="/login" className="text-indigo-600 text-sm font-medium hover:text-indigo-800">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="h-8" />
      <h1 className="text-2xl font-bold text-center text-gray-900">Forgot Password</h1>
      <p className="text-sm text-gray-500 text-center mt-2">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <div className="h-12" />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
        </div>

        <Button type="submit" size="full" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
        </Button>

        <Link href="/login" className="text-center text-sm text-indigo-600 hover:text-indigo-800">
          Back to Login
        </Link>
      </form>
    </div>
  );
}
