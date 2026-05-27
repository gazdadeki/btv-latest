import type { Metadata } from "next";

// Offline fallback document (wired via next.config `fallbacks.document`).
// Must be fully self-contained: no client hooks, no API/auth calls — it renders
// with zero network. Ungated in middleware so it never tries to redirect.
export const metadata: Metadata = {
  title: "Offline — BaltazarTV",
};

export default function OfflinePage() {
  return (
    <div className="page-dark flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt=""
        width={72}
        height={72}
        className="mb-5 rounded-2xl opacity-80"
      />
      <h1 className="font-title text-xl text-[#f0f0f0]">You&apos;re offline</h1>
      <p className="mt-2 max-w-xs text-sm text-[#c0b8a8]">
        We can&apos;t reach the server right now. Check your connection and try
        again.
      </p>
      <a
        href="/home"
        className="btn-dark-secondary mt-6 inline-flex min-h-[44px] items-center justify-center rounded-md px-5 text-sm"
      >
        Try again
      </a>
    </div>
  );
}
