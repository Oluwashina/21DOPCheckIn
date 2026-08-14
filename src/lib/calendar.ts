import {
  buildSchedule,
  CHURCH_NAME,
  fromISODate,
  PROGRAM_NAME,
  PROGRAM_THEME,
  sessionStartAt,
  SESSION_DURATION_MINUTES,
  shortTimeLabel,
} from "./program";
import type { Day, Session } from "./types";

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsLocalDateTime(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}${mo}${d}T${h}${mi}${s}`;
}

function formatIcsUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildSessionEvent(day: Day, session: Session, stamp: string): string {
  const start = sessionStartAt(day, session);
  const end = new Date(start.getTime() + SESSION_DURATION_MINUTES * 60_000);

  return [
    "BEGIN:VEVENT",
    `UID:${session.id}@21dop-checkin`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatIcsLocalDateTime(start)}`,
    `DTEND:${formatIcsLocalDateTime(end)}`,
    `SUMMARY:${escapeIcsText(`Day ${day.day_number} · ${session.name}`)}`,
    `DESCRIPTION:${escapeIcsText(
      `${PROGRAM_NAME}: ${PROGRAM_THEME}\\n${CHURCH_NAME}\\nStarts ${shortTimeLabel(session.time)} (WAT)`,
    )}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText("Session starts in 30 minutes")}`,
    "END:VALARM",
    "END:VEVENT",
  ].join("\r\n");
}

/** Full programme calendar — one event per session, with a 30-minute alert each. */
export function buildProgramCalendarIcs(now: Date = new Date()): string {
  const { days, sessions } = buildSchedule();
  const dayById = new Map(days.map((day) => [day.id, day]));
  const stamp = formatIcsUtcStamp(now);

  const events = sessions
    .map((session) => {
      const day = dayById.get(session.day_id);
      return day ? buildSessionEvent(day, session, stamp) : "";
    })
    .filter(Boolean)
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The New Church//21 Days of Power Check-In//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(PROGRAM_NAME)}`,
    events,
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Client-side download — no server or third-party service needed. */
export function downloadProgramCalendar(now: Date = new Date()): void {
  const content = buildProgramCalendarIcs(now);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "21-days-of-power.ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Count events in an ICS string — useful for sanity checks. */
export function countCalendarEvents(ics: string): number {
  return (ics.match(/BEGIN:VEVENT/g) ?? []).length;
}

/** Day 5 evening override should appear in the generated file. */
export function calendarIncludesDay5SixPm(ics: string): boolean {
  const day5 = fromISODate("2026-08-14");
  day5.setHours(18, 0, 0, 0);
  return ics.includes(`DTSTART:${formatIcsLocalDateTime(day5)}`);
}
