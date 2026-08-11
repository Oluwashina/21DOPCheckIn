import type { CheckIn, CheckInInput, Database, Team, User } from "../types";

/** What a person fills in when they first sign up. */
export interface ProfileInput {
  name: string;
  phone?: string;
  team_id: string | null;
}

/**
 * Every read and write in the app goes through this interface, so the backend
 * is swappable. Mutations return only the rows they touched — the store
 * patches its copy rather than refetching everything.
 */
export interface DataAdapter {
  /** Team names, readable before sign-in, for the sign-up screen. */
  loadTeams(): Promise<Team[]>;

  /** Everything the signed-in person is allowed to see. */
  loadDatabase(): Promise<Database>;

  createProfile(userId: string, email: string, input: ProfileInput): Promise<User>;

  saveCheckIn(
    userId: string,
    sessionId: string,
    input: CheckInInput,
  ): Promise<CheckIn>;

  updateUser(userId: string, patch: Partial<Omit<User, "id">>): Promise<User>;
  deleteUser(userId: string): Promise<void>;

  createTeam(name: string): Promise<Team>;
  /** Promoting a lead also moves them onto the team, so users can change too. */
  updateTeam(
    teamId: string,
    patch: Partial<Omit<Team, "id">>,
  ): Promise<{ team: Team; users: User[] }>;
  deleteTeam(teamId: string): Promise<void>;
}
