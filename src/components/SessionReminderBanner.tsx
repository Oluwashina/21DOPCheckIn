"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CalendarIcon } from "./icons";
import { Button, ButtonLink } from "./ui";
import { downloadProgramCalendar } from "@/lib/calendar";
import {
  dismissReminder,
  getSessionReminder,
  isReminderDismissed,
  reminderHeadline,
  reminderSubtext,
} from "@/lib/reminders";
import { useStore } from "@/lib/store";

export function SessionReminderBanner() {
  const { db, currentUser, now } = useStore();
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const reminder = useMemo(() => {
    if (!db || !currentUser) return null;
    return getSessionReminder(db, currentUser.id, now);
  }, [db, currentUser, now]);

  if (!reminder || dismissedId === reminder.session.id || isReminderDismissed(reminder.session.id)) {
    return null;
  }

  function dismiss() {
    dismissReminder(reminder!.session.id);
    setDismissedId(reminder!.session.id);
  }

  const tone =
    reminder.kind === "live"
      ? "border-gold/40 bg-gold/10"
      : "border-magenta/35 bg-magenta/10";

  return (
    <div className={`mb-5 rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text">{reminderHeadline(reminder)}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{reminderSubtext(reminder)}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-faint"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <ButtonLink href={`/session/${reminder.session.id}`} size="sm">
          Check in
        </ButtonLink>
        <Button size="sm" variant="secondary" onClick={() => downloadProgramCalendar(now)}>
          <CalendarIcon width={16} height={16} />
          Add to calendar
        </Button>
      </div>

      <p className="mt-2.5 text-[11px] text-faint">
        Calendar reminders work even when the app is closed.{" "}
        <Link href="/profile" className="font-semibold text-gold-soft">
          Profile
        </Link>{" "}
        has the full programme download too.
      </p>
    </div>
  );
}
