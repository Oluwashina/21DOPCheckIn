"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ChevronRightIcon } from "@/components/icons";
import { Badge, Card, EmptyState, ProgressBar, SectionTitle, StatCard } from "@/components/ui";
import { formatLongDate, getSessionStatus, PROGRAM_LENGTH, shortTimeLabel } from "@/lib/program";
import {
  getCurrentDay,
  getMemberRowsForSession,
  getProgramTotals,
  getSessionsForDay,
  getTeamAttendanceRate,
  getTeamMembers,
  percent,
} from "@/lib/stats";
import { useStore } from "@/lib/store";

export default function AdminDashboardPage() {
  const { db, now } = useStore();

  const view = useMemo(() => {
    if (!db) return null;
    const day = getCurrentDay(db, now);
    const sessions = getSessionsForDay(db, day.id);
    const participants = db.users.filter((user) => user.role !== "admin" && user.active);

    return {
      day,
      totals: getProgramTotals(db, now),
      participants: participants.length,
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
  }, [db, now]);

  if (!view) return null;
  const { day, totals, participants, sessions, teams } = view;

  return (
    <div className="space-y-7 pb-4">
      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-faint">
          Programme overview
        </p>
        <h1 className="mt-1 text-[30px] font-extrabold leading-tight tracking-tight sm:text-[34px]">
          21 Days of <span className="text-gradient-flame">Power</span>
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="flame">
            Day {day.day_number} of {PROGRAM_LENGTH}
          </Badge>
          <span className="text-sm text-muted">{formatLongDate(day.date)}</span>
        </div>
      </section>

      <section>
        <div className="bg-flame-gradient glow-flame rounded-[1.25rem] p-5 text-ink">
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
          <StatCard label="Shares" value={totals.shared.toLocaleString()} tone="violet" />
          <StatCard label="Likes" value={totals.liked.toLocaleString()} tone="mint" />
        </div>
      </section>

      <section>
        <SectionTitle title="Today's sessions" />
        <div className="grid gap-2.5 sm:grid-cols-3">
          {sessions.map(({ session, status, checkedIn }) => (
            <div
              key={session.id}
              className={`card p-4 ${status === "live" ? "border-flame/45" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-faint">
                  {shortTimeLabel(session.time)}
                </span>
                <Badge
                  tone={status === "live" ? "flame" : status === "completed" ? "mint" : "violet"}
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
              className="inline-flex items-center gap-1 text-sm font-semibold text-flame-soft"
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
  );
}
