import type { Day, Session, SessionSlot, SessionStatus } from "./types";

export const PROGRAM_NAME = "21 Days of Power";
export const PROGRAM_THEME = "Thirsty Soul, Living Waters";
export const CHURCH_NAME = "The New Church";
export const MINISTER_NAME = "Pastor Shola Okodugha";

/** The programme window: 10 to 30 August 2026, as advertised on the flyer. */
export const PROGRAM_START_DATE = "2026-08-10";
export const PROGRAM_END_DATE = "2026-08-30";

/** Sessions run Monday to Friday. Weekends are not check-in days at all. */
export const RUNS_ON_WEEKENDS = false;

export const YOUTUBE_CHANNEL_NAME = "The New Church";
/** Set this to the channel URL to turn on the "Watch & like" buttons. */
export const YOUTUBE_CHANNEL_URL = "";

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
  { slot: "power_night", name: "Evening Session", time: "18:30", label: "6:30 PM" },
];

/**
 * Per-day session start overrides, keyed by programme day number.
 * Use when a session on one day differs from `SESSION_BLUEPRINT`.
 */
export const SESSION_TIME_OVERRIDES: Partial<
  Record<number, Partial<Record<SessionSlot, string>>>
> = {
  5: { power_night: "18:00" },
};

export function resolveSessionTime(
  dayNumber: number,
  slot: SessionSlot,
  defaultTime: string,
): string {
  return SESSION_TIME_OVERRIDES[dayNumber]?.[slot] ?? defaultTime;
}

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
  "Data",
  "Welcome and Integration",
  "Tribe Leaders",
  "CEM",
  "Tephilah",
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

/** Sunday in-person service during programme rest days. */
export const SUNDAY_SERVICE_VENUE = "Mainstay Event Center, Akala Expressway, Ibadan";
export const SUNDAY_SERVICE_LABEL = "10:00 AM";

export function isSunday(date: Date = new Date()): boolean {
  return date.getDay() === 0;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Every calendar day in the programme window, including weekends.
 * Day numbers follow the calendar: 10 Aug = Day 1, 17 Aug = Day 8, 30 Aug = Day 21.
 */
export function buildCalendarDates(
  startISO: string = PROGRAM_START_DATE,
  endISO: string = PROGRAM_END_DATE,
): string[] {
  const dates: string[] = [];
  const end = fromISODate(endISO);
  let cursor = fromISODate(startISO);

  while (cursor <= end) {
    dates.push(toISODate(cursor));
    cursor = addDays(cursor, 1);
  }

  return dates;
}

/** Weekdays in the programme window — the only days with check-in sessions. */
export function buildCheckInDates(
  startISO: string = PROGRAM_START_DATE,
  endISO: string = PROGRAM_END_DATE,
): string[] {
  return buildCalendarDates(startISO, endISO).filter((date) => !isWeekend(fromISODate(date)));
}

/** @deprecated Use {@link buildCheckInDates} — kept for scripts that filter weekdays. */
export function buildProgramDates(
  startISO: string = PROGRAM_START_DATE,
  endISO: string = PROGRAM_END_DATE,
): string[] {
  return buildCheckInDates(startISO, endISO);
}

export const PROGRAM_CALENDAR_DATES = buildCalendarDates();

/** Weekday dates that carry sessions. */
export const CHECK_IN_DATES = buildCheckInDates();

/** @deprecated Use {@link CHECK_IN_DATES} for sessions or {@link PROGRAM_CALENDAR_DATES} for all days. */
export const PROGRAM_DATES = CHECK_IN_DATES;

/** Calendar days in the programme (10 – 30 August 2026 = 21 days). */
export const PROGRAM_LENGTH = PROGRAM_CALENDAR_DATES.length;

/** Weekdays with sessions (15 days). */
export const CHECK_IN_DAY_COUNT = CHECK_IN_DATES.length;

export function isWithinProgramme(
  dateISO: string,
  startISO: string = PROGRAM_START_DATE,
  endISO: string = PROGRAM_END_DATE,
): boolean {
  return dateISO >= startISO && dateISO <= endISO;
}

export function isCheckInDay(dateISO: string): boolean {
  return isWithinProgramme(dateISO) && !isWeekend(fromISODate(dateISO));
}

/**
 * Calendar day number (1–21), or `null` outside the programme window.
 * Weekends count — Saturday 15 Aug is Day 6, Sunday 16 Aug is Day 7.
 */
export function getDayNumberForDate(dateISO: string): number | null {
  if (!isWithinProgramme(dateISO)) return null;
  const start = fromISODate(PROGRAM_START_DATE);
  const date = fromISODate(dateISO);
  const diffDays = Math.round((date.getTime() - start.getTime()) / 86_400_000);
  return diffDays + 1;
}

/** e.g. "10 – 31 August 2026". Derived, so it can never drift. */
export const PROGRAM_DATE_RANGE = (() => {
  const start = fromISODate(PROGRAM_START_DATE);
  const end = fromISODate(PROGRAM_END_DATE);
  const startMonth = start.toLocaleDateString("en-GB", { month: "long" });
  const endMonth = end.toLocaleDateString("en-GB", { month: "long" });
  const sameMonth = startMonth === endMonth && start.getFullYear() === end.getFullYear();

  return sameMonth
    ? `${start.getDate()} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`
    : `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
})();

/**
 * The whole schedule, generated from the dates above. Days and sessions are
 * not stored in the database — only check-ins are, and they point back here by
 * `sessionId`. Moving a programme date is therefore a code change, not a
 * migration.
 */
export function buildSchedule(
  calendarDates: string[] = PROGRAM_CALENDAR_DATES,
): {
  days: Day[];
  sessions: Session[];
} {
  const days: Day[] = [];
  const sessions: Session[] = [];

  calendarDates.forEach((date, index) => {
    const dayNumber = index + 1;
    const check_in_day = !isWeekend(fromISODate(date));
    days.push({ id: date, day_number: dayNumber, date, check_in_day });

    if (!check_in_day) return;

    for (const blueprint of SESSION_BLUEPRINT) {
      sessions.push({
        id: sessionId(date, blueprint.slot),
        name: blueprint.name,
        time: resolveSessionTime(dayNumber, blueprint.slot, blueprint.time),
        day_id: date,
        slot: blueprint.slot,
      });
    }
  });

  return { days, sessions };
}

/** Stable, human-readable session key. Also stored in `check_ins.session_id`. */
export function sessionId(date: string, slot: SessionSlot): string {
  return `${date}_${slot}`;
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

/** Local start time for a session on its programme day. */
export function sessionStartAt(day: Day, session: Session): Date {
  const [h, m] = session.time.split(":").map(Number);
  const start = fromISODate(day.date);
  start.setHours(h, m, 0, 0);
  return start;
}

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  upcoming: "Upcoming",
  live: "Live now",
  completed: "Completed",
};

