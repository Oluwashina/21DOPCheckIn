"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ChevronRightIcon,
  FlameIcon,
  GridIcon,
  LogoutIcon,
  ShieldIcon,
} from "@/components/icons";
import { Avatar, Badge, Button, Card, Field, Input, SectionTitle } from "@/components/ui";
import { getMemberProgress, getTeamById } from "@/lib/stats";
import { useStore } from "@/lib/store";

const ROLE_LABEL: Record<string, string> = {
  member: "Member",
  team_lead: "Team Lead",
  admin: "Admin",
  reports: "Reports",
};

export default function ProfilePage() {
  const { db, currentUser, now, signOut, updateUser } = useStore();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  if (!db || !currentUser) return null;

  const team = getTeamById(db, currentUser.team_id);
  const progress = getMemberProgress(db, currentUser.id, now);

  function startEditing() {
    if (!currentUser) return;
    setName(currentUser.name);
    setPhone(currentUser.phone);
    setEditing(true);
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!currentUser) return;
    await updateUser(currentUser.id, {
      name: name.trim() || currentUser.name,
      phone: phone.trim(),
    });
    setEditing(false);
  }

  const links = [
    { href: "/progress", label: "My progress", icon: FlameIcon, show: true },
    { href: "/reset", label: "Change password", icon: ShieldIcon, show: true },
    {
      href: "/team",
      label: "Team dashboard",
      icon: GridIcon,
      show: currentUser.role === "team_lead",
    },
    {
      href: "/admin",
      label: "Admin dashboard",
      icon: ShieldIcon,
      show: currentUser.role === "admin",
    },
    {
      href: "/admin/reports",
      label: "Programme reports",
      icon: GridIcon,
      show: currentUser.role === "reports",
    },
  ].filter((link) => link.show);

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-4">
      <section className="flex items-center gap-4">
        <Avatar name={currentUser.name} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight">
            {currentUser.name}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={currentUser.role === "member" ? "muted" : "magenta"}>
              {ROLE_LABEL[currentUser.role]}
            </Badge>
            {team ? <Badge tone="gold">{team.name}</Badge> : null}
          </div>
        </div>
      </section>

      <Card>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-extrabold">{progress.daysActive}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
              Days active
            </p>
          </div>
          <div>
            <p className="text-2xl font-extrabold">{progress.sessionsAttended}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
              Sessions
            </p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gradient-gold">
              {progress.streak}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
              Day streak
            </p>
          </div>
        </div>
      </Card>

      <section>
        <SectionTitle
          title="My details"
          action={
            editing ? null : (
              <button
                type="button"
                onClick={startEditing}
                className="text-sm font-semibold text-gold-soft"
              >
                Edit
              </button>
            )
          }
        />
        <Card>
          {editing ? (
            <form className="space-y-4" onSubmit={saveProfile}>
              <Field label="Full name">
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </Field>
              <Field label="Phone number">
                <Input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  placeholder="+234 800 000 0000"
                  onChange={(event) => setPhone(event.target.value)}
                />
              </Field>
              <p className="text-xs text-faint">
                Your email and service team are set by an admin. Ask your team lead if
                you need to move teams.
              </p>
              <div className="flex gap-2.5">
                <Button type="submit" fullWidth>
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <dl className="divide-y divide-line text-sm">
              {[
                { label: "Email", value: currentUser.email || "—" },
                { label: "Phone", value: currentUser.phone || "—" },
                { label: "Service team", value: team?.name ?? "Not assigned" },
                { label: "Status", value: currentUser.active ? "Active" : "Inactive" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="truncate font-semibold">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      </section>

      {links.length > 0 ? (
        <section className="space-y-2">
          {links.map((link) => {
            const LinkIcon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="card flex items-center gap-3 p-4 transition-colors hover:bg-surface-2"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-3 text-muted">
                  <LinkIcon width={18} height={18} />
                </span>
                <span className="flex-1 text-[15px] font-semibold">{link.label}</span>
                <ChevronRightIcon className="text-faint" width={18} height={18} />
              </Link>
            );
          })}
        </section>
      ) : null}

      <section>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={async () => {
            await signOut();
            router.replace("/login");
          }}
        >
          <LogoutIcon width={18} height={18} />
          Sign out
        </Button>
      </section>
    </div>
  );
}
