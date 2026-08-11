"use client";

import { useMemo } from "react";

import { FlameIcon } from "@/components/icons";
import { Card, ProgressBar, ProgressRing, SectionTitle } from "@/components/ui";
import { formatShortDate, fromISODate, PROGRAM_LENGTH } from "@/lib/program";
import { getCurrentDay, getMemberProgress, percent } from "@/lib/stats";
import { useStore } from "@/lib/store";

function encouragement(daysActive: number, daysElapsed: number, streak: number): string {
  if (daysElapsed === 0) return "Day one is loading. Get ready. 🔥";
  if (streak >= 5) return `${streak} days in a row. You're on fire — keep going! 🔥`;
  if (daysActive === daysElapsed) return "Perfect record so far. Keep showing up! 🔥";
  if (daysActive / daysElapsed >= 0.6) return "You're doing great! Keep showing up. 🔥";
  return "Today is a fresh start. Jump back in — we're glad you're here. 🔥";
}

export default function ProgressPage() {
  const { db, currentUser, now } = useStore();

  const data = useMemo(() => {
    if (!db || !currentUser) return null;
    return {
      progress: getMemberProgress(db, currentUser.id, now),
      currentDay: getCurrentDay(db, now),
    };
  }, [db, currentUser, now]);

  if (!data || !currentUser) return null;
  const { progress, currentDay } = data;

  const firstDay = progress.perDay[0]?.day;
  // Monday = 0, so the first square lands in the right weekday column.
  const leadingOffset = firstDay ? (fromISODate(firstDay.date).getDay() + 6) % 7 : 0;

  const stats = [
    { label: "Sessions attended", value: progress.sessionsAttended, tone: "gold" as const },
    { label: "Shared", value: progress.shared, tone: "magenta" as const },
    { label: "YouTube likes", value: progress.liked, tone: "mint" as const },
  ];

  return (
    <div className="space-y-7 pb-4">
      <section>
        <h1 className="text-[32px] font-extrabold leading-tight tracking-tight">
          My Progress
        </h1>
        <p className="mt-1 text-sm text-muted">
          {encouragement(progress.daysActive, progress.daysElapsed, progress.streak)}
        </p>
      </section>

      <Card>
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
          <ProgressRing value={progress.percent}>
            <span className="text-3xl font-extrabold tracking-tight">
              {progress.percent}%
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">
              complete
            </span>
          </ProgressRing>

          <div className="w-full flex-1">
            <p className="text-sm text-muted">Overall progress</p>
            <p className="mt-0.5 text-3xl font-extrabold tracking-tight">
              {progress.daysActive}
              <span className="text-muted"> / {PROGRAM_LENGTH} days</span>
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold-soft">
                <FlameIcon width={13} height={13} />
                {progress.streak} day streak
              </span>
              <span className="inline-flex items-center rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-bold text-muted">
                Day {currentDay.day_number} of {PROGRAM_LENGTH}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <section className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-faint">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">
              {stat.value}
              <span className="text-base font-semibold text-faint">
                {" "}
                / {progress.sessionsElapsed}
              </span>
            </p>
            <div className="mt-3">
              <ProgressBar
                value={percent(stat.value, progress.sessionsElapsed)}
                tone={stat.tone}
              />
            </div>
          </Card>
        ))}
      </section>

      <section>
        <SectionTitle
          title="Your programme"
          subtitle="Each row is a week, Monday to Friday. Filled means you showed up."
        />
        <Card>
          <div className="mb-2 grid grid-cols-5 gap-2 text-center text-[10px] font-bold uppercase tracking-wide text-faint sm:gap-2.5">
            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
            {/* Keep day 1 under its real weekday column. */}
            {Array.from({ length: leadingOffset }).map((_, index) => (
              <span key={`offset-${index}`} aria-hidden />
            ))}
            {progress.perDay.map(({ day, attended, elapsed }) => {
              const isToday = day.day_number === currentDay.day_number;
              const pending = elapsed === 0;
              const intensity = attended === 0 ? 0 : attended / 3;

              return (
                <div
                  key={day.id}
                  title={`Day ${day.day_number} · ${formatShortDate(day.date)} · ${attended}/${
                    elapsed || 3
                  } sessions`}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border text-center transition-colors ${
                    pending
                      ? "border-line bg-surface-2/40 text-faint"
                      : attended > 0
                        ? "border-transparent text-ink"
                        : "border-line bg-surface-2 text-faint"
                  } ${isToday ? "ring-2 ring-gold ring-offset-2 ring-offset-surface" : ""}`}
                  style={
                    attended > 0 && !pending
                      ? {
                          backgroundImage: `linear-gradient(140deg, rgba(255,243,191,${
                            0.5 + intensity * 0.5
                          }), rgba(255,197,51,${0.5 + intensity * 0.5}))`,
                        }
                      : undefined
                  }
                >
                  <span className="text-[11px] font-bold leading-none">
                    {day.day_number}
                  </span>
                  {!pending ? (
                    <span className="mt-1 text-[9px] font-semibold opacity-80">
                      {attended > 0 ? `${attended}/3` : "—"}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-faint">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-gold-gradient" /> Showed up
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-line bg-surface-2" /> Missed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-line bg-surface-2/40" /> Not
              yet
            </span>
          </div>
        </Card>
      </section>
    </div>
  );
}
