import { getCurrentDayNumber, getSessionStatus, SESSION_BLUEPRINT } from "./program";
import type { CheckIn, Database, Day, Session, Team, User } from "./types";

export interface AccountabilityTotals {
  total: number;
  checkedIn: number;
  shared: number;
  liked: number;
}

export interface MemberRow {
  user: User;
  checked_in: boolean;
  shared_link: boolean;
  liked_youtube: boolean;
}

export interface MemberProgress {
  daysActive: number;
  daysElapsed: number;
  sessionsAttended: number;
  sessionsElapsed: number;
  shared: number;
  liked: number;
  streak: number;
  percent: number;
  perDay: { day: Day; attended: number; total: number; elapsed: number }[];
}

const slotOrder = new Map(SESSION_BLUEPRINT.map((item, index) => [item.slot, index]));

export function sortSessions(sessions: Session[]): Session[] {
  return [...sessions].sort(
    (a, b) => (slotOrder.get(a.slot) ?? 0) - (slotOrder.get(b.slot) ?? 0),
  );
}

export function getDayByNumber(db: Database, dayNumber: number): Day | undefined {
  return db.days.find((day) => day.day_number === dayNumber);
}

export function getCurrentDay(db: Database, now: Date = new Date()): Day {
  const dayNumber = getCurrentDayNumber(db.program_start, now);
  return getDayByNumber(db, dayNumber) ?? db.days[0];
}

export function getSessionsForDay(db: Database, dayId: string): Session[] {
  return sortSessions(db.sessions.filter((session) => session.day_id === dayId));
}

export function getSessionById(db: Database, sessionId: string): Session | undefined {
  return db.sessions.find((session) => session.id === sessionId);
}

export function getDayById(db: Database, dayId: string): Day | undefined {
  return db.days.find((day) => day.id === dayId);
}

export function getTeamById(db: Database, teamId: string | null): Team | undefined {
  if (!teamId) return undefined;
  return db.teams.find((team) => team.id === teamId);
}

/** Everyone who belongs to a team, lead first, then alphabetical. */
export function getTeamMembers(db: Database, teamId: string): User[] {
  const team = getTeamById(db, teamId);
  return db.users
    .filter((user) => user.team_id === teamId && user.role !== "admin")
    .sort((a, b) => {
      if (a.id === team?.team_lead_id) return -1;
      if (b.id === team?.team_lead_id) return 1;
      return a.name.localeCompare(b.name);
    });
}

export function findCheckIn(
  db: Database,
  userId: string,
  sessionId: string,
): CheckIn | undefined {
  return db.check_ins.find(
    (row) => row.user_id === userId && row.session_id === sessionId,
  );
}

/** Sessions that have already started — the fair denominator for any rate. */
export function getElapsedSessions(db: Database, now: Date = new Date()): Session[] {
  const dayById = new Map(db.days.map((day) => [day.id, day]));
  return db.sessions.filter((session) => {
    const day = dayById.get(session.day_id);
    return day ? getSessionStatus(day, session, now) !== "upcoming" : false;
  });
}

function emptyTotals(total: number): AccountabilityTotals {
  return { total, checkedIn: 0, shared: 0, liked: 0 };
}

/** Roll up the three accountability items for a set of users and sessions. */
export function tallyCheckIns(
  db: Database,
  userIds: string[],
  sessionIds: string[],
): AccountabilityTotals {
  const users = new Set(userIds);
  const sessions = new Set(sessionIds);
  const totals = emptyTotals(userIds.length * sessionIds.length);

  for (const row of db.check_ins) {
    if (!users.has(row.user_id) || !sessions.has(row.session_id)) continue;
    if (row.checked_in) totals.checkedIn += 1;
    if (row.shared_link) totals.shared += 1;
    if (row.liked_youtube) totals.liked += 1;
  }

  return totals;
}

export function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

/** Per-member status for one session — powers the team dashboard table. */
export function getMemberRowsForSession(
  db: Database,
  members: User[],
  sessionId: string,
): MemberRow[] {
  const rows = new Map(
    db.check_ins
      .filter((row) => row.session_id === sessionId)
      .map((row) => [row.user_id, row]),
  );

  return members.map((user) => {
    const row = rows.get(user.id);
    return {
      user,
      checked_in: Boolean(row?.checked_in),
      shared_link: Boolean(row?.shared_link),
      liked_youtube: Boolean(row?.liked_youtube),
    };
  });
}

