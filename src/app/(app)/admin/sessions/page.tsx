"use client";

import { useMemo, useState } from "react";

import { AdminOnly } from "@/components/AdminOnly";
import { Chips } from "@/components/SessionFilterChips";
import { Badge, Card, ProgressBar, SectionTitle } from "@/components/ui";
import {
  formatLongDate,
  formatShortDate,
  getSessionStatus,
  PROGRAM_DATE_RANGE,
  PROGRAM_LENGTH,
  shortTimeLabel,
  YOUTUBE_CHANNEL_NAME,
} from "@/lib/program";
import {
  getCurrentDay,
  getMemberRowsForSession,
  getParticipants,
  getSessionsForDay,
  percent,
} from "@/lib/stats";
import { useStore } from "@/lib/store";

export default function AdminSessionsPage() {
  const { db, now } = useStore();
  const currentDay = db ? getCurrentDay(db, now) : null;
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const activeDayId = selectedDayId ?? currentDay?.id ?? null;

  const view = useMemo(() => {
    if (!db || !activeDayId) return null;
    const day = db.days.find((item) => item.id === activeDayId);
    if (!day) return null;

    const participants = getParticipants(db);

    return {
      day,
      participants: participants.length,
      sessions: getSessionsForDay(db, day.id).map((session) => {
        const rows = getMemberRowsForSession(db, participants, session.id);
        return {
          session,
          status: getSessionStatus(day, session, now),
          checkedIn: rows.filter((row) => row.checked_in).length,
          shared: rows.filter((row) => row.shared_link).length,
          liked: rows.filter((row) => row.liked_youtube).length,
        };
      }),
    };
  }, [db, activeDayId, now]);

  if (!db || !view || !currentDay) return null;
  const { day, sessions, participants } = view;

  return (
    <AdminOnly>
    <div className="space-y-6 pb-4">
      <section>
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Sessions</h1>
        <p className="mt-1 text-sm text-muted">
          Three sessions a day, {PROGRAM_LENGTH} days, {db.sessions.length} sessions total.
        </p>
        <p className="mt-1 text-sm text-muted">
          {PROGRAM_DATE_RANGE} · streaming on YouTube, {YOUTUBE_CHANNEL_NAME}
        </p>
      </section>

      <Card>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-faint">
          Schedule · Day {day.day_number}
        </p>
        <ul className="space-y-2.5">
          {sessions.map(({ session }) => (
            <li key={session.id} className="flex items-center justify-between gap-3">
              <span className="text-[15px] font-semibold">{session.name}</span>
              <span className="shrink-0 text-sm text-muted">{shortTimeLabel(session.time)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <section>
        <SectionTitle title="Select a day" />
        <Chips
          options={db.days.map((item) => ({
            value: item.id,
            label: `Day ${item.day_number}`,
            hint: formatShortDate(item.date),
          }))}
          value={day.id}
          onChange={setSelectedDayId}
        />
      </section>

      <section>
        <SectionTitle
          title={`Day ${day.day_number}`}
          subtitle={formatLongDate(day.date)}
        />
        <div className="space-y-2.5">
          {sessions.map(({ session, status, checkedIn, shared, liked }) => (
            <Card key={session.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[16px] font-bold leading-snug">{session.name}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {shortTimeLabel(session.time)}
                  </p>
                </div>
                <Badge
                  tone={
                    status === "live" ? "gold" : status === "completed" ? "mint" : "magenta"
                  }
                >
                  {status === "live" ? "Live" : status === "completed" ? "Completed" : "Upcoming"}
                </Badge>
              </div>

              <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Checked in", value: checkedIn },
                  { label: "Shared", value: shared },
                  { label: "Liked", value: liked },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl bg-surface-2 px-2 py-3">
                    <p className="text-xl font-extrabold">{stat.value}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <ProgressBar
                  value={percent(checkedIn, participants)}
                  label={`Attendance · ${checkedIn}/${participants}`}
                />
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
    </AdminOnly>
  );
}
