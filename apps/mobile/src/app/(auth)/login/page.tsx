"use client";

// Translated from Mobile/lib/features/auth/pages/login_page.dart
// Logic: post-login check isVerified → /verification, isAuthenticated → /home

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/button";
import { validateRequired, validatePassword } from "@/lib/utils";

export default function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const emailErr = validateRequired(email, "Email or Username");
    const passErr = validatePassword(password);
    if (emailErr) newErrors.email = emailErr;
    if (passErr) newErrors.password = passErr;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const user = await login(email.trim(), password);

      // Hard navigation (matches the web admin pattern): avoids the Next.js
      // router cache returning a stale pre-auth redirect, and the 50ms delay
      // gives the browser time to commit the Set-Cookie from the login response.
      await new Promise((r) => setTimeout(r, 50));
      window.location.href = user.isVerified ? "/home" : "/verification";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="h-8" />
      <h1 className="text-2xl font-bold text-center text-[#f0f0f0]">
        Welcome Back
      </h1>
      <div className="h-12" />

      <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
        <div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6a6a]" />
            <input
              type="text"
              placeholder="Email or Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input pl-10 pr-3 py-2.5 text-sm"
              autoComplete="username"
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6a6a]" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input pl-10 pr-3 py-2.5 text-sm"
              autoComplete="current-password"
            />
          </div>
          {errors.password && (
            <p className="text-xs text-red-500 mt-1">{errors.password}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="auth-link text-sm">
            Forgot Password?
          </Link>
        </div>

        <div className="h-2" />

        <Button type="submit" size="full" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Login"}
        </Button>

        <p className="text-center text-sm text-[#8a8a8a]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="auth-link font-medium">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
