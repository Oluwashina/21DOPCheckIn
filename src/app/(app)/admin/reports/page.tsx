"use client";

import { useMemo, useState } from "react";

import { DownloadIcon } from "@/components/icons";
import { Button, Card, EmptyState, Field, ProgressBar, SectionTitle, Select } from "@/components/ui";
import { downloadCSV, toCSV } from "@/lib/csv";
import { getSessionStatus, shortTimeLabel } from "@/lib/program";
import {
  getCurrentDay,
  getSessionsForDay,
  getTeamMembers,
  percent,
  tallyCheckIns,
} from "@/lib/stats";
import { useStore } from "@/lib/store";

export default function AdminReportsPage() {
  const { db, now } = useStore();
  const [dayFilter, setDayFilter] = useState("all");
  const [slotFilter, setSlotFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");

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
    const teams = db.teams
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
        };
      })
      .sort((a, b) => b.rate - a.rate);

    const grand = teams.reduce(
      (acc, row) => ({
        checkedIn: acc.checkedIn + row.checkedIn,
        shared: acc.shared + row.shared,
        liked: acc.liked + row.liked,
        possible: acc.possible + row.possible,
      }),
      { checkedIn: 0, shared: 0, liked: 0, possible: 0 },
    );

    return { sessions, teams, grand };
  }, [db, dayFilter, slotFilter, teamFilter, now]);

  if (!db || !report) return null;
  const { sessions, teams, grand } = report;
  const currentDay = getCurrentDay(db, now);

  function exportTeamSummary() {
    const csv = toCSV(
      ["Team", "Members", "Sessions counted", "Check-ins", "Shares", "Likes", "Attendance %"],
      teams.map((row) => [
        row.team.name,
        row.members,
        sessions.length,
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
    const sessionIds = new Set(sessions.map((session) => session.id));
    const sessionById = new Map(db.sessions.map((session) => [session.id, session]));

    const rows = db.check_ins
      .filter((row) => sessionIds.has(row.session_id))
      .map((row) => {
        const user = userById.get(row.user_id);
        const session = sessionById.get(row.session_id);
        const day = session ? dayById.get(session.day_id) : undefined;
        const team = user?.team_id ? teamById.get(user.team_id) : undefined;
        if (!user || !session || !day) return null;
        if (teamFilter !== "all" && user.team_id !== teamFilter) return null;
        return [
          user.name,
          team?.name ?? "No team",
          day.day_number,
          day.date,
          session.name,
          shortTimeLabel(session.time),
          row.checked_in ? "Yes" : "No",
          row.shared_link ? "Yes" : "No",
          row.liked_youtube ? "Yes" : "No",
        ];
      })
      .filter((row): row is (string | number)[] => row !== null);

    const csv = toCSV(
      ["Member", "Team", "Day", "Date", "Session", "Time", "Checked in", "Shared", "Liked"],
      rows,
    );
    downloadCSV(`21dop-check-ins-day-${currentDay.day_number}.csv`, csv);
  }

  return (
    <div className="space-y-6 pb-4">
      <section>
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted">
          Filter the programme, then export what you need.
        </p>
      </section>

      <Card>
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

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Sessions counted", value: sessions.length },
          { label: "Check-ins", value: grand.checkedIn.toLocaleString() },
          { label: "Shares", value: grand.shared.toLocaleString() },
          { label: "Likes", value: grand.liked.toLocaleString() },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-faint">
              {stat.label}
            </p>
            <p className="mt-1.5 text-2xl font-extrabold tracking-tight">{stat.value}</p>
          </Card>
        ))}
      </section>

      <section>
        <SectionTitle
          title="Team breakdown"
          subtitle={`${percent(grand.checkedIn, grand.possible)}% attendance for this selection`}
        />
        {teams.length === 0 || sessions.length === 0 ? (
          <EmptyState
            icon="📊"
            title="Nothing to report yet"
            description="No sessions have happened for this selection."
          />
        ) : (
          <>
            <div className="space-y-2.5 sm:hidden">
              {teams.map((row) => (
                <Card key={row.team.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-bold">{row.team.name}</p>
                    <p className="shrink-0 text-sm font-extrabold text-gradient-flame">
                      {row.rate}%
                    </p>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={row.rate} height="h-1.5" />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {row.checkedIn} check-ins · {row.shared} shares · {row.liked} likes
                  </p>
                </Card>
              ))}
            </div>

            <div className="card hidden overflow-hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-faint">
                    <th className="px-4 py-3 text-left font-semibold">Team</th>
                    <th className="px-3 py-3 text-right font-semibold">Members</th>
                    <th className="px-3 py-3 text-right font-semibold">Check-ins</th>
                    <th className="px-3 py-3 text-right font-semibold">Shares</th>
                    <th className="px-3 py-3 text-right font-semibold">Likes</th>
                    <th className="px-4 py-3 text-right font-semibold">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((row) => (
                    <tr
                      key={row.team.id}
                      className="border-b border-line/60 last:border-0 hover:bg-surface-2/60"
                    >
                      <td className="px-4 py-3 font-semibold">{row.team.name}</td>
                      <td className="px-3 py-3 text-right text-muted">{row.members}</td>
                      <td className="px-3 py-3 text-right">{row.checkedIn}</td>
                      <td className="px-3 py-3 text-right">{row.shared}</td>
                      <td className="px-3 py-3 text-right">{row.liked}</td>
                      <td className="px-4 py-3 text-right font-bold">{row.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
