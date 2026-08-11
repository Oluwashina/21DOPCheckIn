"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SetupNotice } from "@/components/SetupNotice";
import { Button, Field, Input, PasswordInput, Select } from "@/components/ui";
import { CHURCH_NAME } from "@/lib/program";
import { useStore } from "@/lib/store";

const MIN_PASSWORD = 8;

export default function RegisterPage() {
  const { status, teams, signUp } = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [teamId, setTeamId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "ready") router.replace("/");
  }, [status, router]);

  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !email.includes("@") || !teamId) {
      setError("Please fill in every field so your team lead can find you.");
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(`Please choose a password of at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setBusy(true);
    try {
      const needsConfirmation = await signUp(email, password, {
        name,
        phone,
        team_id: teamId,
      });
      if (needsConfirmation) setConfirmSent(true);
      else router.replace("/");
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
            Join <span className="text-gradient-gold">21 Days of Power</span>
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            A few details and you&apos;re in. Takes about 30 seconds.
          </p>
        </div>

        {confirmSent ? (
          <div className="card space-y-3 p-5 text-center">
            <h2 className="text-lg font-extrabold">Confirm your email</h2>
            <p className="text-sm text-muted">
              We sent a confirmation link to{" "}
              <strong className="text-text">{email}</strong>. Tap it and you&apos;ll be
              signed straight in.
            </p>
            <Link href="/login" className="block text-sm font-semibold text-gold-soft">
              Go to sign in
            </Link>
          </div>
        ) : (
          <form className="card space-y-4 p-5" onSubmit={submit}>
            <Field label="Full name">
              <Input
                value={name}
                autoComplete="name"
                placeholder="John Doe"
                onChange={(event) => setName(event.target.value)}
              />
            </Field>

            <Field label="Email address" hint="This is how you'll sign in.">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                placeholder="you@example.com"
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>

            <Field label="Password" hint={`At least ${MIN_PASSWORD} characters.`}>
              <PasswordInput
                autoComplete="new-password"
                value={password}
                placeholder="••••••••"
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>

            <Field label="Phone number (Optional)">
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                placeholder="+234 800 000 0000"
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>

            <Field
              label="Team"
              hint={
                sortedTeams.length === 0
                  ? "No teams yet — an admin needs to add them first."
                  : undefined
              }
            >
              <Select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
                <option value="">Select your team</option>
                {sortedTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </Select>
            </Field>

            {error ? <p className="text-sm text-rose">{error}</p> : null}

            <Button type="submit" size="lg" fullWidth disabled={busy}>
              {busy ? "Creating your profile…" : "Create my profile"}
            </Button>

            <p className="text-center text-sm text-muted">
              Already registered?{" "}
              <Link href="/login" className="font-semibold text-gold-soft">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
