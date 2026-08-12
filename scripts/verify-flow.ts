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
  fromISODate,
  getDayNumberForDate,
  getSessionStatus,
  isWeekend,
  PROGRAM_DATES,
  PROGRAM_END_DATE,
  PROGRAM_LENGTH,
  PROGRAM_START_DATE,
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

  check(`${PROGRAM_LENGTH} check-in days`, db.days.length === PROGRAM_LENGTH, db.days.length);
  check(
    `${PROGRAM_LENGTH * 3} sessions (3 per day)`,
    db.sessions.length === PROGRAM_LENGTH * 3,
    db.sessions.length,
  );
  check(
    "every day has 3 sessions",
    db.days.every((day) => getSessionsForDay(db, day.id).length === 3),
  );
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

  // Independently walk back from the window's end to the last weekday.
  const expectedLast = (() => {
    const cursor = fromISODate(PROGRAM_END_DATE);
    while (isWeekend(cursor)) cursor.setDate(cursor.getDate() - 1);
    return toISODate(cursor);
  })();
  check(
    "the last check-in day is the last weekday in the window",
    db.days[db.days.length - 1].date === expectedLast,
    `${db.days[db.days.length - 1].date} (expected ${expectedLast})`,
  );
  check(
    "no programme day falls outside the window",
    db.days.every((d) => d.date >= PROGRAM_START_DATE && d.date <= PROGRAM_END_DATE),
  );
  check(
    "no session lands on a weekend",
    db.days.every((d) => !isWeekend(fromISODate(d.date))),
    db.days.filter((d) => isWeekend(fromISODate(d.date))).map((d) => d.date),
  );
  check(
    "days run in strict calendar order",
    db.days.every((d, i) => i === 0 || d.date > db.days[i - 1].date),
  );
  check(
    "evening session runs at 6:30pm per the flyer",
    SESSION_BLUEPRINT.some((s) => s.slot === "power_night" && s.time === "18:30"),
  );
  check(`${TEAM_NAMES.length} service teams configured`, TEAM_NAMES.length === 15);

  const day = getCurrentDay(db);
  const todayNumber = getDayNumberForDate(todayISO(), PROGRAM_DATES);
  check(
    todayNumber
      ? `today is day ${todayNumber} of the programme`
      : "today is a rest day, so the app falls back to the most recent day",
    todayNumber ? day.day_number === todayNumber : day.date < todayISO(),
    { today: todayISO(), showing: day.date },
  );
  check(
    "rest days are recognised",
    isRestDay(db) === (todayNumber === null),
  );

  console.log("\nCHECKING IN");
  const sessions = getSessionsForDay(db, day.id);
  const target = sessions[sessions.length - 1];
  check("session id is built from date and slot", target.id === sessionId(day.date, target.slot));

  const before = getTeamStatsForDay(db, TEAM_A, day.id);
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
  const after = getTeamStatsForDay(db, TEAM_A, day.id);
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
    getTeamStatsForDay(db, TEAM_A, day.id).members === 3,
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
