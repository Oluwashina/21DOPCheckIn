"use client";

import { useMemo, useState } from "react";

import { ChevronRightIcon, DownloadIcon } from "@/components/icons";
import {
  Button,
  Card,
  EmptyState,
  Field,
  ProgressBar,
  SectionTitle,
  Select,
  StatCard,
} from "@/components/ui";
import { downloadCSV, formatReportDateTime, toCSV } from "@/lib/csv";
import { getSessionStatus, shortTimeLabel } from "@/lib/program";
import {
  getCurrentDay,
  getSessionsForDay,
  getTeamMembers,
  percent,
  tallyCheckIns,
} from "@/lib/stats";
import { useStore } from "@/lib/store";
import type { Team, User } from "@/lib/types";

interface MemberReportRow {
  user: User;
  checkedIn: number;
  shared: number;
  liked: number;
  possible: number;
  rate: number;
}

interface TeamReportRow {
  team: Team;
  members: number;
  checkedIn: number;
  shared: number;
  liked: number;
  possible: number;
  rate: number;
  memberRows: MemberReportRow[];
}

function buildMemberRows(
  db: NonNullable<ReturnType<typeof useStore>["db"]>,
  members: User[],
  sessionIds: string[],
): MemberReportRow[] {
  const possible = sessionIds.length;
  return members
    .map((user) => {
      const totals = tallyCheckIns(db, [user.id], sessionIds);
      return {
        user,
        ...totals,
        possible,
        rate: percent(totals.checkedIn, possible),
      };
    })
    .sort((a, b) => b.rate - a.rate || a.user.name.localeCompare(b.user.name));
}

