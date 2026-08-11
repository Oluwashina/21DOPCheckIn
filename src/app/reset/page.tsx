"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SetupNotice } from "@/components/SetupNotice";
import { Button, Field, PasswordInput } from "@/components/ui";
import { CHURCH_NAME } from "@/lib/program";
import { useStore } from "@/lib/store";

const MIN_PASSWORD = 8;

/**
 * Where the reset email lands. The Supabase client reads the recovery token
 * out of the URL on load, which signs the person in just long enough to set a
 * new password.
 */
export default function ResetPasswordPage() {
  const { status, updatePassword } = useStore();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signedIn = status === "ready" || status === "needs_profile";

  // The client swaps the token in the URL for a session as it starts up. Wait
  // for that before deciding a link is dead.
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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD) {
      setError(`Please choose a password of at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setBusy(true);
    try {
      await updatePassword(password);
      router.replace("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again.");
      setBusy(false);
    }
  }

  if (status === "unconfigured") return <SetupNotice />;

  return (
    <div className="app-aurora relative flex min-h-dvh flex-col justify-center px-5 py-10">
      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="mb-7 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-faint">
            {CHURCH_NAME}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            Choose a new <span className="text-gradient-gold">password</span>
          </h1>
        </div>

        {status === "loading" || waiting ? (
          <div className="card p-5 text-center text-sm text-muted">Checking your link…</div>
        ) : signedIn ? (
          <form className="card space-y-4 p-5" onSubmit={submit}>
            <Field label="New password" hint={`At least ${MIN_PASSWORD} characters.`}>
              <PasswordInput
                autoFocus
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>

            {error ? <p className="text-sm text-rose">{error}</p> : null}

            <Button type="submit" size="lg" fullWidth disabled={busy}>
              {busy ? "Saving…" : "Save and continue"}
            </Button>
          </form>
        ) : (
          <div className="card space-y-3 p-5 text-center">
            <h2 className="text-lg font-extrabold">That link has expired</h2>
            <p className="text-sm text-muted">
              Reset links last an hour and can only be used once. Ask for a fresh one.
            </p>
            <Link href="/forgot" className="block text-sm font-semibold text-gold-soft">
              Send another link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
