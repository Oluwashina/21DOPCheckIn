"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { InstallTour } from "@/components/InstallTour";
import { LogoMark } from "@/components/Logo";
import { SetupNotice } from "@/components/SetupNotice";
import { Button, Field, Input, PasswordInput } from "@/components/ui";
import {
  CHURCH_NAME,
  MINISTER_NAME,
  PROGRAM_DATE_RANGE,
  PROGRAM_NAME,
  PROGRAM_THEME,
  YOUTUBE_CHANNEL_NAME,
} from "@/lib/program";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  const { status, signIn } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "ready" || status === "needs_profile") router.replace("/");
  }, [status, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace("/");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Invalid credentials. Please check your details and try again.",
      );
      setBusy(false);
    }
  }

  if (status === "unconfigured") return <SetupNotice />;

  return (
    <div className="app-aurora relative flex min-h-dvh flex-col justify-center px-5 py-10">
      <InstallTour />
      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mb-5 flex justify-center">
            <LogoMark size={56} />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-faint">
            {CHURCH_NAME}
          </p>
          <h1 className="mt-2 text-[42px] font-extrabold leading-[1.05] tracking-tight">
            21 Days of
            <br />
            <span className="text-gradient-gold">Power</span>
          </h1>
          <p className="mt-2.5 text-[15px] font-semibold text-gold-soft">
            {PROGRAM_THEME}
          </p>
          <p className="mt-1 text-sm text-muted">{PROGRAM_DATE_RANGE}</p>
        </div>

        <form className="card space-y-4 p-5" onSubmit={submit}>
          <Field label="Email address">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <Field label="Password">
            <PasswordInput
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          {error ? <p className="text-sm text-rose">{error}</p> : null}

          <Button
            type="submit"
            size="lg"
            fullWidth
            disabled={busy || !email.includes("@") || password.length === 0}
          >
            {busy ? "Signing you in…" : "Sign in"}
          </Button>

          <div className="space-y-2 text-center text-sm">
            <p>
              <Link href="/forgot" className="text-muted">
                Forgot your password?
              </Link>
            </p>
            <p className="text-muted">
              New here?{" "}
              <Link href="/register" className="font-semibold text-gold-soft">
                Join your team
              </Link>
            </p>
          </div>
        </form>

        <div className="mt-8 overflow-hidden rounded-[1.25rem] border border-line">
          <Image
            src="/21-days-of-power-flyer.png"
            alt={`${PROGRAM_NAME}: ${PROGRAM_THEME}. ${PROGRAM_DATE_RANGE}, with ${MINISTER_NAME}.`}
            width={819}
            height={1024}
            sizes="(max-width: 480px) 100vw, 448px"
            className="h-auto w-full"
            priority
            loading="eager"
          />
        </div>

        <p className="mt-4 text-center text-xs text-faint">
          Streaming on YouTube · {YOUTUBE_CHANNEL_NAME}
        </p>
      </div>
    </div>
  );
}
