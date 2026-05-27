import type { Metadata } from "next";
import { InstallPrompt } from "@/components/install-prompt";

// Public, unauthenticated landing/install page for the player PWA.
// The shareable "download link" in production is simply https://app.<domain>/install
// (a QR code pointing here can be added later).
export const metadata: Metadata = {
  title: "Install BaltazarTV",
  description: "Install the BaltazarTV player app on your phone.",
};

export default function InstallPage() {
  return (
    <div className="flex w-full flex-col items-center text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt="BaltazarTV"
        width={96}
        height={96}
        className="mb-5 rounded-2xl shadow-lg shadow-black/40"
      />
      <h1 className="font-title text-2xl text-[#f0f0f0]">BaltazarTV</h1>
      <p className="mt-2 mb-8 text-sm text-[#c0b8a8]">
        Install the app for the full-screen player experience — quick launch
        from your home screen, no browser bar.
      </p>

      <div className="w-full">
        <InstallPrompt />
      </div>
    </div>
  );
}
