import type { CheckInInput, Database, Team, User } from "../types";

export interface NewUserInput {
  name: string;
  email: string;
  phone?: string;
  team_id: string | null;
  role?: User["role"];
}

/**
 * Every read and write in the app goes through this interface. The MVP ships
 * with a local (mock) implementation; swapping in Supabase means writing one
 * more implementation of this interface and changing `getAdapter()`.
 */
export interface DataAdapter {
  loadDatabase(): Promise<Database>;
  resetDatabase(): Promise<Database>;

  saveCheckIn(userId: string, sessionId: string, input: CheckInInput): Promise<Database>;

  createUser(input: NewUserInput): Promise<{ db: Database; user: User }>;
  updateUser(userId: string, patch: Partial<Omit<User, "id">>): Promise<Database>;
  deleteUser(userId: string): Promise<Database>;

  createTeam(name: string): Promise<{ db: Database; team: Team }>;
  updateTeam(teamId: string, patch: Partial<Omit<Team, "id">>): Promise<Database>;
  deleteTeam(teamId: string): Promise<Database>;
}
