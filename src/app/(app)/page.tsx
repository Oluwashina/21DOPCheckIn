"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { ChevronRightIcon, FlameIcon } from "@/components/icons";
import { SessionCard } from "@/components/SessionCard";
import { Badge, Card, ProgressBar, SectionTitle } from "@/components/ui";
import {
  formatLongDate,
  getSessionStatus,
  PROGRAM_LENGTH,
  PROGRAM_THEME,
} from "@/lib/program";
import {
  findCheckIn,
  getCurrentDay,
  getMemberProgress,
  getMemberRowsForSession,
  getNextProgramDay,
  getSessionsForDay,
  getTeamById,
  getTeamMembers,
  getTeamStatsForDay,
  isRestDay,
  percent,
} from "@/lib/stats";
import { useStore } from "@/lib/store";

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { db, currentUser, now } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (currentUser?.role === "admin") router.replace("/admin");
  }, [currentUser, router]);

  const view = useMemo(() => {
    if (!db || !currentUser) return null;

    const day = getCurrentDay(db, now);
    const sessions = getSessionsForDay(db, day.id);
    const team = getTeamById(db, currentUser.team_id);
    const teamMembers = team ? getTeamMembers(db, team.id).filter((u) => u.active) : [];
    const isLead = currentUser.role === "team_lead" || currentUser.role === "admin";

    return {
      day,
      team,
      restDay: isRestDay(db, now),
      nextDay: getNextProgramDay(db, now),
      teamToday: team ? getTeamStatsForDay(db, team.id, day.id) : null,
      progress: getMemberProgress(db, currentUser.id, now),
      sessions: sessions.map((session) => ({
        session,
        status: getSessionStatus(day, session, now),
        checkIn: findCheckIn(db, currentUser.id, session.id),
        teamSummary:
          isLead && team
            ? `${
                getMemberRowsForSession(db, teamMembers, session.id).filter(
                  (row) => row.checked_in,
                ).length
              }/${teamMembers.length} of ${team.name} checked in`
            : undefined,
      })),
    };
  }, [db, currentUser, now]);

  if (!view || !currentUser) return null;

  const { day, progress, sessions, team, teamToday, restDay, nextDay } = view;
  const live = sessions.find((item) => item.status === "live");
  const nextUp = sessions.find((item) => item.status === "upcoming");
  const doneToday = sessions.filter((item) => item.checkIn?.checked_in).length;
  const elapsedToday = sessions.filter((item) => item.status !== "upcoming").length;

  const nudge = live
    ? `${live.session.name} is live right now.`
    : nextUp
      ? `Next up: ${nextUp.session.name}.`
      : doneToday === sessions.length
        ? "All three sessions done today. Incredible."
        : "That's a wrap on today's sessions.";

  return (
    <div className="space-y-7 pb-4">
      <section>
        <p className="text-sm text-muted">
          {greeting(now)}, {currentUser.name.split(" ")[0]}
        </p>
        <h1 className="mt-1 text-[34px] font-extrabold leading-[1.05] tracking-tight sm:text-[40px]">
          {restDay ? (
            <>
              Rest day <span className="text-muted">🌿</span>
            </>
          ) : (
            <>
              Day {day.day_number} <span className="text-muted">of {PROGRAM_LENGTH}</span>
            </>
          )}
        </h1>
        <p className="mt-1.5 text-sm font-semibold text-flame-soft">{PROGRAM_THEME}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{formatLongDate(day.date)}</span>
          {progress.streak > 0 ? (
            <Badge tone="flame">
              <FlameIcon width={12} height={12} />
              {progress.streak}-day streak
            </Badge>
          ) : null}
          {team ? <Badge tone="muted">{team.name}</Badge> : null}
        </div>
      </section>

      {restDay ? (
        <Card>
          <p className="text-[15px] font-semibold">No sessions today — take a breath.</p>
          <p className="mt-1 text-sm text-muted">
            Sessions run Monday to Friday.{" "}
            {nextDay
              ? `Day ${nextDay.day_number} picks up on ${formatLongDate(nextDay.date)}.`
              : `That's a wrap on all ${PROGRAM_LENGTH} days. Well done. 🔥`}
          </p>
          <p className="mt-2 text-sm text-muted">
            Missed something? You can still catch up on Day {day.day_number} below.
          </p>
        </Card>
      ) : null}

      <section>
        <SectionTitle
          title={restDay ? `Day ${day.day_number} · catch up` : "Today's sessions"}
          subtitle={
            restDay
              ? formatLongDate(day.date)
              : `${doneToday} of ${Math.max(elapsedToday, 1)} checked in so far`
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((item) => (
            <SessionCard
              key={item.session.id}
              session={item.session}
              status={item.status}
              checkIn={item.checkIn}
              teamSummary={item.teamSummary}
            />
          ))}
        </div>
        {restDay ? null : <p className="mt-3 text-sm text-muted">{nudge} 🔥</p>}
      </section>

      <section>
        <SectionTitle
          title="My progress"
          action={
            <Link
              href="/progress"
              className="inline-flex items-center gap-1 text-sm font-semibold text-flame-soft"
            >
              View all
              <ChevronRightIcon width={14} height={14} />
            </Link>
          }
        />
        <Card>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-extrabold tracking-tight">
                {progress.daysActive}
                <span className="text-muted"> / {PROGRAM_LENGTH}</span>
              </p>
              <p className="mt-0.5 text-sm text-muted">days you&apos;ve shown up</p>
            </div>
            <p className="text-2xl font-extrabold text-gradient-flame">
              {progress.percent}%
            </p>
          </div>
          <div className="mt-4">
            <ProgressBar value={progress.percent} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Attended", value: progress.sessionsAttended },
              { label: "Shared", value: progress.shared },
              { label: "Liked", value: progress.liked },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-surface-2 px-2 py-3">
                <p className="text-lg font-extrabold">
                  {stat.value}
                  <span className="text-sm font-semibold text-faint">
                    /{progress.sessionsElapsed}
                  </span>
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {currentUser.role === "team_lead" && team && teamToday ? (
        <section>
          <SectionTitle title="Your team today" subtitle={team.name} />
          <Link
            href="/team"
            className="card block p-4 transition-colors hover:bg-surface-2"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-extrabold tracking-tight">
                  {teamToday.checkedIn}
                  <span className="text-muted"> / {teamToday.members}</span>
                </p>
                <p className="mt-0.5 text-sm text-muted">checked in today</p>
              </div>
              <ChevronRightIcon className="text-faint" />
            </div>
            <div className="mt-3">
              <ProgressBar value={percent(teamToday.checkedIn, teamToday.members)} />
            </div>
          </Link>
        </section>
      ) : null}
    </div>
  );
}
