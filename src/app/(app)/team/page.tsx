"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ChevronRightIcon } from "@/components/icons";
import { MemberAccountabilityList } from "@/components/MemberAccountabilityList";
import { RoleGuard } from "@/components/RoleGuard";
import { Chips, sessionChipOptions } from "@/components/SessionFilterChips";
import { Badge, Card, EmptyState, LiveDot, ProgressBar, SectionTitle, StatCard } from "@/components/ui";
import {
  formatLongDate,
  getSessionStatus,
  PROGRAM_LENGTH,
  shortTimeLabel,
} from "@/lib/program";
import {
  getCurrentDay,
  getMemberRowsForDay,
  getMemberRowsForSession,
  getSessionsForDay,
  getTeamAttendanceRate,
  getTeamById,
  getTeamMembers,
  percent,
} from "@/lib/stats";
import { useStore } from "@/lib/store";

export default function TeamDashboardPage() {
  return (
    <RoleGuard allow={["team_lead"]}>
      <TeamDashboard />
    </RoleGuard>
  );
}

function TeamDashboard() {
  const { db, currentUser, now } = useStore();
  const [scope, setScope] = useState("all");

  const view = useMemo(() => {
    if (!db || !currentUser?.team_id) return null;
    const team = getTeamById(db, currentUser.team_id);
    if (!team) return null;

    const day = getCurrentDay(db, now);
    const sessions = getSessionsForDay(db, day.id);
    const members = getTeamMembers(db, team.id).filter((user) => user.active);
    const rows =
      scope === "all"
        ? getMemberRowsForDay(db, members, day.id)
        : getMemberRowsForSession(db, members, scope);

    return {
      team,
      day,
      members,
      rows,
      sessions: sessions.map((session) => ({
        session,
        status: getSessionStatus(day, session, now),
        checkedIn: getMemberRowsForSession(db, members, session.id).filter(
          (row) => row.checked_in,
        ).length,
      })),
      overallRate: getTeamAttendanceRate(db, team.id, now),
    };
  }, [db, currentUser, now, scope]);

  if (!view) {
    return (
      <EmptyState
        icon="👥"
        title="No team assigned yet"
        description="Ask an admin to assign you to a service team to see this dashboard."
      />
    );
  }

  const { team, day, members, rows, sessions, overallRate } = view;
  const checkedIn = rows.filter((row) => row.checked_in).length;
  const shared = rows.filter((row) => row.shared_link).length;
  const liked = rows.filter((row) => row.liked_youtube).length;
  const missing = rows.filter((row) => !row.checked_in);

  return (
    <div className="space-y-7 pb-4">
      <section>
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight sm:text-[34px]">
          Team Accountability
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="flame">{team.name}</Badge>
          <Badge tone="muted">
            Day {day.day_number} of {PROGRAM_LENGTH}
          </Badge>
          <span className="text-sm text-muted">{formatLongDate(day.date)}</span>
        </div>
      </section>

      <section>
        <SectionTitle title="Today's sessions" />
        <div className="grid gap-2.5 sm:grid-cols-3">
          {sessions.map(({ session, status, checkedIn: count }) => (
            <div
              key={session.id}
              className={`card p-4 ${status === "live" ? "border-flame/45" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-faint">
                  {shortTimeLabel(session.time)}
                </span>
                {status === "live" ? (
                  <Badge tone="flame">
                    <LiveDot />
                    Live
                  </Badge>
                ) : status === "completed" ? (
                  <Badge tone="mint">Completed</Badge>
                ) : (
                  <Badge tone="violet">Upcoming</Badge>
                )}
              </div>
              <p className="mt-2 text-[15px] font-bold leading-snug">{session.name}</p>
              <p className="mt-2 text-sm text-muted">
                <span className="font-bold text-text">{count}</span>/{members.length}{" "}
                checked in
              </p>
              <div className="mt-2.5">
                <ProgressBar value={percent(count, members.length)} height="h-1.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Team statistics"
          subtitle={scope === "all" ? "Across all of today" : "For the selected session"}
        />
        <div className="mb-3">
          <Chips
            options={sessionChipOptions(sessions.map((item) => item.session))}
            value={scope}
            onChange={setScope}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total members" value={members.length} />
          <StatCard label="Checked in" value={checkedIn} tone="flame" />
          <StatCard label="Shared" value={shared} tone="violet" />
          <StatCard label="Liked" value={liked} tone="mint" />
        </div>

        <Card className="mt-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Attendance rate</p>
              <p className="text-3xl font-extrabold tracking-tight">
                {percent(checkedIn, members.length)}%
              </p>
            </div>
            <p className="text-right text-xs text-muted">
              {overallRate}% across
              <br />
              the whole programme
            </p>
          </div>
          <div className="mt-3">
            <ProgressBar value={percent(checkedIn, members.length)} />
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle
          title="Members"
          subtitle={`${checkedIn} of ${members.length} checked in`}
          action={
            <Link
              href="/team/members"
              className="inline-flex items-center gap-1 text-sm font-semibold text-flame-soft"
            >
              Full team
              <ChevronRightIcon width={14} height={14} />
            </Link>
          }
        />
        <MemberAccountabilityList
          rows={rows}
          leadId={team.team_lead_id}
          emptyTitle="No members on this team yet"
          emptyDescription="Ask an admin to add members to your service team."
        />
      </section>

      {missing.length > 0 ? (
        <section>
          <SectionTitle
            title="Could use a nudge"
            subtitle="A quick message goes a long way."
          />
          <Card>
            <div className="flex flex-wrap gap-2">
              {missing.slice(0, 12).map((row) => (
                <span
                  key={row.user.id}
                  className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-[13px] font-semibold text-muted"
                >
                  {row.user.name}
                </span>
              ))}
              {missing.length > 12 ? (
                <span className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-[13px] font-semibold text-faint">
                  +{missing.length - 12} more
                </span>
              ) : null}
            </div>
          </Card>
        </section>
      ) : (
        <EmptyState
          icon="🎉"
          title="Everyone's checked in!"
          description="Your whole team showed up. Celebrate them."
        />
      )}
    </div>
  );
}
