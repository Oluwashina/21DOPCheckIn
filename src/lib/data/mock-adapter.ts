import { buildSeedDatabase } from "../seed";
import type { CheckInInput, Database, Team, User } from "../types";
import type { DataAdapter, NewUserInput } from "./adapter";

/** Bump when the seed shape or programme dates change, to force a re-seed. */
const STORAGE_KEY = "21dop:db:v5";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readStorage(): Database | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Database;
    if (!parsed?.users?.length || !parsed?.days?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(db: Database): Database {
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Storage full or blocked — the in-memory copy still works for this session.
    }
  }
  return db;
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

let cache: Database | null = null;

function current(): Database {
  if (cache) return cache;
  cache = readStorage() ?? writeStorage(buildSeedDatabase());
  return cache;
}

function commit(next: Database): Database {
  cache = next;
  return writeStorage(next);
}

export const mockAdapter: DataAdapter = {
  async loadDatabase() {
    return current();
  },

  async resetDatabase() {
    cache = null;
    if (isBrowser()) window.localStorage.removeItem(STORAGE_KEY);
    return commit(buildSeedDatabase());
  },

  async saveCheckIn(userId: string, sessionId: string, input: CheckInInput) {
    const db = current();
    const now = new Date().toISOString();
    const existing = db.check_ins.find(
      (row) => row.user_id === userId && row.session_id === sessionId,
    );

    const check_ins = existing
      ? db.check_ins.map((row) =>
          row.id === existing.id ? { ...row, ...input, updated_at: now } : row,
        )
      : [
          ...db.check_ins,
          {
            id: makeId("checkin"),
            user_id: userId,
            session_id: sessionId,
            ...input,
            created_at: now,
            updated_at: now,
          },
        ];

    return commit({ ...db, check_ins });
  },

  async createUser(input: NewUserInput) {
    const db = current();
    const user: User = {
      id: makeId("user"),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() ?? "",
      role: input.role ?? "member",
      team_id: input.team_id,
      active: true,
      created_at: new Date().toISOString(),
    };
    return { db: commit({ ...db, users: [...db.users, user] }), user };
  },

  async updateUser(userId: string, patch: Partial<Omit<User, "id">>) {
    const db = current();
    return commit({
      ...db,
      users: db.users.map((user) => (user.id === userId ? { ...user, ...patch } : user)),
    });
  },

  async deleteUser(userId: string) {
    const db = current();
    return commit({
      ...db,
      users: db.users.filter((user) => user.id !== userId),
      check_ins: db.check_ins.filter((row) => row.user_id !== userId),
      teams: db.teams.map((team) =>
        team.team_lead_id === userId ? { ...team, team_lead_id: null } : team,
      ),
    });
  },

  async createTeam(name: string) {
    const db = current();
    const team: Team = {
      id: makeId("team"),
      name: name.trim(),
      team_lead_id: null,
      created_at: new Date().toISOString(),
    };
    return { db: commit({ ...db, teams: [...db.teams, team] }), team };
  },

  async updateTeam(teamId: string, patch: Partial<Omit<Team, "id">>) {
    const db = current();
    let users = db.users;

    // Promoting someone to team lead should also move them onto that team.
    if (patch.team_lead_id) {
      const previousLead = db.teams.find((team) => team.id === teamId)?.team_lead_id;
      users = users.map((user) => {
        if (user.id === patch.team_lead_id) {
          return { ...user, role: "team_lead" as const, team_id: teamId };
        }
        if (user.id === previousLead && previousLead !== patch.team_lead_id) {
          return { ...user, role: "member" as const };
        }
        return user;
      });
    }

    return commit({
      ...db,
      users,
      teams: db.teams.map((team) => (team.id === teamId ? { ...team, ...patch } : team)),
    });
  },

  async deleteTeam(teamId: string) {
    const db = current();
    return commit({
      ...db,
      teams: db.teams.filter((team) => team.id !== teamId),
      users: db.users.map((user) =>
        user.team_id === teamId ? { ...user, team_id: null } : user,
      ),
    });
  },
};
