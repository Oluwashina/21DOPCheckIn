import {
  PROGRAM_LENGTH,
  PROGRAM_START_DATE,
  SESSION_BLUEPRINT,
  TEAM_NAMES,
  buildProgramDates,
  getSessionStatus,
} from "./program";
import type { CheckIn, Database, Day, Session, Team, User } from "./types";

/** Deterministic PRNG so the demo data looks the same on every device. */
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "John", "Jane", "Samuel", "David", "Grace", "Daniel", "Esther", "Joshua", "Mary", "Peter",
  "Ruth", "Emmanuel", "Deborah", "Michael", "Faith", "Timothy", "Rachel", "Caleb", "Hannah", "Isaac",
  "Naomi", "Paul", "Abigail", "Stephen", "Priscilla", "Elijah", "Miriam", "Nathan", "Lydia", "Simon",
  "Tolu", "Chidi", "Ada", "Femi", "Zainab", "Ifeoma", "Segun", "Ngozi", "Bola", "Uche",
  "Kemi", "Tunde", "Amaka", "Yemi", "Chioma", "Bisi", "Obi", "Funke", "Ejiro", "Sade",
];

const LAST_NAMES = [
  "Doe", "Okafor", "Adeyemi", "Balogun", "Eze", "Okonkwo", "Adebayo", "Nwosu", "Oyelaran", "Ibrahim",
  "Johnson", "Williams", "Bello", "Chukwu", "Danjuma", "Ekpo", "Fashola", "Gbadamosi", "Hassan", "Igwe",
  "Jegede", "Kalu", "Lawal", "Mensah", "Nkemdirim", "Obi", "Peters", "Quadri", "Raji", "Sanusi",
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Team engagement baselines, tuned to produce the spread shown in the brief. */
const TEAM_PROFILE: Record<string, { size: number; strength: number }> = {
  "The New Music": { size: 24, strength: 0.91 },
  Amplified: { size: 21, strength: 0.87 },
  Treasureville: { size: 19, strength: 0.84 },
  Comms: { size: 16, strength: 0.93 },
  Heralds: { size: 22, strength: 0.78 },
  Templars: { size: 18, strength: 0.88 },
  Shutterbox: { size: 14, strength: 0.95 },
  Elites: { size: 20, strength: 0.82 },
  Marshalls: { size: 23, strength: 0.76 },
  Amiables: { size: 17, strength: 0.89 },
};

export const DEMO_ADMIN_EMAIL = "admin@thenewchurch.org";
export const DEMO_LEAD_EMAIL = "lead.thenewmusic@thenewchurch.org";
export const DEMO_MEMBER_EMAIL = "john-doe@thenewchurch.org";

/**
 * Builds the full demo dataset against the real programme dates
 * (10–30 August 2026), so the day number always matches the actual calendar.
 */
export function buildSeedDatabase(now: Date = new Date()): Database {
  const random = mulberry32(21_2026);
  const nowISO = now.toISOString();

  const programDates = buildProgramDates();
  const program_start = PROGRAM_START_DATE;

  const days: Day[] = [];
  const sessions: Session[] = [];

  for (let i = 0; i < PROGRAM_LENGTH; i += 1) {
    const dayNumber = i + 1;
    const day: Day = {
      id: `day-${dayNumber}`,
      day_number: dayNumber,
      date: programDates[i],
    };
    days.push(day);

    for (const blueprint of SESSION_BLUEPRINT) {
      sessions.push({
        id: `session-${dayNumber}-${blueprint.slot}`,
        name: blueprint.name,
        time: blueprint.time,
        day_id: day.id,
        slot: blueprint.slot,
      });
    }
  }

  const teams: Team[] = [];
  const users: User[] = [];
  const usedNames = new Set<string>(PINNED_NEW_MUSIC);

  const admin: User = {
    id: "user-admin",
    name: "Pastor Grace Adeyemi",
    email: DEMO_ADMIN_EMAIL,
    phone: "+234 801 000 0001",
    role: "admin",
    team_id: null,
    active: true,
    created_at: nowISO,
  };
  users.push(admin);

  TEAM_NAMES.forEach((teamName, teamIndex) => {
    const profile = TEAM_PROFILE[teamName] ?? { size: 18, strength: 0.85 };
    const teamId = `team-${slugify(teamName)}`;

    const leadId = `user-${slugify(teamName)}-lead`;
    const leadName = uniqueName(random, usedNames);
    users.push({
      id: leadId,
      name: leadName,
      email: `lead.${slugify(teamName).replace(/-/g, "")}@thenewchurch.org`,
      phone: `+234 802 000 ${String(1000 + teamIndex).slice(-4)}`,
      role: "team_lead",
      team_id: teamId,
      active: true,
      created_at: nowISO,
    });

    teams.push({
      id: teamId,
      name: teamName,
      team_lead_id: leadId,
      created_at: nowISO,
    });

    for (let i = 0; i < profile.size; i += 1) {
      // The brief's example roster leads The New Music, so pin those names.
      const pinned = teamName === "The New Music" ? PINNED_NEW_MUSIC[i] : undefined;
      const name = pinned ?? uniqueName(random, usedNames);
      if (pinned) usedNames.add(pinned);

      const id = `user-${slugify(teamName)}-${i + 1}`;
      users.push({
        id,
        name,
        email: `${slugify(name)}@thenewchurch.org`,
        phone: `+234 8${String(10 + teamIndex)} ${String(100 + i).padStart(3, "0")} ${String(
          1000 + Math.floor(random() * 8999),
        )}`,
        role: "member",
        team_id: teamId,
        active: random() > 0.04,
        created_at: nowISO,
      });
    }
  });

  const check_ins = buildCheckIns({ users, teams, days, sessions, random, now });

  return { users, teams, days, sessions, check_ins, program_start };
}

const PINNED_NEW_MUSIC = ["John Doe", "Jane Doe", "Samuel Doe", "David Doe"];

function uniqueName(random: () => number, used: Set<string>): string {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const first = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];
    const name = `${first} ${last}`;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  const fallback = `Member ${used.size + 1}`;
  used.add(fallback);
  return fallback;
}

