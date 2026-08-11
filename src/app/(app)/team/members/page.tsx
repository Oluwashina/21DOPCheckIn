"use client";

import { useMemo, useState } from "react";

import { RoleGuard } from "@/components/RoleGuard";
import { Chips } from "@/components/SessionFilterChips";
import { Avatar, Badge, Card, EmptyState, Input, ProgressBar, SectionTitle } from "@/components/ui";
import { PROGRAM_LENGTH } from "@/lib/program";
import {
  getCurrentDay,
  getMemberProgress,
  getMemberRowsForDay,
  getTeamAttendanceRate,
  getTeamById,
  getTeamMembers,
  percent,
  type MemberRow,
} from "@/lib/stats";
import { useStore } from "@/lib/store";

type FilterKey = "all" | "checked_in" | "not_checked_in" | "shared" | "not_shared";

const FILTERS: { value: FilterKey; label: string }[] = [
  { value: "all", label: "All" },
  { value: "checked_in", label: "Checked in" },
  { value: "not_checked_in", label: "Not checked in" },
  { value: "shared", label: "Shared" },
  { value: "not_shared", label: "Not shared" },
];

function matchesFilter(row: MemberRow, filter: FilterKey): boolean {
  switch (filter) {
    case "checked_in":
      return row.checked_in;
    case "not_checked_in":
      return !row.checked_in;
    case "shared":
      return row.shared_link;
    case "not_shared":
      return !row.shared_link;
    default:
      return true;
  }
}

export default function MyTeamPage() {
  return (
    <RoleGuard allow={["team_lead"]}>
      <MyTeam />
    </RoleGuard>
  );
}

function MyTeam() {
  const { db, currentUser, now } = useStore();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const view = useMemo(() => {
    if (!db || !currentUser?.team_id) return null;
    const team = getTeamById(db, currentUser.team_id);
    if (!team) return null;

    const day = getCurrentDay(db, now);
    const members = getTeamMembers(db, team.id);
    const activeMembers = members.filter((user) => user.active);
    const rows = getMemberRowsForDay(db, members, day.id);

    return {
      team,
      day,
      members,
      activeMembers,
      rows: rows.map((row) => ({
        ...row,
        progress: getMemberProgress(db, row.user.id, now),
      })),
      overallRate: getTeamAttendanceRate(db, team.id, now),
    };
  }, [db, currentUser, now]);

  if (!view) {
    return (
      <EmptyState
        icon="👥"
        title="No team assigned yet"
        description="Ask an admin to assign you to a service team."
      />
    );
  }

  const { team, day, members, activeMembers, rows, overallRate } = view;
  const checkedInToday = rows.filter((row) => row.checked_in && row.user.active).length;
  const todayRate = percent(checkedInToday, activeMembers.length);

  const needle = query.trim().toLowerCase();
  const visible = rows.filter(
    (row) =>
      matchesFilter(row, filter) &&
      (needle === "" || row.user.name.toLowerCase().includes(needle)),
  );

  return (
    <div className="space-y-6 pb-4">
      <section>
        <p className="text-sm text-muted">My team</p>
        <h1 className="mt-0.5 text-[30px] font-extrabold leading-tight tracking-tight">
          {team.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="muted">{members.length} members</Badge>
          <Badge tone="gold">Day {day.day_number} of {PROGRAM_LENGTH}</Badge>
        </div>
      </section>

      <Card>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Today&apos;s accountability</p>
            <p className="text-3xl font-extrabold tracking-tight">{todayRate}% complete</p>
          </div>
          <p className="text-right text-xs text-muted">
            {overallRate}% overall
            <br />
            attendance
          </p>
        </div>
        <div className="mt-3">
          <ProgressBar value={todayRate} />
        </div>
      </Card>

      <section>
        <SectionTitle title="Members" subtitle={`${visible.length} shown`} />

        <div className="mb-3 space-y-2.5">
          <Input
            value={query}
            placeholder="Search members…"
            onChange={(event) => setQuery(event.target.value)}
          />
          <Chips
            options={FILTERS.map((item) => ({ value: item.value, label: item.label }))}
            value={filter}
            onChange={(value) => setFilter(value as FilterKey)}
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No members match this filter"
            description="Try a different filter or clear your search."
          />
        ) : (
          <div className="space-y-2">
            {visible.map((row) => (
              <div key={row.user.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={row.user.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[15px] font-bold">{row.user.name}</p>
                      {row.user.id === team.team_lead_id ? (
                        <Badge tone="magenta">Lead</Badge>
                      ) : null}
                      {!row.user.active ? <Badge tone="muted">Inactive</Badge> : null}
                    </div>

                    <ul className="mt-2 space-y-1 text-[13px]">
                      {[
                        { done: row.checked_in, on: "Checked in", off: "Not checked in" },
                        { done: row.shared_link, on: "Shared", off: "Not shared" },
                        { done: row.liked_youtube, on: "Liked", off: "Not liked" },
                      ].map((item) => (
                        <li
                          key={item.on}
                          className={`flex items-center gap-2 font-semibold ${
                            item.done ? "text-mint" : "text-faint"
                          }`}
                        >
                          <span>{item.done ? "✓" : "○"}</span>
                          {item.done ? item.on : item.off}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-lg font-extrabold text-gradient-gold">
                      {row.progress.percent}%
                    </p>
                    <p className="text-[11px] text-faint">
                      {row.progress.daysActive}/{PROGRAM_LENGTH} days
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
