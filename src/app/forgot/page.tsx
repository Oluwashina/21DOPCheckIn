"use client";

import Link from "next/link";
import { useState } from "react";

import { SetupNotice } from "@/components/SetupNotice";
import { Button, Field, Input } from "@/components/ui";
import { CHURCH_NAME } from "@/lib/program";
import { useStore } from "@/lib/store";

export default function ForgotPasswordPage() {
  const { status, sendPasswordReset } = useStore();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again.");
    } finally {
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
            Reset your <span className="text-gradient-gold">password</span>
          </h1>
        </div>

        {sent ? (
          <div className="card space-y-3 p-5 text-center">
            <h2 className="text-lg font-extrabold">Check your email</h2>
            <p className="text-sm text-muted">
              If <strong className="text-text">{email}</strong> is registered, a reset
              link is on its way. It expires in an hour.
            </p>
            <Link href="/login" className="block text-sm font-semibold text-gold-soft">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form className="card space-y-4 p-5" onSubmit={submit}>
            <Field label="Email address" hint="We'll send you a link to set a new one.">
              <Input
                autoFocus
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>

            {error ? <p className="text-sm text-rose">{error}</p> : null}

            <Button type="submit" size="lg" fullWidth disabled={busy || !email.includes("@")}>
              {busy ? "Sending…" : "Email me a reset link"}
            </Button>

            <p className="text-center text-sm text-muted">
              <Link href="/login">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
