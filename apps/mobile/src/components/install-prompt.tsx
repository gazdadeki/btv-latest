"use client";

import { useEffect, useState } from "react";
import { Download, Plus, Share } from "lucide-react";
import { Button } from "@/components/button";
import { isIOS, isSafari, isStandalone } from "@/lib/platform";
import {
  clearDeferredPrompt,
  getInstallState,
  subscribeInstall,
} from "@/lib/pwa-install";

type IosMode = "none" | "safari" | "other";

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#c9a84c] text-xs font-bold text-[#1a1816]">
      {n}
    </span>
  );
}

/**
 * Platform-aware install affordance.
 * - Chromium (Android/desktop): shows a native "Install app" button, driven by
 *   the app-wide `beforeinstallprompt` capture in `@/lib/pwa-install`.
 * - iOS Safari: shows manual "Add to Home Screen" steps (no event on iOS).
 * - Other iOS browsers / in-app webviews: tells the user to open in Safari.
 * - Already installed (standalone): renders nothing.
 */
export function InstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);
  const [iosMode, setIosMode] = useState<IosMode>("none");

  useEffect(() => {
    setMounted(true);
    if (isIOS()) setIosMode(isSafari() ? "safari" : "other");
    // Re-render whenever the global install state changes (event captured later).
    return subscribeInstall(() => setTick((t) => t + 1));
  }, []);

  // SSR + first client render render nothing — avoids hydration mismatch and
  // lets browser-only checks (standalone, store state) run only after mount.
  if (!mounted) return null;
  if (isStandalone()) return null;

  const { deferredPrompt, installed } = getInstallState();
  if (installed) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    clearDeferredPrompt();
  };

  // Chromium (Android/desktop): native install available.
  if (deferredPrompt) {
    return (
      <Button variant="gold" size="full" onClick={handleInstall}>
        <Download className="size-5" />
        Install app
      </Button>
    );
  }

  // iOS Safari: manual Add to Home Screen steps.
  if (iosMode === "safari") {
    return (
      <div className="panel-dark p-4 text-sm text-[#c0b8a8]">
        <p className="mb-3 font-medium text-[#f0f0f0]">
          Install on your iPhone or iPad
        </p>
        <ol className="space-y-3">
          <li className="flex items-center gap-3">
            <StepBadge n={1} />
            <span>
              Tap the{" "}
              <Share className="inline size-4 align-text-bottom text-[#2a9d8f]" />{" "}
              Share button in Safari
            </span>
          </li>
          <li className="flex items-center gap-3">
            <StepBadge n={2} />
            <span>
              Choose{" "}
              <span className="font-medium text-[#f0f0f0]">
                Add to Home Screen
              </span>{" "}
              <Plus className="inline size-4 align-text-bottom text-[#2a9d8f]" />
            </span>
          </li>
          <li className="flex items-center gap-3">
            <StepBadge n={3} />
            <span>
              Tap <span className="font-medium text-[#f0f0f0]">Add</span> —
              done!
            </span>
          </li>
        </ol>
      </div>
    );
  }

  // iOS but not Safari (iOS Chrome, in-app webviews): Add to Home Screen isn't
  // available here — point the user to Safari instead of showing wrong steps.
  if (iosMode === "other") {
    return (
      <div className="panel-dark p-4 text-sm text-[#c0b8a8]">
        <p className="font-medium text-[#f0f0f0]">Install on iPhone or iPad</p>
        <p className="mt-2">
          Open this page in{" "}
          <span className="font-medium text-[#f0f0f0]">Safari</span>, then tap{" "}
          <Share className="inline size-4 align-text-bottom text-[#2a9d8f]" />{" "}
          Share →{" "}
          <span className="font-medium text-[#f0f0f0]">Add to Home Screen</span>
          .
        </p>
      </div>
    );
  }

  return null;
}
