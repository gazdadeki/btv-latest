// Client-only platform detection for PWA install UX.
// Every helper guards `typeof navigator/window` so it is import-safe in shared
// code, but only returns meaningful values in the browser.

function ua(): string {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent || "";
}

/** True when the app is running as an installed PWA (no browser chrome). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const displayModeStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  // iOS exposes the non-standard navigator.standalone for home-screen apps.
  const iosStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayModeStandalone || iosStandalone;
}

/** iPhone/iPod/iPad — including iPadOS which reports as desktop Safari. */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const s = ua();
  return (
    /iPad|iPhone|iPod/.test(s) ||
    (/Macintosh/.test(s) && navigator.maxTouchPoints > 1)
  );
}

export function isAndroid(): boolean {
  return /Android/.test(ua());
}

/** Real Safari, excluding Chrome/Firefox/Edge which embed "Safari" in their UA. */
export function isSafari(): boolean {
  const s = ua();
  return (
    /Safari/.test(s) && !/CriOS|FxiOS|EdgiOS|Chrome|Chromium|Android/.test(s)
  );
}