/** Per-member status across a whole day (any session counts). */
export function getMemberRowsForDay(
  db: Database,
  members: User[],
  dayId: string,
): MemberRow[] {
  const sessionIds = new Set(
    db.sessions.filter((session) => session.day_id === dayId).map((session) => session.id),
  );
  const byUser = new Map<string, Omit<MemberRow, "user">>();

  for (const row of db.check_ins) {
    if (!sessionIds.has(row.session_id)) continue;
    const existing = byUser.get(row.user_id);
    byUser.set(row.user_id, {
      checked_in: Boolean(existing?.checked_in) || row.checked_in,
      shared_link: Boolean(existing?.shared_link) || row.shared_link,
      liked_youtube: Boolean(existing?.liked_youtube) || row.liked_youtube,
    });
  }

  return members.map((user) => {
    const row = byUser.get(user.id);
    return {
      user,
      checked_in: Boolean(row?.checked_in),
      shared_link: Boolean(row?.shared_link),
      liked_youtube: Boolean(row?.liked_youtube),
    };
  });
}

export function getTeamStatsForDay(
  db: Database,
  teamId: string,
  dayId: string,
): AccountabilityTotals & { members: number } {
  const members = getTeamMembers(db, teamId).filter((user) => user.active);
  const rows = getMemberRowsForDay(db, members, dayId);

  return {
    members: members.length,
    total: members.length,
    checkedIn: rows.filter((row) => row.checked_in).length,
    shared: rows.filter((row) => row.shared_link).length,
    liked: rows.filter((row) => row.liked_youtube).length,
  };
}

/** Overall attendance rate for a team across every session so far. */
export function getTeamAttendanceRate(
  db: Database,
  teamId: string,
  now: Date = new Date(),
): number {
  const members = getTeamMembers(db, teamId).filter((user) => user.active);
  const elapsed = getElapsedSessions(db, now);
  if (members.length === 0 || elapsed.length === 0) return 0;

  const totals = tallyCheckIns(
    db,
    members.map((user) => user.id),
    elapsed.map((session) => session.id),
  );
  return percent(totals.checkedIn, members.length * elapsed.length);
}

export function getProgramTotals(
  db: Database,
  now: Date = new Date(),
): AccountabilityTotals & { attendanceRate: number } {
  const participants = db.users.filter((user) => user.role !== "admin" && user.active);
  const elapsed = getElapsedSessions(db, now);
  const totals = tallyCheckIns(
    db,
    participants.map((user) => user.id),
    elapsed.map((session) => session.id),
  );

  return {
    ...totals,
    attendanceRate: percent(totals.checkedIn, participants.length * elapsed.length),
  };
}

/** Everything the "My Progress" page needs for one member. */
export function getMemberProgress(
  db: Database,
  userId: string,
  now: Date = new Date(),
): MemberProgress {
  const rows = new Map(
    db.check_ins.filter((row) => row.user_id === userId).map((row) => [row.session_id, row]),
  );

  let sessionsAttended = 0;
  let sessionsElapsed = 0;
  let shared = 0;
  let liked = 0;
  let daysActive = 0;
  let daysElapsed = 0;
  let streak = 0;

  const perDay = db.days.map((day) => {
    const sessions = getSessionsForDay(db, day.id);
    const elapsedSessions = sessions.filter(
      (session) => getSessionStatus(day, session, now) !== "upcoming",
    );

    let attended = 0;
    for (const session of elapsedSessions) {
      const row = rows.get(session.id);
      if (row?.checked_in) attended += 1;
      if (row?.shared_link) shared += 1;
      if (row?.liked_youtube) liked += 1;
    }

    sessionsAttended += attended;
    sessionsElapsed += elapsedSessions.length;

    if (elapsedSessions.length > 0) {
      daysElapsed += 1;
      if (attended > 0) {
        daysActive += 1;
        streak += 1;
      } else {
        streak = 0;
      }
    }

    return { day, attended, total: sessions.length, elapsed: elapsedSessions.length };
  });

  return {
    daysActive,
    daysElapsed,
    sessionsAttended,
    sessionsElapsed,
    shared,
    liked,
    streak,
    percent: percent(daysActive, db.days.length),
    perDay,
  };
}