/**
 * Generates plausible history: engaged members show up most days, everyone
 * dips a little mid-programme, and sessions that have not happened yet are
 * left empty.
 */
function buildCheckIns({
  users,
  teams,
  days,
  sessions,
  random,
  now,
}: {
  users: User[];
  teams: Team[];
  days: Day[];
  sessions: Session[];
  random: () => number;
  now: Date;
}): CheckIn[] {
  const teamStrength = new Map(
    teams.map((team) => [team.id, TEAM_PROFILE[team.name]?.strength ?? 0.85]),
  );
  const dayById = new Map(days.map((day) => [day.id, day]));
  const nowISO = now.toISOString();

  const participants = users.filter((user) => user.role !== "admin" && user.active);
  const personalStrength = new Map(
    participants.map((user) => [user.id, 0.55 + random() * 0.45]),
  );

  const rows: CheckIn[] = [];

  for (const session of sessions) {
    const day = dayById.get(session.day_id);
    if (!day) continue;

    const status = getSessionStatus(day, session, now);
    if (status === "upcoming") continue;

    // Morning sessions are the hardest to make; the night session is fullest.
    const slotFactor =
      session.slot === "whirlwind" ? 0.82 : session.slot === "uncut" ? 0.88 : 1;
    // A live session is still filling up.
    const liveFactor = status === "live" ? 0.55 : 1;

    for (const user of participants) {
      const strength =
        (personalStrength.get(user.id) ?? 0.8) *
        (teamStrength.get(user.team_id ?? "") ?? 0.85) *
        slotFactor *
        liveFactor;

      const checked_in = random() < strength;
      const shared_link = checked_in ? random() < strength * 0.92 : random() < 0.05;
      const liked_youtube = checked_in ? random() < strength * 0.96 : random() < 0.04;

      // Absent rows mean "no activity" — keeps the stored dataset small.
      if (!checked_in && !shared_link && !liked_youtube) continue;

      rows.push({
        id: `checkin-${user.id}-${session.id}`,
        user_id: user.id,
        session_id: session.id,
        checked_in,
        shared_link,
        liked_youtube,
        created_at: nowISO,
        updated_at: nowISO,
      });
    }
  }

  return rows;
}
