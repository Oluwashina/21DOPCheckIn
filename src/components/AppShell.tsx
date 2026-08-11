"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { CompleteProfile } from "./CompleteProfile";
import { Wordmark } from "./Logo";
import { isNavItemActive, navForRole } from "./nav";
import { Avatar, Button } from "./ui";
import { PROGRAM_LENGTH, PROGRAM_NAME } from "@/lib/program";
import { getCurrentDay } from "@/lib/stats";
import { useStore } from "@/lib/store";

const ROLE_LABEL: Record<string, string> = {
  member: "Member",
  team_lead: "Team Lead",
  admin: "Admin",
};

export function AppShell({ children }: { children: ReactNode }) {
  const { currentUser, status, db, error, clearError, signOut } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "signed_out" || status === "unconfigured") router.replace("/login");
  }, [status, router]);

  if (status === "needs_profile") return <CompleteProfile />;

  if (status === "deactivated") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5">
        <div className="card max-w-md space-y-4 p-6 text-center">
          <h1 className="text-xl font-extrabold">Your account is paused</h1>
          <p className="text-sm text-muted">
            An admin has switched your account off for now. Speak to your team lead if
            you think this is a mistake.
          </p>
          <Button variant="secondary" fullWidth onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (status !== "ready" || !currentUser || !db) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-gold" />
          <p className="text-sm text-muted">Loading {PROGRAM_NAME}…</p>
        </div>
      </div>
    );
  }

  const items = navForRole(currentUser.role);
  const currentDay = getCurrentDay(db);

  return (
    <div className="app-aurora relative min-h-dvh">
      <div className="relative z-10 mx-auto flex w-full max-w-6xl lg:gap-8 lg:px-6">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col py-8 lg:flex">
          <Link href="/" className="mb-8 block">
            <Wordmark />
          </Link>

          <nav className="flex flex-col gap-1">
            {items.map((item) => {
              const active = isNavItemActive(item, pathname);
              const ItemIcon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-semibold transition-colors ${
                    active
                      ? "bg-surface-2 text-text"
                      : "text-muted hover:bg-surface/60 hover:text-text"
                  }`}
                >
                  <ItemIcon className={active ? "text-gold" : ""} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/profile"
            className="mt-auto flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-3"
          >
            <Avatar name={currentUser.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{currentUser.name}</p>
              <p className="text-xs text-faint">{ROLE_LABEL[currentUser.role]}</p>
            </div>
          </Link>
        </aside>

        <div className="min-w-0 flex-1 pb-28 lg:pb-10">
          <header className="sticky top-0 z-20 border-b border-line/60 bg-ink/80 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Wordmark compact />
              <div className="flex items-center gap-2.5">
                <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-bold text-muted">
                  Day {currentDay.day_number}/{PROGRAM_LENGTH}
                </span>
                <Link href="/profile" aria-label="Profile">
                  <Avatar name={currentUser.name} size="sm" />
                </Link>
              </div>
            </div>
          </header>

          {error ? (
            <div className="mx-4 mt-4 flex items-start gap-3 rounded-2xl border border-rose/40 bg-rose/10 p-3.5 lg:mx-0">
              <p className="flex-1 text-sm text-text">{error}</p>
              <button
                type="button"
                onClick={clearError}
                className="shrink-0 text-xs font-bold uppercase tracking-wide text-rose"
              >
                Dismiss
              </button>
            </div>
          ) : null}

          <main className="px-4 pt-5 lg:px-0 lg:pt-8">{children}</main>
        </div>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-ink/90 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1.5">
          {items.map((item) => {
            const active = isNavItemActive(item, pathname);
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 transition-colors ${
                  active ? "text-gold" : "text-faint"
                }`}
              >
                <ItemIcon width={22} height={22} />
                <span className="truncate text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
