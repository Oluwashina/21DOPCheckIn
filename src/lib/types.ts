export type Role = "member" | "team_lead" | "admin" | "reports";

export type SessionSlot = "whirlwind" | "uncut" | "power_night";

export type SessionStatus = "upcoming" | "live" | "completed";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  team_id: string | null;
  active: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  team_lead_id: string | null;
  created_at: string;
}

export interface Day {
  id: string;
  day_number: number;
  /** ISO calendar date, `yyyy-mm-dd` */
  date: string;
}

export interface Session {
  id: string;
  name: string;
  /** 24h clock, `HH:mm` */
  time: string;
  day_id: string;
  slot: SessionSlot;
}

export interface CheckIn {
  id: string;
  user_id: string;
  session_id: string;
  checked_in: boolean;
  shared_link: boolean;
  liked_youtube: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  users: User[];
  teams: Team[];
  days: Day[];
  sessions: Session[];
  check_ins: CheckIn[];
  /** ISO date of Day 1, kept so day numbering stays stable across reloads. */
  program_start: string;
}

/** The three accountability items tracked for every session. */
export type AccountabilityKey = "checked_in" | "shared_link" | "liked_youtube";

export interface CheckInInput {
  checked_in: boolean;
  shared_link: boolean;
  liked_youtube: boolean;
}
