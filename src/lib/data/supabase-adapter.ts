import { PROGRAM_START_DATE, buildSchedule } from "../program";
import { getSupabase } from "../supabase/client";
import type { CheckIn, CheckInInput, Database, Team, User } from "../types";
import type { DataAdapter, ProfileInput } from "./adapter";

/**
 * Row shapes are the same as the app's types, so there is no mapping layer —
 * the only difference is that `profiles` is called `users` in the app.
 */
const PROFILE_COLUMNS = "id, name, email, phone, role, team_id, active, created_at";
const TEAM_COLUMNS = "id, name, team_lead_id, created_at";
const CHECK_IN_COLUMNS =
  "id, user_id, session_id, checked_in, shared_link, liked_youtube, created_at, updated_at";

function fail(context: string, error: { message: string } | null): never | void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export const supabaseAdapter: DataAdapter = {
  async loadTeams() {
    const { data, error } = await getSupabase()
      .from("teams")
      .select(TEAM_COLUMNS)
      .order("name");
    fail("Could not load teams", error);
    return (data ?? []) as Team[];
  },

  async loadDatabase(): Promise<Database> {
    const supabase = getSupabase();
    const [profiles, teams, checkIns] = await Promise.all([
      supabase.from("profiles").select(PROFILE_COLUMNS).order("name"),
      supabase.from("teams").select(TEAM_COLUMNS).order("name"),
      supabase.from("check_ins").select(CHECK_IN_COLUMNS),
    ]);

    fail("Could not load people", profiles.error);
    fail("Could not load teams", teams.error);
    fail("Could not load check-ins", checkIns.error);

    const { days, sessions } = buildSchedule();

    return {
      users: (profiles.data ?? []) as User[],
      teams: (teams.data ?? []) as Team[],
      check_ins: (checkIns.data ?? []) as CheckIn[],
      days,
      sessions,
      program_start: PROGRAM_START_DATE,
    };
  },

  async createProfile(userId: string, email: string, input: ProfileInput) {
    const { data, error } = await getSupabase()
      .from("profiles")
      .insert({
        id: userId,
        email,
        name: input.name.trim(),
        phone: input.phone?.trim() ?? "",
        team_id: input.team_id,
      })
      .select(PROFILE_COLUMNS)
      .single();

    fail("Could not create your profile", error);
    return data as User;
  },

  async saveCheckIn(userId: string, sessionId: string, input: CheckInInput) {
    const { data, error } = await getSupabase()
      .from("check_ins")
      .upsert(
        { user_id: userId, session_id: sessionId, ...input },
        { onConflict: "user_id,session_id" },
      )
      .select(CHECK_IN_COLUMNS)
      .single();

    fail("Could not save your check-in", error);
    return data as CheckIn;
  },

  async updateUser(userId: string, patch: Partial<Omit<User, "id">>) {
    const { data, error } = await getSupabase()
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .select(PROFILE_COLUMNS)
      .single();

    fail("Could not save that change", error);
    return data as User;
  },

  async deleteUser(userId: string) {
    const { error } = await getSupabase().from("profiles").delete().eq("id", userId);
    fail("Could not remove that person", error);
  },

  async createTeam(name: string) {
    const { data, error } = await getSupabase()
      .from("teams")
      .insert({ name: name.trim() })
      .select(TEAM_COLUMNS)
      .single();

    fail("Could not create that team", error);
    return data as Team;
  },

  async updateTeam(teamId: string, patch: Partial<Omit<Team, "id">>) {
    const supabase = getSupabase();
    const previousLead = patch.team_lead_id
      ? ((
          await supabase.from("teams").select("team_lead_id").eq("id", teamId).single()
        ).data?.team_lead_id as string | null)
      : null;

    const { data, error } = await supabase
      .from("teams")
      .update(patch)
      .eq("id", teamId)
      .select(TEAM_COLUMNS)
      .single();

    fail("Could not save that team", error);

    const users: User[] = [];

    if (patch.team_lead_id) {
      // A lead has to be on the team they lead.
      const promoted = await supabase
        .from("profiles")
        .update({ role: "team_lead", team_id: teamId })
        .eq("id", patch.team_lead_id)
        .select(PROFILE_COLUMNS)
        .single();
      fail("Could not promote that person", promoted.error);
      if (promoted.data) users.push(promoted.data as User);

      if (previousLead && previousLead !== patch.team_lead_id) {
        const demoted = await supabase
          .from("profiles")
          .update({ role: "member" })
          .eq("id", previousLead)
          .select(PROFILE_COLUMNS)
          .single();
        fail("Could not step down the previous lead", demoted.error);
        if (demoted.data) users.push(demoted.data as User);
      }
    }

    return { team: data as Team, users };
  },

  async deleteTeam(teamId: string) {
    const { error } = await getSupabase().from("teams").delete().eq("id", teamId);
    fail("Could not delete that team", error);
  },
};
