"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CalendarIcon } from "./icons";
import { Button, ButtonLink } from "./ui";
import { downloadProgramCalendar } from "@/lib/calendar";
import {
  isSunday,
  SUNDAY_SERVICE_LABEL,
  SUNDAY_SERVICE_VENUE,
  toISODate,
} from "@/lib/program";
import {
  dismissReminder,
  getSessionReminder,
  isReminderDismissed,
  reminderHeadline,
  reminderSubtext,
} from "@/lib/reminders";
import { isRestDay } from "@/lib/stats";
import { useStore } from "@/lib/store";

const SUNDAY_BANNER_DISMISS_PREFIX = "21dop:sunday-banner-dismiss:v1:";

function isSundayBannerDismissed(dateISO: string): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(SUNDAY_BANNER_DISMISS_PREFIX + dateISO));
}

function dismissSundayBanner(dateISO: string): void {
  window.localStorage.setItem(SUNDAY_BANNER_DISMISS_PREFIX + dateISO, "1");
}

export function SessionReminderBanner() {
  const { db, currentUser, now } = useStore();
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [dismissedSunday, setDismissedSunday] = useState(false);
  const todayISO = toISODate(now);

  const reminder = useMemo(() => {
    if (!db || !currentUser) return null;
    return getSessionReminder(db, currentUser.id, now);
  }, [db, currentUser, now]);

  const showSundayService = useMemo(() => {
    if (!db) return false;
    return isRestDay(db, now) && isSunday(now);
  }, [db, now]);

  if (
    reminder &&
    dismissedId !== reminder.session.id &&
    !isReminderDismissed(reminder.session.id)
  ) {
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

  if (
    showSundayService &&
    !dismissedSunday &&
    !isSundayBannerDismissed(todayISO)
  ) {
    return (
      <div className="mb-5 rounded-2xl border border-mint/35 bg-mint/10 p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-text">No sessions today</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Join us for service at {SUNDAY_SERVICE_VENUE}. Service starts at{" "}
              {SUNDAY_SERVICE_LABEL}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              dismissSundayBanner(todayISO);
              setDismissedSunday(true);
            }}
            className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-faint"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return null;
}
