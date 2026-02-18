'use client';

// Translated from Mobile/lib/features/auth/pages/reset_password_page.dart
// Token from URL query param. Shows password requirements checklist.
// On success: show success screen with "Go to Login". On invalid token: show error screen.

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/button';
import { cn } from '@/lib/utils';

function PasswordRequirement({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {met
        ? <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
        : <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />}
      <span className={cn('text-xs', met ? 'text-indigo-600' : 'text-gray-500')}>{label}</span>
    </div>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const reqs = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  if (!token) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4 text-center">
        <XCircle className="w-16 h-16 text-red-400" />
        <h2 className="text-xl font-bold text-gray-900">Invalid Reset Link</h2>
        <p className="text-sm text-gray-500">This link is invalid or has expired. Please request a new reset.</p>
        <Button onClick={() => router.push('/forgot-password')}>Request New Reset</Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4 text-center">
        <CheckCircle className="w-16 h-16 text-indigo-600" />
        <h2 className="text-xl font-bold text-gray-900">Password Reset Successful!</h2>
        <p className="text-sm text-gray-500">You can now log in with your new password.</p>
        <Button onClick={() => router.push('/login')}>Go to Login</Button>
      </div>
    );
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!Object.values(reqs).every(Boolean)) newErrors.password = 'Password does not meet requirements';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await api.resetPassword(token!, password);
      setSuccess(true);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Reset failed' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="h-8" />
      <Lock className="w-16 h-16 text-indigo-600 mx-auto" />
      <div className="h-6" />
      <h1 className="text-2xl font-bold text-center text-gray-900">Create New Password</h1>
      <p className="text-sm text-gray-500 text-center mt-2">Enter your new password below.</p>
      <div className="h-8" />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
        </div>

        <div className="bg-gray-100 rounded-lg p-3 flex flex-col gap-1.5">
          <p className="text-xs font-medium text-gray-600 mb-1">Password Requirements:</p>
          <PasswordRequirement label="At least 8 characters" met={reqs.length} />
          <PasswordRequirement label="One uppercase letter" met={reqs.upper} />
          <PasswordRequirement label="One lowercase letter" met={reqs.lower} />
          <PasswordRequirement label="One number" met={reqs.number} />
        </div>

        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
        </div>

        {errors.submit && <p className="text-sm text-red-600 text-center">{errors.submit}</p>}

        <div className="h-2" />
        <Button type="submit" size="full" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
        </Button>
        <button type="button" onClick={() => router.push('/login')} className="text-center text-sm text-indigo-600 hover:text-indigo-800">
          Back to Login
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
