"use client";

import { useEffect, useState } from "react";

import {
  dismissInstallTour,
  getInstallGuide,
  getInstallPlatform,
  isInstallTourDismissed,
  isStandalone,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa";

import { Button } from "./ui";

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

/**
 * Mobile install hint after sign-in. Android may show a native "Install" via
 * beforeinstallprompt; iOS never auto-prompts — we explain Share → Add to Home Screen.
 */
export function InstallHint() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState(getInstallPlatform());
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || !isMobile()) return;
    if (isInstallTourDismissed()) return;

    setPlatform(getInstallPlatform());
    setVisible(true);

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    dismissInstallTour();
    setVisible(false);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    dismiss();
  }

  if (!visible) return null;

  const guide = getInstallGuide(platform);
  const summary = guide.steps[0];

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-[4.75rem] z-40 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm lg:px-0">
      <div className="rounded-2xl border border-gold/30 bg-surface p-4 shadow-lg shadow-black/40">
        <p className="text-sm font-bold text-text">Add to your home screen</p>
        {installEvent ? (
          <p className="mt-1 text-xs text-muted">
            Install for one-tap check-ins. Opens full screen like a native app.
          </p>
        ) : (
          <p className="mt-1 text-xs leading-relaxed text-muted">{summary}</p>
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
