"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { homeForRole } from "@/components/nav";
import { Button, Field, Input } from "@/components/ui";
import { CHURCH_NAME } from "@/lib/program";
import { DEMO_ADMIN_EMAIL, DEMO_LEAD_EMAIL, DEMO_MEMBER_EMAIL } from "@/lib/seed";
import { useStore } from "@/lib/store";

const DEMO_ACCOUNTS = [
  { label: "Member", email: DEMO_MEMBER_EMAIL, hint: "John Doe · The New Music" },
  { label: "Team Lead", email: DEMO_LEAD_EMAIL, hint: "The New Music" },
  { label: "Admin", email: DEMO_ADMIN_EMAIL, hint: "Programme oversight" },
];

export default function LoginPage() {
  const { signIn, currentUser, loading } = useStore();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && currentUser) router.replace(homeForRole(currentUser.role));
  }, [loading, currentUser, router]);

  function attemptSignIn(value: string) {
    const user = signIn(value);
    if (!user) {
      setError("We couldn't find that email or phone number. Try again or join below.");
      return;
    }
    router.replace(homeForRole(user.role));
  }

  return (
    <div className="app-aurora relative flex min-h-dvh flex-col justify-center px-5 py-10">
      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-faint">
            {CHURCH_NAME}
          </p>
          <h1 className="mt-2 text-[42px] font-extrabold leading-[1.05] tracking-tight">
            21 Days of
            <br />
            <span className="text-gradient-flame">Power</span>
          </h1>
          <p className="mt-3 text-[15px] text-muted">
            Show up. Check in. Stay accountable.
          </p>
        </div>

        <form
          className="card space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            attemptSignIn(identifier);
          }}
        >
          <Field label="Email or phone number" hint="We'll keep you signed in on this device.">
            <Input
              type="text"
              inputMode="email"
              autoComplete="username"
              placeholder="you@thenewchurch.org"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </Field>

          {error ? <p className="text-sm text-rose">{error}</p> : null}

          <Button type="submit" size="lg" fullWidth disabled={!identifier.trim()}>
            Continue
          </Button>

          <p className="text-center text-sm text-muted">
            New here?{" "}
            <Link href="/register" className="font-semibold text-flame-soft">
              Join your service team
            </Link>
          </p>
        </form>

        <div className="mt-6">
          <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
            Demo accounts
          </p>
          <div className="grid gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => attemptSignIn(account.email)}
                className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-2"
              >
                <span>
                  <span className="block text-sm font-semibold">{account.label}</span>
                  <span className="block text-xs text-faint">{account.hint}</span>
                </span>
                <span className="text-xs font-semibold text-flame-soft">Sign in</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
