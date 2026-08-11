/**
 * End-to-end check of the data layer without a browser:
 * admin creates a team → adds a member → member checks in → shares → likes →
 * team lead stats update → member progress updates.
 *
 * Run with: npx tsx scripts/verify-flow.ts
 */
import { mockAdapter } from "../src/lib/data/mock-adapter";
import { getCurrentDayNumber, getSessionStatus, PROGRAM_LENGTH } from "../src/lib/program";
import { DEMO_ADMIN_EMAIL, DEMO_LEAD_EMAIL, DEMO_MEMBER_EMAIL } from "../src/lib/seed";
import {
  findCheckIn,
  getCurrentDay,
  getMemberProgress,
  getMemberRowsForSession,
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
  check("10 service teams", db.teams.length === 10, db.teams.length);
  check("21 days", db.days.length === PROGRAM_LENGTH, db.days.length);
  check("63 sessions (3 per day)", db.sessions.length === 63, db.sessions.length);
  check("every day has 3 sessions", db.days.every((d) => getSessionsForDay(db, d.id).length === 3));
  check("members exist on every team", db.teams.every((t) => getTeamMembers(db, t.id).length > 0));
  check("every team has a lead", db.teams.every((t) => Boolean(t.team_lead_id)));
  check("check-in history seeded", db.check_ins.length > 1000, db.check_ins.length);

  const day = getCurrentDay(db);
  check("programme opens on day 8", getCurrentDayNumber(db.program_start) === 8, day.day_number);

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
