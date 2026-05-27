"use client";

import { useEffect } from "react";
import { subscribeInstall } from "@/lib/pwa-install";

// Mounted once in the root layout. Its only job is to pull in `@/lib/pwa-install`
// on every page's first client load, so that module's top-level
// `beforeinstallprompt` capture runs app-wide — before any route-specific
// component (e.g. the /install page) mounts. Renders nothing.
export function PwaInstallListener() {
  // Referencing subscribeInstall keeps the side-effectful import from being
  // tree-shaken; the no-op subscription is cleaned up on unmount.
  useEffect(() => subscribeInstall(() => {}), []);
  return null;
}
