"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Field, Input, Select } from "@/components/ui";
import { CHURCH_NAME } from "@/lib/program";
import { useStore } from "@/lib/store";

export default function RegisterPage() {
  const { db, register } = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const teams = [...(db?.teams ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const looksLikeEmail = contact.includes("@");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !contact.trim() || !teamId) {
      setError("Please fill in every field so your team lead can find you.");
      return;
    }

    const taken = db?.users.some(
      (user) =>
        user.email.toLowerCase() === contact.trim().toLowerCase() ||
        user.phone.replace(/\s/g, "") === contact.replace(/\s/g, ""),
    );
    if (taken) {
      setError("That contact is already registered. Try signing in instead.");
      return;
    }

    setSubmitting(true);
    await register({
      name,
      email: looksLikeEmail ? contact : "",
      phone: looksLikeEmail ? "" : contact,
      team_id: teamId,
    });
    router.replace("/");
  }

  return (
    <div className="app-aurora relative flex min-h-dvh flex-col justify-center px-5 py-10">
      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="mb-7 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-faint">
            {CHURCH_NAME}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            Join <span className="text-gradient-flame">21 Days of Power</span>
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            Three details and you&apos;re in. Takes about 20 seconds.
          </p>
        </div>

        <form className="card space-y-4 p-5" onSubmit={handleSubmit}>
          <Field label="Full name">
            <Input
              value={name}
              autoComplete="name"
              placeholder="John Doe"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field label="Email or phone number">
            <Input
              value={contact}
              autoComplete="username"
              placeholder="you@thenewchurch.org"
              onChange={(event) => setContact(event.target.value)}
            />
          </Field>

          <Field label="Service team">
            <Select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
              <option value="">Select your team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </Field>

          {error ? <p className="text-sm text-rose">{error}</p> : null}

          <Button type="submit" size="lg" fullWidth disabled={submitting}>
            {submitting ? "Creating your profile…" : "Create my profile"}
          </Button>

          <p className="text-center text-sm text-muted">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-flame-soft">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
