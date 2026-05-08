"use client";

// 6-digit OTP input with auto-advance, cooldown timer for resend, verify on complete

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/button";

const CODE_LENGTH = 6;

export default function VerificationPage() {
  const router = useRouter();
  const { refreshUser, logout } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);

  const startCooldown = useCallback((seconds: number) => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldownSeconds(seconds);
    cooldownRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(
    () => () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    },
    [],
  );

  async function requestCode() {
    if (cooldownSeconds > 0) return;
    setIsRequestingCode(true);
    try {
      await api.requestVerification();
      toast.success("Verification code sent to your email");
      startCooldown(60);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send code";
      const match = msg.match(/wait (\d+) seconds/);
      if (match) startCooldown(parseInt(match[1], 10));
      toast.error(msg);
    } finally {
      setIsRequestingCode(false);
    }
  }

  async function submitCode(codeDigits: string[]) {
    if (submittingRef.current) return;
    const code = codeDigits.join("");
    if (code.length !== CODE_LENGTH) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }
    submittingRef.current = true;
    setIsLoading(true);
    try {
      await api.verifyEmail(code);
      await refreshUser();
      router.replace("/home");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
      submittingRef.current = false;
    }
  }

  function handleChange(index: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newDigits.every((d) => d !== "") && char) {
      setTimeout(() => submitCode(newDigits), 100);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);
    const newDigits = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setDigits(newDigits);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    if (newDigits.every((d) => d !== "")) {
      setTimeout(() => submitCode(newDigits), 100);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="h-8" />
      <h1 className="text-2xl font-bold text-center text-[#f0f0f0]">
        Verify your email
      </h1>
      <p className="text-sm text-[#8a8a8a] text-center mt-2">
        Enter the 6-digit code sent to your email.
      </p>
      <div className="h-12" />

      <div className="flex gap-2 justify-center mb-8">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className="auth-input w-11 h-14 text-center text-xl font-bold"
          />
        ))}
      </div>

      <Button
        onClick={() => submitCode(digits)}
        size="full"
        disabled={isLoading || digits.some((d) => !d)}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
      </Button>

      <div className="mt-4 text-center flex flex-col gap-2">
        <button
          onClick={requestCode}
          disabled={cooldownSeconds > 0 || isRequestingCode}
          className="auth-link text-sm disabled:text-[#4a4a4a] disabled:cursor-not-allowed"
        >
          {isRequestingCode
            ? "Sending..."
            : cooldownSeconds > 0
              ? `Resend code in ${cooldownSeconds}s`
              : "Resend code"}
        </button>
        <button
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          className="text-sm text-[#8a8a8a] hover:text-[#c0c0c0]"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
