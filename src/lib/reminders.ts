import { findCheckIn, getSessionsForDay } from "./stats";
import { getSessionStatus, sessionStartAt, shortTimeLabel, toISODate } from "./program";
import type { Database, Day, Session } from "./types";

export const REMINDER_MINUTES_BEFORE = 30;

export const REMINDER_DISMISS_PREFIX = "21dop:reminder-dismiss:v1:";

export type SessionReminderKind = "live" | "starting_soon";

export interface SessionReminder {
  kind: SessionReminderKind;
  day: Day;
  session: Session;
  minutesUntilStart: number;
}

export function isReminderDismissed(sessionId: string): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(REMINDER_DISMISS_PREFIX + sessionId));
}

export function dismissReminder(sessionId: string): void {
  window.localStorage.setItem(REMINDER_DISMISS_PREFIX + sessionId, "1");
}

export function clearReminderDismiss(sessionId: string): void {
  window.localStorage.removeItem(REMINDER_DISMISS_PREFIX + sessionId);
}

/**
 * The most relevant in-app nudge for right now: a live session the member has
 * not checked in for, or one starting within `REMINDER_MINUTES_BEFORE`.
 */
export function getSessionReminder(
  db: Database,
  userId: string,
  now: Date = new Date(),
): SessionReminder | null {
  const today = toISODate(now);
  const day = db.days.find((item) => item.date === today);
  if (!day) return null;

  const sessions = getSessionsForDay(db, day.id);

  for (const session of sessions) {
    if (getSessionStatus(day, session, now) !== "live") continue;
    if (findCheckIn(db, userId, session.id)?.checked_in) continue;
    return { kind: "live", day, session, minutesUntilStart: 0 };
  }

  let soonest: SessionReminder | null = null;

  for (const session of sessions) {
    if (getSessionStatus(day, session, now) !== "upcoming") continue;
    if (findCheckIn(db, userId, session.id)?.checked_in) continue;

    const start = sessionStartAt(day, session);
    const minutesUntilStart = Math.ceil((start.getTime() - now.getTime()) / 60_000);
    if (minutesUntilStart <= 0 || minutesUntilStart > REMINDER_MINUTES_BEFORE) continue;

    if (!soonest || minutesUntilStart < soonest.minutesUntilStart) {
      soonest = { kind: "starting_soon", day, session, minutesUntilStart };
    }
  }

  return soonest;
}

export function reminderHeadline(reminder: SessionReminder): string {
  if (reminder.kind === "live") {
    return `${reminder.session.name} is live now`;
  }

  const minutes = reminder.minutesUntilStart;
  const timeLabel = shortTimeLabel(reminder.session.time);
  if (minutes <= 1) {
    return `${reminder.session.name} starts now (${timeLabel})`;
  }
  return `${reminder.session.name} starts in ${minutes} minutes (${timeLabel})`;
}

export function reminderSubtext(reminder: SessionReminder): string {
  if (reminder.kind === "live") {
    return "Tap below to check in while the session is live.";
  }
  return "Get ready — you can check in as soon as it goes live.";
}
