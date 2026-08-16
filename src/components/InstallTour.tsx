"use client";

import { useEffect, useMemo, useState } from "react";

import { PROGRAM_NAME } from "@/lib/program";
import {
  dismissInstallTour,
  getInstallGuide,
  getInstallPlatform,
  isInstallTourDismissed,
  isStandalone,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa";

import { Button } from "./ui";

const STEPS = ["welcome", "how-to"] as const;
type TourStep = (typeof STEPS)[number];

/**
 * Short, dismissible tour on login/register for adding the PWA to the home screen.
 * Browser-specific steps; Android Chrome may offer a one-tap Install when supported.
 */
export function InstallTour() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [showReopen, setShowReopen] = useState(false);
  const [step, setStep] = useState<TourStep>("welcome");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  const platform = useMemo(() => (mounted ? getInstallPlatform() : "other"), [mounted]);
  const guide = useMemo(() => getInstallGuide(platform), [platform]);
  const stepIndex = STEPS.indexOf(step);
  const isLastStep = stepIndex === STEPS.length - 1;

  useEffect(() => {
    setMounted(true);
    if (isStandalone()) return;

    const dismissed = isInstallTourDismissed();
    setShowReopen(dismissed);
    if (!dismissed) setOpen(true);

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function closeTour(persist = true) {
    setOpen(false);
    if (persist) {
      dismissInstallTour();
      setShowReopen(true);
    }
  }

  function reopenTour() {
    setStep("welcome");
    setOpen(true);
    setShowReopen(false);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    closeTour(true);
  }

  if (!mounted || isStandalone()) return null;

  return (
    <>
      {showReopen && !open ? (
        <button
          type="button"
          onClick={reopenTour}
          className="fixed right-4 top-4 z-40 flex items-center gap-2 rounded-full border border-gold/35 bg-surface/95 px-3.5 py-2 text-xs font-semibold text-gold-soft shadow-lg shadow-black/30 backdrop-blur-sm transition-colors hover:border-gold/60 hover:text-text"
        >
          <span aria-hidden className="text-base leading-none">
            📱
          </span>
          Add to home screen
        </button>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-tour-title"
        >
          <div className="card relative w-full max-w-md p-5 shadow-2xl shadow-black/50">
            <button
              type="button"
              aria-label="Close"
              onClick={() => closeTour(true)}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl text-xl leading-none text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              ×
            </button>

            <div className="mb-4 flex justify-center gap-1.5 pt-1">
              {STEPS.map((item, index) => (
                <span
                  key={item}
                  className={[
                    "h-1.5 rounded-full transition-all duration-200",
                    index === stepIndex ? "w-6 bg-gold" : "w-1.5 bg-line",
                  ].join(" ")}
                />
              ))}
            </div>

            {step === "welcome" ? (
              <div className="space-y-4 pr-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-faint">
                    Quick setup
                  </p>
                  <h2
                    id="install-tour-title"
                    className="mt-1.5 text-[22px] font-extrabold leading-tight tracking-tight"
                  >
                    Add {PROGRAM_NAME} to your home screen
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    One tap to check in. Opens full screen like a real app. No App Store or
                    Play Store download.
                  </p>
                </div>

                <ul className="space-y-2.5 text-sm text-muted">
                  <li className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-gold" aria-hidden>
                      ✓
                    </span>
                    <span>Faster sign-in every session</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-gold" aria-hidden>
                      ✓
                    </span>
                    <span>Works on iPhone, Android, and most browsers</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-gold" aria-hidden>
                      ✓
                    </span>
                    <span>Takes about 15 seconds. We&apos;ll show you how.</span>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="space-y-4 pr-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-faint">
                    {guide.browserLabel}
                  </p>
                  <h2 className="mt-1.5 text-[22px] font-extrabold leading-tight tracking-tight">
                    Follow these steps
                  </h2>
                </div>

                <ol className="space-y-3">
                  {guide.steps.map((text, index) => (
                    <li key={text} className="flex gap-3 text-sm leading-relaxed text-muted">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold-soft">
                        {index + 1}
                      </span>
                      <span className="pt-0.5">{text}</span>
                    </li>
                  ))}
                </ol>

                {installEvent ? (
                  <p className="rounded-2xl border border-gold/25 bg-gold/5 px-3.5 py-2.5 text-xs text-muted">
                    Your browser supports one-tap install. Use the button below if you
                    prefer.
                  </p>
                ) : null}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {stepIndex > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setStep(STEPS[stepIndex - 1])}
                >
                  Back
                </Button>
              ) : null}

              {!isLastStep ? (
                <Button
                  type="button"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setStep(STEPS[stepIndex + 1])}
                >
                  Show me how
                </Button>
              ) : (
                <>
                  {installEvent ? (
                    <Button type="button" size="sm" onClick={() => void install()}>
                      Install now
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant={installEvent ? "secondary" : "primary"}
                    className={installEvent ? "" : "ml-auto"}
                    onClick={() => closeTour(true)}
                  >
                    Got it
                  </Button>
                </>
              )}

              {!isLastStep ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => closeTour(true)}>
                  Maybe later
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
