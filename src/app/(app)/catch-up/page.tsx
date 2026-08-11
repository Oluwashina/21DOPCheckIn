"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ChevronLeftIcon } from "@/components/icons";
import { SessionCard } from "@/components/SessionCard";
import { Card, SectionTitle } from "@/components/ui";
import { formatLongDate } from "@/lib/program";
import { getCatchUpSessions } from "@/lib/stats";
import { useStore } from "@/lib/store";

export default function CatchUpPage() {
  const { db, currentUser, now } = useStore();

  const grouped = useMemo(() => {
    if (!db || !currentUser) return [];

    const byDay = new Map<number, ReturnType<typeof getCatchUpSessions>>();
    for (const item of getCatchUpSessions(db, currentUser.id, now)) {
      const list = byDay.get(item.day.day_number) ?? [];
      list.push(item);
      byDay.set(item.day.day_number, list);
    }

    return [...byDay.entries()]
      .sort(([a], [b]) => a - b)
      .map(([dayNumber, items]) => ({ dayNumber, items }));
  }, [db, currentUser, now]);

  if (!currentUser) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-text"
      >
        <ChevronLeftIcon width={16} height={16} />
        Back to today
      </Link>

      <section>
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">
          Catch up
        </h1>
        <p className="mt-1 text-sm text-muted">
          Were you at a session before you signed up? Tap it, check in, and tick
          shared or liked if you already did those.
        </p>
      </section>

      {grouped.length === 0 ? (
        <Card className="text-center">
          <p className="text-[15px] font-semibold">You&apos;re all caught up</p>
          <p className="mt-1 text-sm text-muted">
            Every session so far has a check-in from you. Nice work.
          </p>
        </Card>
      ) : (
        grouped.map(({ dayNumber, items }) => (
          <section key={dayNumber}>
            <SectionTitle
              title={`Day ${dayNumber}`}
              subtitle={formatLongDate(items[0].day.date)}
            />
            <div className="grid gap-3">
              {items.map(({ session, status, checkIn }) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  status={status}
                  checkIn={checkIn}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