export default function AdminReportsPage() {
  const { db, now } = useStore();
  const [dayFilter, setDayFilter] = useState("all");
  const [slotFilter, setSlotFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const report = useMemo(() => {
    if (!db) return null;

    const dayById = new Map(db.days.map((day) => [day.id, day]));
    const sessions = db.sessions.filter((session) => {
      const day = dayById.get(session.day_id);
      if (!day) return false;
      if (getSessionStatus(day, session, now) === "upcoming") return false;
      if (dayFilter !== "all" && session.day_id !== dayFilter) return false;
      if (slotFilter !== "all" && session.slot !== slotFilter) return false;
      return true;
    });

    const sessionIds = sessions.map((session) => session.id);
    const teams: TeamReportRow[] = db.teams
      .filter((team) => (teamFilter === "all" ? true : team.id === teamFilter))
      .map((team) => {
        const members = getTeamMembers(db, team.id).filter((user) => user.active);
        const totals = tallyCheckIns(
          db,
          members.map((user) => user.id),
          sessionIds,
        );
        const possible = members.length * sessionIds.length;
        return {
          team,
          members: members.length,
          ...totals,
          possible,
          rate: percent(totals.checkedIn, possible),
          memberRows: buildMemberRows(db, members, sessionIds),
        };
      })
      .sort((a, b) => b.rate - a.rate || a.team.name.localeCompare(b.team.name));

    const grand = teams.reduce(
      (acc, row) => ({
        checkedIn: acc.checkedIn + row.checkedIn,
        shared: acc.shared + row.shared,
        liked: acc.liked + row.liked,
        possible: acc.possible + row.possible,
        members: acc.members + row.members,
      }),
      { checkedIn: 0, shared: 0, liked: 0, possible: 0, members: 0 },
    );

    return { sessions, sessionIds, teams, grand };
  }, [db, dayFilter, slotFilter, teamFilter, now]);

  if (!db || !report) return null;
  const { sessions, sessionIds, teams, grand } = report;
  const currentDay = getCurrentDay(db, now);
  const overallRate = percent(grand.checkedIn, grand.possible);
  const filterLabel =
    dayFilter === "all" && slotFilter === "all" && teamFilter === "all"
      ? "All programme days and teams"
      : "Current filters";

  function exportTeamSummary() {
    const csv = toCSV(
      [
        "Team",
        "Members",
        "Sessions counted",
        "Possible check-ins",
        "Check-ins",
        "Shares",
        "Likes",
        "Attendance %",
      ],
      teams.map((row) => [
        row.team.name,
        row.members,
        sessions.length,
        row.possible,
        row.checkedIn,
        row.shared,
        row.liked,
        row.rate,
      ]),
    );
    downloadCSV(`21dop-team-summary-day-${currentDay.day_number}.csv`, csv);
  }

  function exportCheckIns() {
    if (!db) return;
    const userById = new Map(db.users.map((user) => [user.id, user]));
    const teamById = new Map(db.teams.map((team) => [team.id, team]));
    const dayById = new Map(db.days.map((day) => [day.id, day]));
    const sessionIdsSet = new Set(sessionIds);
    const sessionById = new Map(db.sessions.map((session) => [session.id, session]));

    const rows = db.check_ins
      .filter((row) => sessionIdsSet.has(row.session_id))
      .map((row) => {
        const user = userById.get(row.user_id);
        const session = sessionById.get(row.session_id);
        const day = session ? dayById.get(session.day_id) : undefined;
        const team = user?.team_id ? teamById.get(user.team_id) : undefined;
        if (!user || !session || !day) return null;
        if (teamFilter !== "all" && user.team_id !== teamFilter) return null;
        return {
          sortKey: row.updated_at,
          cells: [
            user.name,
            team?.name ?? "No team",
            day.day_number,
            day.date,
            session.name,
            shortTimeLabel(session.time),
            row.checked_in ? "Yes" : "No",
            row.checked_in ? formatReportDateTime(row.updated_at) : "",
            formatReportDateTime(row.updated_at),
            row.shared_link ? "Yes" : "No",
            row.liked_youtube ? "Yes" : "No",
          ],
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
      .map((row) => row.cells);

    const csv = toCSV(
      [
        "Member",
        "Team",
        "Day",
        "Session date",
        "Session",
        "Session time",
        "Checked in",
        "Checked in at",
        "Last updated",
        "Shared",
        "Liked",
      ],
      rows,
    );
    downloadCSV(`21dop-check-ins-day-${currentDay.day_number}.csv`, csv);
  }

  return (
    <div className="space-y-6 pb-4">
      <section>
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted">
          Programme totals, team breakdown, and CSV exports for your filters.
        </p>
      </section>

      <Card>
        <SectionTitle title="Filters" subtitle="Narrow what you see and export" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Day">
            <Select value={dayFilter} onChange={(event) => setDayFilter(event.target.value)}>
              <option value="all">All days</option>
              {db.days.map((day) => (
                <option key={day.id} value={day.id}>
                  Day {day.day_number}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Session">
            <Select value={slotFilter} onChange={(event) => setSlotFilter(event.target.value)}>
              <option value="all">All sessions</option>
              {getSessionsForDay(db, currentDay.id).map((session) => (
                <option key={session.slot} value={session.slot}>
                  {session.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Team">
            <Select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
              <option value="all">All teams</option>
              {[...db.teams]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
            </Select>
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button variant="secondary" size="sm" onClick={exportTeamSummary}>
            <DownloadIcon width={16} height={16} />
            Team summary CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCheckIns}>
            <DownloadIcon width={16} height={16} />
            Check-ins CSV
          </Button>
        </div>
      </Card>

      <section>
        <SectionTitle title="Programme overview" subtitle={filterLabel} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Attendance" value={`${overallRate}%`} tone="gold" />
          <StatCard
            label="Check-ins"
            value={grand.checkedIn.toLocaleString()}
            hint={`of ${grand.possible.toLocaleString()} possible`}
          />
          <StatCard label="Shares" value={grand.shared.toLocaleString()} tone="magenta" />
          <StatCard label="Likes" value={grand.liked.toLocaleString()} tone="mint" />
          <StatCard
            label="Sessions counted"
            value={sessions.length}
            hint={`${grand.members} active members`}
          />
        </div>
      </section>

      <section>
        <SectionTitle
          title="Team breakdown"
          subtitle="Tap a team to see each member · times in CSV use WAT (Lagos)"
        />
        {teams.length === 0 || sessions.length === 0 ? (
          <EmptyState
            icon="📊"
            title="Nothing to report yet"
            description="No sessions have happened for this selection."
          />
        ) : (
          <div className="space-y-2.5">
            {teams.map((row) => {
              const expanded = expandedTeamId === row.team.id;
              return (
                <Card key={row.team.id} className="overflow-hidden p-0">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-2/50 sm:p-5"
                    onClick={() =>
                      setExpandedTeamId(expanded ? null : row.team.id)
                    }
                  >
                    <ChevronRightIcon
                      width={18}
                      height={18}
                      className={[
                        "shrink-0 text-muted transition-transform",
                        expanded ? "rotate-90" : "",
                      ].join(" ")}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-bold">
                        {row.team.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {row.members} members · {row.checkedIn} check-ins · {row.shared}{" "}
                        shares · {row.liked} likes
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-lg font-extrabold text-gradient-gold">
                        {row.rate}%
                      </span>
                      <span className="text-[11px] text-faint">attendance</span>
                    </span>
                  </button>

                  <div className="px-4 pb-3 sm:px-5">
                    <ProgressBar value={row.rate} height="h-1.5" />
                  </div>

                  {expanded ? (
                    <div className="border-t border-line bg-surface-2/30">
                      {row.memberRows.length === 0 ? (
                        <p className="px-4 py-4 text-sm text-muted sm:px-5">
                          No active members on this team.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[520px] text-sm">
                            <thead>
                              <tr className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-faint">
                                <th className="px-4 py-2.5 text-left font-semibold sm:px-5">
                                  Member
                                </th>
                                <th className="px-3 py-2.5 text-right font-semibold">
                                  Check-ins
                                </th>
                                <th className="px-3 py-2.5 text-right font-semibold">Shares</th>
                                <th className="px-3 py-2.5 text-right font-semibold">Likes</th>
                                <th className="px-4 py-2.5 text-right font-semibold sm:px-5">
                                  Attendance
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.memberRows.map((memberRow) => (
                                <tr
                                  key={memberRow.user.id}
                                  className="border-b border-line/50 last:border-0"
                                >
                                  <td className="px-4 py-2.5 font-semibold sm:px-5">
                                    {memberRow.user.name}
                                  </td>
                                  <td className="px-3 py-2.5 text-right text-muted">
                                    {memberRow.checkedIn}/{memberRow.possible}
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    {memberRow.shared}
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    {memberRow.liked}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-bold sm:px-5">
                                    {memberRow.rate}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}
                </Card>
              );
            })}

            <Card className="border-gold/25 bg-gold/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-faint">
                    Overall ({filterLabel.toLowerCase()})
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {grand.members} members across {teams.length} team
                    {teams.length === 1 ? "" : "s"} · {grand.checkedIn} check-ins ·{" "}
                    {grand.shared} shares · {grand.liked} likes
                  </p>
                </div>
                <p className="text-2xl font-extrabold text-gradient-gold">{overallRate}%</p>
              </div>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}
