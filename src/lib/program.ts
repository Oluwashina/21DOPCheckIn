import type { Day, Session, SessionSlot, SessionStatus } from "./types";

export const PROGRAM_NAME = "21 Days of Power";
export const CHURCH_NAME = "The New Church";
export const PROGRAM_LENGTH = 21;

/** Minutes a session stays "live" after its start time. */
export const SESSION_DURATION_MINUTES = 90;

export const SESSION_BLUEPRINT: {
  slot: SessionSlot;
  name: string;
  time: string;
  label: string;
}[] = [
  { slot: "whirlwind", name: "Whirlwind of Testimonies", time: "07:00", label: "7:00 AM" },
  { slot: "uncut", name: "Uncut Series", time: "13:00", label: "1:00 PM" },
  { slot: "power_night", name: "The Power Night Series", time: "18:30", label: "6:30 PM" },
];

export const TEAM_NAMES = [
  "The New Music",
  "Amplified",
  "Treasureville",
  "Comms",
  "Heralds",
  "Templars",
  "Shutterbox",
  "Elites",
  "Marshalls",
  "Amiables",
];

/** `yyyy-mm-dd` for a date, in local time (never UTC-shifted). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function shortTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatLongDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Status of a session relative to `now`. Days before today are always
 * completed, days after today are always upcoming.
 */
export function getSessionStatus(
  day: Day,
  session: Session,
  now: Date = new Date(),
): SessionStatus {
  const today = toISODate(now);
  if (day.date < today) return "completed";
  if (day.date > today) return "upcoming";

  const [h, m] = session.time.split(":").map(Number);
  const start = new Date(now);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + SESSION_DURATION_MINUTES * 60_000);

  if (now < start) return "upcoming";
  if (now <= end) return "live";
  return "completed";
}

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  upcoming: "Upcoming",
  live: "Live now",
  completed: "Completed",
};

/**
 * The day the program is currently on. Clamped to the program length so the
 * app stays usable before day 1 and after day 21.
 */
export function getCurrentDayNumber(programStart: string, now: Date = new Date()): number {
  const start = fromISODate(programStart);
  const today = fromISODate(toISODate(now));
  const diff = Math.round((today.getTime() - start.getTime()) / 86_400_000);
  return Math.min(Math.max(diff + 1, 1), PROGRAM_LENGTH);
}
