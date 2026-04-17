"use client";

import { AuthProvider } from "@/lib/auth-context";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="page-dark min-h-screen flex flex-col">
        <main className="flex-1 flex flex-col max-w-lg mx-auto w-full">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
