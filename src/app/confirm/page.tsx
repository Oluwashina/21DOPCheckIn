"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SetupNotice } from "@/components/SetupNotice";
import { Button } from "@/components/ui";
import { CHURCH_NAME, PROGRAM_NAME } from "@/lib/program";
import { useStore } from "@/lib/store";

/**
 * Where the "confirm your email" link lands. The Supabase client trades the
 * token in the URL for a session as it starts up, so by the time this settles
 * the person is signed in and can go straight to today's sessions.
 */
export default function ConfirmEmailPage() {
  const { status } = useStore();
  const router = useRouter();

  const signedIn = status === "ready" || status === "needs_profile";

  const [hasToken] = useState(() =>
    typeof window === "undefined"
      ? false
      : /(^|[?&#])(code|access_token|token_hash)=/.test(
          window.location.search + window.location.hash,
        ),
  );
  const [waiting, setWaiting] = useState(hasToken);

  useEffect(() => {
    if (!waiting) return;
    if (signedIn) {
      setWaiting(false);
      return;
    }
    const timer = window.setTimeout(() => setWaiting(false), 2500);
    return () => window.clearTimeout(timer);
  }, [signedIn, waiting]);

  useEffect(() => {
    if (status === "ready") router.replace("/");
  }, [status, router]);

  if (status === "unconfigured") return <SetupNotice />;

  const checking = status === "loading" || waiting;

  return (
    <div className="app-aurora relative flex min-h-dvh flex-col justify-center px-5 py-10">
      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="mb-7 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-faint">
            {CHURCH_NAME}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            {checking ? "Confirming your email" : signedIn ? "You're in" : "That link has expired"}
          </h1>
        </div>

        <div className="card space-y-3 p-5 text-center">
          {checking ? (
            <p className="text-sm text-muted">One moment…</p>
          ) : signedIn ? (
            <>
              <p className="text-sm text-muted">
                Your email is confirmed. Welcome to {PROGRAM_NAME}.
              </p>
              <Button size="lg" fullWidth onClick={() => router.replace("/")}>
                Go to today&apos;s sessions
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">
                Confirmation links can only be used once. Sign in with your email and
                password instead — your account is already set up.
              </p>
              <Link href="/login" className="block text-sm font-semibold text-gold-soft">
                Go to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
