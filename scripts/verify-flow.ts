/**
 * Checks the programme schedule and every roll-up the dashboards depend on,
 * without a browser or a database. Reads and writes now go to Supabase, so
 * this builds a small fixture in memory and exercises the pure logic against
 * it — the part that decides who counts as present, and on which day.
 *
 * Run with: npm run verify
 */
import {
  buildSchedule,
  CHECK_IN_DAY_COUNT,
  fromISODate,
  getDayNumberForDate,
  getSessionStatus,
  isCheckInDay,
  isWeekend,
  isWithinProgramme,
  PROGRAM_END_DATE,
  PROGRAM_LENGTH,
  PROGRAM_START_DATE,
  resolveSessionTime,
  sessionId,
  SESSION_BLUEPRINT,
  TEAM_NAMES,
  todayISO,
  toISODate,
} from "../src/lib/program";
import {
  findCheckIn,
  getCurrentDay,
  getElapsedSessions,
  getMemberProgress,
  getMemberRowsForSession,
  getParticipants,
  getProgramTotals,
  getSessionsForDay,
  getTeamAttendanceRate,
  getTeamMembers,
  getTeamStatsForDay,
  isRestDay,
} from "../src/lib/stats";
import { toCSV } from "../src/lib/csv";
import {
  buildProgramCalendarIcs,
  calendarIncludesDay5SixPm,
  countCalendarEvents,
} from "../src/lib/calendar";
import { getSessionReminder, REMINDER_MINUTES_BEFORE } from "../src/lib/reminders";
import type { CheckIn, Database, User } from "../src/lib/types";

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label}`, detail ?? "");
  }
}

/** Mirrors the CHECK constraint on `check_ins.session_id` in schema.sql. */
const SESSION_ID_PATTERN = /^\d{4}-\d{2}-\d{2}_(whirlwind|uncut|power_night)$/;

const TEAM_A = "11111111-1111-1111-1111-111111111111";
const TEAM_B = "22222222-2222-2222-2222-222222222222";

function person(id: string, name: string, teamId: string | null, role: User["role"]): User {
  return {
    id,
    name,
    email: `${id}@example.com`,
    phone: "",
    role,
    team_id: teamId,
    active: true,
    created_at: "2026-08-01T00:00:00.000Z",
  };
}

function checkIn(userId: string, session: string, values: Partial<CheckIn> = {}): CheckIn {
  return {
    id: `${userId}:${session}`,
    user_id: userId,
    session_id: session,
    checked_in: true,
    shared_link: false,
    liked_youtube: false,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...values,
  };
}

function buildFixture(): Database {
  const { days, sessions } = buildSchedule();

  return {
    users: [
      person("lead-a", "Ada Lead", TEAM_A, "team_lead"),
      person("member-a", "Bola Member", TEAM_A, "member"),
      person("member-b", "Chidi Member", TEAM_A, "member"),
      person("lead-b", "Dara Lead", TEAM_B, "team_lead"),
      person("admin", "Pastor Admin", null, "admin"),
    ],
    teams: [
      { id: TEAM_A, name: "The New Music", team_lead_id: "lead-a", created_at: "" },
      { id: TEAM_B, name: "Comms", team_lead_id: "lead-b", created_at: "" },
    ],
    days,
    sessions,
    check_ins: [],
    program_start: PROGRAM_START_DATE,
  };
}

function main() {
  console.log("\nPROGRAMME SCHEDULE");
  const db = buildFixture();

  check(`${PROGRAM_LENGTH} calendar programme days`, db.days.length === PROGRAM_LENGTH, db.days.length);
  check(
    `${CHECK_IN_DAY_COUNT * 3} check-in sessions (3 per weekday)`,
    db.sessions.length === CHECK_IN_DAY_COUNT * 3,
    db.sessions.length,
  );
  check(
    "every check-in day has 3 sessions",
    db.days
      .filter((item) => item.check_in_day)
      .every((item) => getSessionsForDay(db, item.id).length === 3),
  );
  check(
    "weekends are programme days without sessions",
    db.days
      .filter((item) => !item.check_in_day)
      .every((item) => getSessionsForDay(db, item.id).length === 0),
  );
  check("17 august is day 8", getDayNumberForDate("2026-08-17") === 8);
  check("30 august is day 21", getDayNumberForDate("2026-08-30") === 21);
  check(
    "every session id matches the database constraint",
    db.sessions.every((session) => SESSION_ID_PATTERN.test(session.id)),
    db.sessions.find((session) => !SESSION_ID_PATTERN.test(session.id))?.id,
  );
  check(
    "session ids are unique",
    new Set(db.sessions.map((session) => session.id)).size === db.sessions.length,
  );
  check(
    "session ids are stable across rebuilds",
    buildSchedule().sessions[0].id === db.sessions[0].id,
  );

  // Programme ends on Sunday 30 August — the last calendar day.
  check(
    "the programme ends on the last calendar day",
    db.days[db.days.length - 1].date === PROGRAM_END_DATE,
    db.days[db.days.length - 1].date,
  );
  check(
    "no programme day falls outside the window",
    db.days.every((d) => d.date >= PROGRAM_START_DATE && d.date <= PROGRAM_END_DATE),
  );
  check(
    "no session lands on a weekend",
    db.sessions.every((session) => !isWeekend(fromISODate(session.day_id))),
  );
  check(
    "days run in strict calendar order",
    db.days.every((d, i) => i === 0 || d.date > db.days[i - 1].date),
  );
  check(
    "evening session defaults to 6:30pm",
    SESSION_BLUEPRINT.some((s) => s.slot === "power_night" && s.time === "18:30"),
  );
  const day5 = db.days.find((d) => d.day_number === 5);
  const day5Evening = day5
    ? getSessionsForDay(db, day5.id).find((s) => s.slot === "power_night")
    : undefined;
  check("day 5 evening session starts at 6pm", day5Evening?.time === "18:00", day5Evening?.time);
  const day4 = db.days.find((d) => d.day_number === 4);
  const day4Evening = day4
    ? getSessionsForDay(db, day4.id).find((s) => s.slot === "power_night")
    : undefined;
  check(
    "other days keep the default evening start",
    day4Evening?.time === "18:30",
    day4Evening?.time,
  );
  check(
    "session time overrides resolve correctly",
    resolveSessionTime(5, "power_night", "18:30") === "18:00" &&
      resolveSessionTime(4, "power_night", "18:30") === "18:30",
  );

  console.log("\nREMINDERS AND CALENDAR");
  const ics = buildProgramCalendarIcs(new Date("2026-08-01T12:00:00.000Z"));
  check(
    "calendar export includes every session",
    countCalendarEvents(ics) === CHECK_IN_DAY_COUNT * 3,
    countCalendarEvents(ics),
  );
  check("calendar includes day 5 evening at 6pm", calendarIncludesDay5SixPm(ics));
  check(
    "calendar events include 30-minute alerts",
    (ics.match(/BEGIN:VALARM/g) ?? []).length === CHECK_IN_DAY_COUNT * 3,
  );

  const reminderDay = db.days.find((d) => d.day_number === 1)!;
  const reminderSession = getSessionsForDay(db, reminderDay.id)[0];
  const reminderStart = new Date("2026-08-10T06:35:00");
  check(
    "in-app reminder fires within 30 minutes of start",
    getSessionReminder(db, "member-a", reminderStart)?.session.id === reminderSession.id,
  );
  check(
    "in-app reminder is quiet outside the 30-minute window",
    getSessionReminder(db, "member-a", new Date("2026-08-10T05:00:00")) === null,
  );
  check(
    "in-app reminder is quiet after check-in",
    (() => {
      const reminderDb = buildFixture();
      reminderDb.check_ins.push(checkIn("member-a", reminderSession.id));
      return getSessionReminder(reminderDb, "member-a", reminderStart) === null;
    })(),
  );
  check("reminder window is 30 minutes", REMINDER_MINUTES_BEFORE === 30);

  check(`${TEAM_NAMES.length} service teams configured`, TEAM_NAMES.length === 15);

  const day = getCurrentDay(db);
  const today = todayISO();
  const todayNumber = getDayNumberForDate(today);
  check(
    todayNumber
      ? `today is day ${todayNumber} of the programme`
      : "today is outside the programme window",
    todayNumber ? day.day_number === todayNumber : !isWithinProgramme(today),
    { today, showing: day.date },
  );
  check(
    "rest days are recognised",
    isRestDay(db) === (isWithinProgramme(today) && !isCheckInDay(today)),
  );

  const sampleCheckInDay =
    db.days.find((item) => item.check_in_day) ?? db.days[0];

  console.log("\nCHECKING IN");
  const sessions = getSessionsForDay(db, sampleCheckInDay.id);
  const target = sessions[sessions.length - 1];
  check(
    "session id is built from date and slot",
    target.id === sessionId(sampleCheckInDay.date, target.slot),
  );

  const before = getTeamStatsForDay(db, TEAM_A, sampleCheckInDay.id);
  check("nobody has checked in yet", before.checkedIn === 0);

  // Checked in, but not shared or liked yet — the three items are independent.
  db.check_ins.push(checkIn("member-a", target.id));
  const partial = findCheckIn(db, "member-a", target.id)!;
  check(
    "a check-in can stand alone, without a share or a like",
    partial.checked_in && !partial.shared_link && !partial.liked_youtube,
  );

  db.check_ins = db.check_ins.map((row) =>
    row.user_id === "member-a" && row.session_id === target.id
      ? { ...row, shared_link: true, liked_youtube: true }
      : row,
  );
  const updated = findCheckIn(db, "member-a", target.id)!;
  check("share and like can be ticked off later", updated.shared_link && updated.liked_youtube);
  check(
    "one row per person per session",
    db.check_ins.filter((r) => r.user_id === "member-a" && r.session_id === target.id).length === 1,
  );

  console.log("\nTEAM AND PERSONAL ROLL-UPS");
  const after = getTeamStatsForDay(db, TEAM_A, sampleCheckInDay.id);
  check("team day stats reflect the check-in", after.checkedIn === before.checkedIn + 1, {
    before: before.checkedIn,
    after: after.checkedIn,
  });
  check("the lead counts in their own team's roster", getTeamMembers(db, TEAM_A).length === 3);
  check("the lead is listed first", getTeamMembers(db, TEAM_A)[0].id === "lead-a");

  const rows = getMemberRowsForSession(db, getTeamMembers(db, TEAM_A), target.id);
  const memberRow = rows.find((r) => r.user.id === "member-a")!;
  check(
    "member shows as present on the team table",
    memberRow.checked_in && memberRow.shared_link && memberRow.liked_youtube,
  );
  check(
    "a member who did nothing shows as absent",
    rows.find((r) => r.user.id === "member-b")?.checked_in === false,
  );

  const progress = getMemberProgress(db, "member-a");
  check("personal progress counts the session", progress.sessionsAttended === 1);
  check("progress percentages stay in range", progress.percent >= 0 && progress.percent <= 100);
  check(
    "streak is within the programme length",
    progress.streak >= 0 && progress.streak <= PROGRAM_LENGTH,
    progress.streak,
  );
  check("a day with no attendance breaks the streak", getMemberProgress(db, "member-b").streak === 0);
  check(
    "progress never counts sessions that have not happened",
    progress.sessionsElapsed === getElapsedSessions(db).length,
  );

  const rate = getTeamAttendanceRate(db, TEAM_A);
  check("team attendance rate is a sane percentage", rate >= 0 && rate <= 100, rate);
  check("a team with no check-ins scores zero", getTeamAttendanceRate(db, TEAM_B) === 0);

  console.log("\nTHE ADMIN TAKES PART TOO");
  check(
    "admin counts as a participant",
    getParticipants(db).some((u) => u.id === "admin"),
  );
  const totalsBefore = getProgramTotals(db);
  db.check_ins.push(checkIn("admin", target.id, { shared_link: true }));
  check(
    "admin check-in lands in the programme totals",
    getProgramTotals(db).checkedIn === totalsBefore.checkedIn + 1,
  );
  check("admin has their own progress", getMemberProgress(db, "admin").sessionsAttended === 1);

  db.users = db.users.map((u) => (u.id === "admin" ? { ...u, team_id: TEAM_A } : u));
  check(
    "an admin who joins a team appears on its roster",
    getTeamMembers(db, TEAM_A).some((u) => u.id === "admin"),
  );

  console.log("\nDEACTIVATED PEOPLE");
  db.users = db.users.map((u) => (u.id === "member-b" ? { ...u, active: false } : u));
  check(
    "a deactivated member drops out of team stats",
    getTeamStatsForDay(db, TEAM_A, sampleCheckInDay.id).members === 3,
  );
  check(
    "a deactivated member drops out of programme totals",
    !getParticipants(db).some((u) => u.id === "member-b"),
  );

  console.log("\nREPORTING");
  const csv = toCSV(
    ["Team", "Rate"],
    db.teams.map((t) => [t.name, getTeamAttendanceRate(db, t.id)]),
  );
  check("CSV export builds", csv.split("\n").length === db.teams.length + 1);
  check("CSV escapes are applied", toCSV(["A"], [["x, y"]]).includes('"x, y"'));

  console.log(
    failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main();
