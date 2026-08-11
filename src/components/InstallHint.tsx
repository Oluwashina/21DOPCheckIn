"use client";

import { useEffect, useState } from "react";

import { Button } from "./ui";

const DISMISS_KEY = "21dop:install-hint:v1";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari when launched from home screen
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Mobile install hint. Android may show a native "Install" via beforeinstallprompt;
 * iOS never auto-prompts — we explain Share → Add to Home Screen instead.
 */
export function InstallHint() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || !isMobile()) return;
    if (window.localStorage.getItem(DISMISS_KEY)) return;

    setIos(isIOS());
    setVisible(true);

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-[4.75rem] z-40 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm lg:px-0">
      <div className="rounded-2xl border border-gold/30 bg-surface p-4 shadow-lg shadow-black/40">
        <p className="text-sm font-bold text-text">Add to your home screen</p>
        {ios || !installEvent ? (
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {ios ? (
              <>
                Tap <strong className="text-text">Share</strong> in Safari, then{" "}
                <strong className="text-text">Add to Home Screen</strong>. Opens like an app
                — no App Store needed.
              </>
            ) : (
              <>
                Tap your browser menu, then <strong className="text-text">Install app</strong>{" "}
                or <strong className="text-text">Add to Home screen</strong>.
              </>
            )}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted">
            Install for one-tap check-ins — opens full screen like a native app.
          </p>
        )}

        <div className="mt-3 flex gap-2">
          {installEvent ? (
            <Button size="sm" onClick={() => void install()}>
              Install app
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" onClick={dismiss}>
            {installEvent ? "Not now" : "Got it"}
          </Button>
        </div>
      </div>
    </div>
  );
}
