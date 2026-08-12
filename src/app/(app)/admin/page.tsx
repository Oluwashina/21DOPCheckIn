"use client";

import Link from "next/link";
import { useMemo } from "react";

import { AdminOnly } from "@/components/AdminOnly";
import { ChevronRightIcon } from "@/components/icons";
import { Badge, Card, EmptyState, ProgressBar, SectionTitle, StatCard } from "@/components/ui";
import { formatLongDate, getSessionStatus, PROGRAM_LENGTH, shortTimeLabel } from "@/lib/program";
import {
  findCheckIn,
  getCurrentDay,
  getMemberProgress,
  getMemberRowsForSession,
  getParticipants,
  getProgramTotals,
  getSessionsForDay,
  getTeamAttendanceRate,
  getTeamMembers,
  percent,
} from "@/lib/stats";
import { useStore } from "@/lib/store";

export default function AdminDashboardPage() {
  const { db, currentUser, now } = useStore();

  const view = useMemo(() => {
    if (!db || !currentUser) return null;
    const day = getCurrentDay(db, now);
    const sessions = getSessionsForDay(db, day.id);
    const participants = getParticipants(db);

    return {
      day,
      totals: getProgramTotals(db, now),
      participants: participants.length,
      myProgress: getMemberProgress(db, currentUser.id, now),
      mySessionsToday: sessions.filter(
        (session) => findCheckIn(db, currentUser.id, session.id)?.checked_in,
      ).length,
      sessions: sessions.map((session) => ({
        session,
        status: getSessionStatus(day, session, now),
        checkedIn: getMemberRowsForSession(db, participants, session.id).filter(
          (row) => row.checked_in,
        ).length,
      })),
      teams: db.teams
        .map((team) => ({
          team,
          members: getTeamMembers(db, team.id).filter((user) => user.active).length,
          rate: getTeamAttendanceRate(db, team.id, now),
        }))
        .sort((a, b) => b.rate - a.rate),
    };
  }, [db, currentUser, now]);

  if (!view) return null;
  const { day, totals, participants, sessions, teams, myProgress, mySessionsToday } = view;
  const elapsedToday = sessions.filter((item) => item.status !== "upcoming").length;

  return (
    <AdminOnly>
    <div className="space-y-7 pb-4">
      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-faint">
          Programme overview
        </p>
        <h1 className="mt-1 text-[30px] font-extrabold leading-tight tracking-tight sm:text-[34px]">
          21 Days of <span className="text-gradient-gold">Power</span>
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="gold">
            Day {day.day_number} of {PROGRAM_LENGTH}
          </Badge>
          <span className="text-sm text-muted">{formatLongDate(day.date)}</span>
        </div>
      </section>

      <section>
        <SectionTitle title="Your own check-in" subtitle="You're in this too." />
        <Link href="/" className="card block p-4 transition-colors hover:bg-surface-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-2xl font-extrabold tracking-tight">
                {mySessionsToday}
                <span className="text-muted"> / {Math.max(elapsedToday, 1)}</span>
              </p>
              <p className="mt-0.5 text-sm text-muted">
                sessions checked in today · {myProgress.daysActive}/{PROGRAM_LENGTH} days
                overall
              </p>
            </div>
            <ChevronRightIcon className="text-faint" />
          </div>
          <div className="mt-3">
            <ProgressBar value={percent(mySessionsToday, Math.max(elapsedToday, 1))} />
          </div>
        </Link>
      </section>

      <section>
        <div className="bg-gold-gradient glow-gold rounded-[1.25rem] p-5 text-ink">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/70">
            Overall attendance
          </p>
          <p className="mt-1 text-5xl font-extrabold tracking-tight">
            {totals.attendanceRate}%
          </p>
          <p className="mt-1.5 text-sm text-ink/75">
            {participants} people across {teams.length} service teams
          </p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <StatCard label="Check-ins" value={totals.checkedIn.toLocaleString()} />
          <StatCard label="Shares" value={totals.shared.toLocaleString()} tone="magenta" />
          <StatCard label="Likes" value={totals.liked.toLocaleString()} tone="mint" />
        </div>
      </section>

      <section>
        <SectionTitle
          title="Today's sessions"
          action={
            <Link
              href="/admin/sessions"
              className="inline-flex items-center gap-1 text-sm font-semibold text-gold-soft"
            >
              All sessions
              <ChevronRightIcon width={14} height={14} />
            </Link>
          }
        />
        <div className="grid gap-2.5 sm:grid-cols-3">
          {sessions.map(({ session, status, checkedIn }) => (
            <div
              key={session.id}
              className={`card p-4 ${status === "live" ? "border-gold/45" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-faint">
                  {shortTimeLabel(session.time)}
                </span>
                <Badge
                  tone={status === "live" ? "gold" : status === "completed" ? "mint" : "magenta"}
                >
                  {status === "live" ? "Live" : status === "completed" ? "Completed" : "Upcoming"}
                </Badge>
              </div>
              <p className="mt-2 text-[15px] font-bold leading-snug">{session.name}</p>
              <p className="mt-2 text-sm text-muted">
                <span className="font-bold text-text">{checkedIn}</span>/{participants}{" "}
                checked in
              </p>
              <div className="mt-2.5">
                <ProgressBar value={percent(checkedIn, participants)} height="h-1.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Team performance"
          subtitle="Attendance across the whole programme"
          action={
            <Link
              href="/admin/teams"
              className="inline-flex items-center gap-1 text-sm font-semibold text-gold-soft"
            >
              Manage
              <ChevronRightIcon width={14} height={14} />
            </Link>
          }
        />
        {teams.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No teams yet"
            description="Create your first service team to get started."
          />
        ) : (
          <Card className="space-y-3.5">
            {teams.map(({ team, members, rate }) => (
              <div key={team.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-semibold">{team.name}</span>
                  <span className="shrink-0 text-xs text-faint">
                    {members} members ·{" "}
                    <span className="font-bold text-text">{rate}%</span>
                  </span>
                </div>
                <ProgressBar value={rate} height="h-2" />
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
    </AdminOnly>
  );
}
