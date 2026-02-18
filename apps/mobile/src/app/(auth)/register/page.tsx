'use client';

// Translated from Mobile/lib/features/auth/pages/register_page.dart
// On success → /verification

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, User, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/button';
import { validateEmail, validateUsername, validatePassword } from '@/lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [form, setForm] = useState({ email: '', username: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const emailErr = validateEmail(form.email);
    const usernameErr = validateUsername(form.username);
    const passErr = validatePassword(form.password);
    if (emailErr) newErrors.email = emailErr;
    if (usernameErr) newErrors.username = usernameErr;
    if (passErr) newErrors.password = passErr;
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await register(form.email.trim(), form.username.trim(), form.password);
      router.push('/verification');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  }

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value })),
    };
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="h-8" />
      <h1 className="text-2xl font-bold text-center text-gray-900">Create Account</h1>
      <div className="h-12" />

      <form onSubmit={handleRegister} noValidate className="flex flex-col gap-4">
        {[
          { key: 'email' as const, label: 'Email', type: 'email', icon: Mail, autoComplete: 'email' },
          { key: 'username' as const, label: 'Username', type: 'text', icon: User, autoComplete: 'username' },
          { key: 'password' as const, label: 'Password', type: 'password', icon: Lock, autoComplete: 'new-password' },
          { key: 'confirmPassword' as const, label: 'Confirm Password', type: 'password', icon: Lock, autoComplete: 'new-password' },
        ].map(({ key, label, type, icon: Icon, autoComplete }) => (
          <div key={key}>
            <div className="relative">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={type}
                placeholder={label}
                {...field(key)}
                autoComplete={autoComplete}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
          </div>
        ))}

        <div className="h-2" />

        <Button type="submit" size="full" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register'}
        </Button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 font-medium hover:text-indigo-800">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
