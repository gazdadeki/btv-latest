// App-wide capture of the Chromium `beforeinstallprompt` event.
//
// The event fires once, early in page life — often before any React effect
// attaches, and on whichever route the user first lands (not necessarily
// /install). Capturing it as a top-level side effect of this module — which is
// loaded on every page via <PwaInstallListener /> in the root layout — means we
// never miss it, regardless of entry route or hydration timing. Components read
// the stashed event via getInstallState() and re-render via subscribeInstall().

// Chromium-only event; not yet in lib.dom typings.
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const subscribers = new Set<() => void>();

function emit() {
  for (const cb of subscribers) cb();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    emit();
  });
}

export interface InstallState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  installed: boolean;
}

export function getInstallState(): InstallState {
  return { deferredPrompt, installed };
}

/** Call after a successful/declined prompt — the event is single-use. */
export function clearDeferredPrompt() {
  deferredPrompt = null;
  emit();
}

export function subscribeInstall(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}
