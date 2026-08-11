"use client";

import { useState } from "react";

import { Button, Field, Input, Select } from "@/components/ui";
import { PROGRAM_NAME } from "@/lib/program";
import { useStore } from "@/lib/store";

/**
 * Signed in, but there is no profile row — the sign-up was interrupted, or an
 * admin removed them and they came back. One form and they are on their feet.
 */
export function CompleteProfile() {
  const { teams, completeProfile, signOut } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [teamId, setTeamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !teamId) {
      setError("Please add your name and pick your service team.");
      return;
    }

    setBusy(true);
    try {
      await completeProfile({ name, phone, team_id: teamId });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="app-aurora relative flex min-h-dvh flex-col justify-center px-5 py-10">
      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Finish setting up
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            We just need your name and team to add you to {PROGRAM_NAME}.
          </p>
        </div>

        <form className="card space-y-4 p-5" onSubmit={submit}>
          <Field label="Full name">
            <Input
              autoFocus
              value={name}
              autoComplete="name"
              placeholder="John Doe"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field label="Phone number" hint="Optional — so your lead can reach you.">
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              placeholder="+234 800 000 0000"
              onChange={(event) => setPhone(event.target.value)}
            />
          </Field>

          <Field label="Service team">
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
            {busy ? "Setting you up…" : "Let's go"}
          </Button>

          <button
            type="button"
            className="w-full text-center text-sm text-muted"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
