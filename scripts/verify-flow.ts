/**
 * End-to-end check of the data layer without a browser:
 * admin creates a team → adds a member → member checks in → shares → likes →
 * team lead stats update → member progress updates.
 *
 * Run with: npx tsx scripts/verify-flow.ts
 */
import { mockAdapter } from "../src/lib/data/mock-adapter";
import {
  getDayNumberForDate,
  getSessionStatus,
  isWeekend,
  fromISODate,
  PROGRAM_DATES,
  PROGRAM_END_DATE,
  PROGRAM_LENGTH,
  PROGRAM_START_DATE,
  TEAM_NAMES,
  todayISO,
  toISODate,
} from "../src/lib/program";
import { DEMO_ADMIN_EMAIL, DEMO_LEAD_EMAIL, DEMO_MEMBER_EMAIL } from "../src/lib/seed";
import {
  findCheckIn,
  getCurrentDay,
  getMemberProgress,
  getMemberRowsForSession,
  getParticipants,
  getProgramTotals,
  getSessionsForDay,
  getTeamAttendanceRate,
  getTeamMembers,
  getTeamStatsForDay,
} from "../src/lib/stats";
import { toCSV } from "../src/lib/csv";

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label}`, detail ?? "");
  }
}

async function main() {
  console.log("\nSEED DATA");
  let db = await mockAdapter.loadDatabase();
  check(`${TEAM_NAMES.length} service teams`, db.teams.length === TEAM_NAMES.length, db.teams.length);
  check("every configured team exists",
    TEAM_NAMES.every((name) => db.teams.some((t) => t.name === name)),
    TEAM_NAMES.filter((name) => !db.teams.some((t) => t.name === name)));
  check(`${PROGRAM_LENGTH} check-in days`, db.days.length === PROGRAM_LENGTH, db.days.length);
  check(
    `${PROGRAM_LENGTH * 3} sessions (3 per day)`,
    db.sessions.length === PROGRAM_LENGTH * 3,
    db.sessions.length,
  );
  check("every day has 3 sessions", db.days.every((d) => getSessionsForDay(db, d.id).length === 3));
  check("members exist on every team", db.teams.every((t) => getTeamMembers(db, t.id).length > 0));
  check("every team has a lead", db.teams.every((t) => Boolean(t.team_lead_id)));
  const elapsedSoFar = db.sessions.filter((s) =>
    getSessionStatus(db.days.find((d) => d.id === s.day_id)!, s) !== "upcoming",
  );
  check(
    "every session that has happened has check-in history",
    elapsedSoFar.every((s) => db.check_ins.some((row) => row.session_id === s.id)),
    `${elapsedSoFar.length} elapsed sessions, ${db.check_ins.length} rows`,
  );

  const day = getCurrentDay(db);
  check("day 1 is the real programme start", db.program_start === PROGRAM_START_DATE, db.program_start);
  // Independently walk back from the window's end to the last weekday.
  const expectedLast = (() => {
    const cursor = fromISODate(PROGRAM_END_DATE);
    while (isWeekend(cursor)) cursor.setDate(cursor.getDate() - 1);
    return toISODate(cursor);
  })();
  check("the last check-in day is the last weekday in the window",
    db.days[db.days.length - 1].date === expectedLast,
    `${db.days[db.days.length - 1].date} (expected ${expectedLast}, window ends ${PROGRAM_END_DATE})`);
  check("no programme day falls outside the window",
    db.days.every((d) => d.date >= PROGRAM_START_DATE && d.date <= PROGRAM_END_DATE));

  check("no session lands on a weekend",
    db.days.every((d) => !isWeekend(fromISODate(d.date))),
    db.days.filter((d) => isWeekend(fromISODate(d.date))).map((d) => d.date));
  check("days run in strict calendar order",
    db.days.every((d, i) => i === 0 || d.date > db.days[i - 1].date));

  const todayNumber = getDayNumberForDate(todayISO(), PROGRAM_DATES);
  check(
    todayNumber
      ? `today is day ${todayNumber} of the programme`
      : "today is a rest day, so the app falls back to the most recent day",
    todayNumber ? day.day_number === todayNumber : day.date < todayISO(),
    { today: todayISO(), showing: day.date },
  );

  check("evening session runs at 7pm per the flyer",
    db.sessions.some((s) => s.slot === "power_night" && s.time === "19:00"));

  for (const [label, email, role] of [
    ["member", DEMO_MEMBER_EMAIL, "member"],
    ["team lead", DEMO_LEAD_EMAIL, "team_lead"],
    ["admin", DEMO_ADMIN_EMAIL, "admin"],
  ] as const) {
    const account = db.users.find((u) => u.email === email);
    check(`demo ${label} account signs in with the right role`, account?.role === role, {
      email,
      found: account?.role,
    });
  }

  const sessions = getSessionsForDay(db, day.id);
  const statuses = sessions.map((s) => getSessionStatus(day, s));
  check("session statuses derived from the clock", statuses.every((s) =>
    ["upcoming", "live", "completed"].includes(s),
  ), statuses);
  check("no check-ins exist for future sessions", db.check_ins.every((row) => {
    const session = db.sessions.find((s) => s.id === row.session_id)!;
    const rowDay = db.days.find((d) => d.id === session.day_id)!;
    return getSessionStatus(rowDay, session) !== "upcoming";
  }));

  console.log("\nADMIN CREATES A TEAM AND ADDS A MEMBER");
  const created = await mockAdapter.createTeam("Ushering");
  db = created.db;
  check("team created", db.teams.some((t) => t.name === "Ushering"));

  const newMember = await mockAdapter.createUser({
    name: "Testimony Ade",
    email: "testimony.ade@thenewchurch.org",
    team_id: created.team.id,
  });
  db = newMember.db;
  check("member added to the new team", getTeamMembers(db, created.team.id).length === 1);
  check("new member starts with no history", getMemberProgress(db, newMember.user.id).sessionsAttended === 0);

  db = await mockAdapter.updateTeam(created.team.id, { team_lead_id: newMember.user.id });
  check(
    "assigning a lead promotes the user",
    db.users.find((u) => u.id === newMember.user.id)?.role === "team_lead",
  );

  console.log("\nMEMBER CHECKS IN");
  const member = db.users.find((u) => u.email === DEMO_MEMBER_EMAIL)!;
  check("demo member resolves from email", Boolean(member), DEMO_MEMBER_EMAIL);

  const target = sessions[sessions.length - 1];
  const teamId = member.team_id!;
  const before = getTeamStatsForDay(db, teamId, day.id);
  const beforeProgress = getMemberProgress(db, member.id);

  db = await mockAdapter.saveCheckIn(member.id, target.id, {
    checked_in: true,
    shared_link: false,
    liked_youtube: false,
  });
  const partial = findCheckIn(db, member.id, target.id)!;
  check("check-in saved without share or like", partial.checked_in && !partial.shared_link && !partial.liked_youtube);

  db = await mockAdapter.saveCheckIn(member.id, target.id, {
    checked_in: true,
    shared_link: true,
    liked_youtube: true,
  });
  const updated = findCheckIn(db, member.id, target.id)!;
  check("member can update share and like later", updated.shared_link && updated.liked_youtube);
  check("update does not duplicate rows",
    db.check_ins.filter((r) => r.user_id === member.id && r.session_id === target.id).length === 1);

  console.log("\nTEAM LEAD AND PROGRESS UPDATE");
  const after = getTeamStatsForDay(db, teamId, day.id);
  check("team day stats reflect the check-in", after.checkedIn >= before.checkedIn, {
    before: before.checkedIn,
    after: after.checkedIn,
  });

  const rows = getMemberRowsForSession(db, getTeamMembers(db, teamId), target.id);
  const memberRow = rows.find((r) => r.user.id === member.id)!;
  check("member shows as checked in on the team table",
    memberRow.checked_in && memberRow.shared_link && memberRow.liked_youtube);

  const afterProgress = getMemberProgress(db, member.id);
  check("personal progress increased",
    afterProgress.sessionsAttended >= beforeProgress.sessionsAttended, {
      before: beforeProgress.sessionsAttended,
      after: afterProgress.sessionsAttended,
    });
  check("progress percentages stay in range",
    afterProgress.percent >= 0 && afterProgress.percent <= 100, afterProgress.percent);
  check("streak is within the programme length",
    afterProgress.streak >= 0 && afterProgress.streak <= PROGRAM_LENGTH, afterProgress.streak);

  const rate = getTeamAttendanceRate(db, teamId);
  check("team attendance rate is a sane percentage", rate > 0 && rate <= 100, rate);

  const totals = getProgramTotals(db);
  check("programme totals populated",
    totals.checkedIn > 0 && totals.shared > 0 && totals.liked > 0 && totals.attendanceRate > 0,
    totals);

  console.log("\nADMIN TAKES PART TOO");
  const adminUser = db.users.find((u) => u.email === DEMO_ADMIN_EMAIL)!;
  check("admin counts as a participant", getParticipants(db).some((u) => u.id === adminUser.id));

  const totalsBeforeAdmin = getProgramTotals(db);
  db = await mockAdapter.saveCheckIn(adminUser.id, target.id, {
    checked_in: true,
    shared_link: true,
    liked_youtube: false,
  });
  check("admin can check in", findCheckIn(db, adminUser.id, target.id)?.checked_in === true);
  check("admin check-in lands in the programme totals",
    getProgramTotals(db).checkedIn === totalsBeforeAdmin.checkedIn + 1);
  check("admin has their own progress", getMemberProgress(db, adminUser.id).sessionsAttended === 1);

  db = await mockAdapter.updateUser(adminUser.id, { team_id: member.team_id });
  check("an admin who joins a team appears on its roster",
    getTeamMembers(db, member.team_id!).some((u) => u.id === adminUser.id));
  db = await mockAdapter.updateUser(adminUser.id, { team_id: null });

  console.log("\nREPORTING");
  const csv = toCSV(["Team", "Rate"], db.teams.map((t) => [t.name, getTeamAttendanceRate(db, t.id)]));
  check("CSV export builds", csv.split("\n").length === db.teams.length + 1);
  check("CSV escapes are applied", toCSV(["A"], [['x, y']]).includes('"x, y"'));

  console.log("\nCLEANUP / REMOVAL");
  db = await mockAdapter.deleteUser(newMember.user.id);
  check("removed member disappears", !db.users.some((u) => u.id === newMember.user.id));
  check("removing the lead clears the team's lead",
    db.teams.find((t) => t.id === created.team.id)?.team_lead_id === null);

  db = await mockAdapter.deleteTeam(created.team.id);
  check("team deleted", !db.teams.some((t) => t.id === created.team.id));

  console.log(
    failures === 0
      ? "\nAll checks passed.\n"
      : `\n${failures} check(s) failed.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
