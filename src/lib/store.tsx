"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getAdapter, type ProfileInput } from "./data";
import { getSupabase, isSupabaseConfigured } from "./supabase/client";
import type { CheckInInput, Database, Team, User } from "./types";

/**
 * Where the person stands with the app:
 *  unconfigured  — the Supabase env vars are missing (developer error)
 *  loading       — checking for an existing session
 *  signed_out    — no session; show login / sign-up
 *  needs_profile — signed in, but no profile row yet (rare: sign-up interrupted)
 *  deactivated   — an admin has switched them off
 *  ready         — signed in with a profile and data loaded
 */
export type AuthStatus =
  | "unconfigured"
  | "loading"
  | "signed_out"
  | "needs_profile"
  | "deactivated"
  | "ready";

interface StoreValue {
  status: AuthStatus;
  loading: boolean;
  db: Database | null;
  /** Team names, available before sign-in so sign-up can list them. */
  teams: Team[];
  currentUser: User | null;
  /** Re-renders on a timer so "live" sessions flip status without a refresh. */
  now: Date;
  /** Last failed write, surfaced as a banner. */
  error: string | null;
  clearError: () => void;

  signIn: (email: string, password: string) => Promise<void>;
  /** Returns true when Supabase wants the address confirmed before sign-in. */
  signUp: (email: string, password: string, profile: ProfileInput) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  completeProfile: (input: ProfileInput) => Promise<void>;
  signOut: () => Promise<void>;

  saveCheckIn: (sessionId: string, input: CheckInInput) => Promise<void>;
  updateUser: (userId: string, patch: Partial<Omit<User, "id">>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  createTeam: (name: string) => Promise<Team | null>;
  updateTeam: (teamId: string, patch: Partial<Omit<Team, "id">>) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

function messageFrom(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

/** Keep credential errors clear without saying which field is wrong. */
function signInMessage(raw: string): string {
  if (/invalid login credentials|invalid credentials/i.test(raw)) {
    return "Invalid credentials. Please check your details and try again.";
  }
  if (/email not confirmed/i.test(raw)) {
    return "Please confirm your email first — check your inbox for the link.";
  }
  if (/rate limit|too many requests/i.test(raw)) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return "Invalid credentials. Please check your details and try again.";
}

function signUpMessage(raw: string): string {
  const rateLimited = authEmailMessage(raw);
  if (rateLimited) return rateLimited;
  if (/already registered|already exists/i.test(raw)) {
    return "That email is already registered. Sign in instead.";
  }
  if (/password/i.test(raw) && /short|least|weak/i.test(raw)) {
    return "Please choose a password of at least 8 characters.";
  }
  return raw;
}

function authEmailMessage(raw: string): string | null {
  if (/rate limit|too many requests/i.test(raw)) {
    return "Sign-up emails are paused for a moment because too many were sent. Try again in about an hour.";
  }
  return null;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => getAdapter(), []);
  const configured = isSupabaseConfigured();

  const [status, setStatus] = useState<AuthStatus>(
    configured ? "loading" : "unconfigured",
  );
  const [db, setDb] = useState<Database | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);

  const loadForSession = useCallback(
    async (sessionUserId: string) => {
      if (
        userId === sessionUserId &&
        (status === "ready" || status === "needs_profile" || status === "deactivated")
      ) {
        return;
      }

      const loaded = await adapter.loadDatabase();
      const profile = loaded.users.find((user) => user.id === sessionUserId);

      if (!profile) {
        // The sign-up trigger did not run, or an admin removed them. Let them
        // rebuild the profile rather than stranding them on a blank screen.
        setTeams(await adapter.loadTeams());
        setUserId(sessionUserId);
        setStatus("needs_profile");
        return;
      }

      setDb(loaded);
      setTeams(loaded.teams);
      setUserId(sessionUserId);
      setStatus(profile.active ? "ready" : "deactivated");
    },
    [adapter, status, userId],
  );

  useEffect(() => {
    if (!configured) return;

    let cancelled = false;
    const supabase = getSupabase();

    async function sync(sessionUserId: string | null) {
      if (cancelled) return;

      if (!sessionUserId) {
        setDb(null);
        setUserId(null);
        setStatus("signed_out");
        // Team names are public, so the sign-up screen can still list them.
        adapter
          .loadTeams()
          .then((list) => !cancelled && setTeams(list))
          .catch(() => undefined);
        return;
      }

      try {
        await loadForSession(sessionUserId);
      } catch (loadError) {
        if (!cancelled) {
          setError(messageFrom(loadError));
          setStatus("signed_out");
        }
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      void sync(data.session?.user.id ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void sync(session?.user.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [adapter, configured, loadForSession]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const currentUser = useMemo(
    () => db?.users.find((user) => user.id === userId) ?? null,
    [db, userId],
  );

  /** Runs a write, surfacing any failure as a banner instead of failing silently. */
  const guard = useCallback(async <T,>(work: () => Promise<T>): Promise<T | null> => {
    try {
      setError(null);
      return await work();
    } catch (caught) {
      setError(messageFrom(caught));
      return null;
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error: authError } = await getSupabase().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) throw new Error(signInMessage(authError.message));

      const sessionUserId = data.session?.user.id ?? data.user?.id;
      if (sessionUserId) await loadForSession(sessionUserId);
    },
    [loadForSession],
  );

  const signUp = useCallback(
    async (email: string, password: string, profile: ProfileInput) => {
      const { data, error: authError } = await getSupabase().auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          // Where the "confirm your email" link lands, if confirmation is on.
          emailRedirectTo: `${window.location.origin}/confirm`,
          // The sign-up trigger reads these to build the profile row.
          data: {
            name: profile.name.trim(),
            phone: profile.phone?.trim() ?? "",
            team_id: profile.team_id ?? "",
          },
        },
      });

      if (authError) throw new Error(signUpMessage(authError.message));

      // No session means the project asks people to confirm their address.
      return !data.session;
    },
    [],
  );

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error: authError } = await getSupabase().auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset` },
    );
    if (authError) {
      throw new Error(authEmailMessage(authError.message) ?? authError.message);
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error: authError } = await getSupabase().auth.updateUser({ password });
    if (authError) throw new Error(authError.message);
  }, []);

  const completeProfile = useCallback(
    async (input: ProfileInput) => {
      const { data } = await getSupabase().auth.getUser();
      const authUser = data.user;
      if (!authUser) throw new Error("Your session expired. Sign in again.");

      await adapter.createProfile(authUser.id, authUser.email ?? "", input);
      await loadForSession(authUser.id);
    },
    [adapter, loadForSession],
  );

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setDb(null);
    setUserId(null);
    setStatus("signed_out");
  }, []);

  const saveCheckIn = useCallback(
    async (sessionId: string, input: CheckInInput) => {
      if (!userId) return;
      await guard(async () => {
        const saved = await adapter.saveCheckIn(userId, sessionId, input);
        setDb((current) => {
          if (!current) return current;
          const others = current.check_ins.filter(
            (row) => !(row.user_id === saved.user_id && row.session_id === saved.session_id),
          );
          return { ...current, check_ins: [...others, saved] };
        });
      });
    },
    [adapter, guard, userId],
  );

  const updateUser = useCallback(
    async (targetId: string, patch: Partial<Omit<User, "id">>) => {
      await guard(async () => {
        const saved = await adapter.updateUser(targetId, patch);
        setDb((current) =>
          current
            ? {
                ...current,
                users: current.users.map((user) => (user.id === saved.id ? saved : user)),
              }
            : current,
        );
      });
    },
    [adapter, guard],
  );

  const deleteUser = useCallback(
    async (targetId: string) => {
      await guard(async () => {
        await adapter.deleteUser(targetId);
        setDb((current) =>
          current
            ? {
                ...current,
                users: current.users.filter((user) => user.id !== targetId),
                check_ins: current.check_ins.filter((row) => row.user_id !== targetId),
                teams: current.teams.map((team) =>
                  team.team_lead_id === targetId ? { ...team, team_lead_id: null } : team,
                ),
              }
            : current,
        );
      });
      if (targetId === userId) await signOut();
    },
    [adapter, guard, signOut, userId],
  );

  const createTeam = useCallback(
    async (name: string) => {
      return guard(async () => {
        const team = await adapter.createTeam(name);
        setDb((current) =>
          current ? { ...current, teams: [...current.teams, team] } : current,
        );
        return team;
      });
    },
    [adapter, guard],
  );

  const updateTeam = useCallback(
    async (teamId: string, patch: Partial<Omit<Team, "id">>) => {
      await guard(async () => {
        const { team, users } = await adapter.updateTeam(teamId, patch);
        setDb((current) => {
          if (!current) return current;
          const changed = new Map(users.map((user) => [user.id, user]));
          return {
            ...current,
            teams: current.teams.map((row) => (row.id === team.id ? team : row)),
            users: current.users.map((user) => changed.get(user.id) ?? user),
          };
        });
      });
    },
    [adapter, guard],
  );

  const deleteTeam = useCallback(
    async (teamId: string) => {
      await guard(async () => {
        await adapter.deleteTeam(teamId);
        setDb((current) =>
          current
            ? {
                ...current,
                teams: current.teams.filter((team) => team.id !== teamId),
                users: current.users.map((user) =>
                  user.team_id === teamId ? { ...user, team_id: null } : user,
                ),
              }
            : current,
        );
      });
    },
    [adapter, guard],
  );

  const value: StoreValue = {
    status,
    loading: status === "loading",
    db,
    teams,
    currentUser,
    now,
    error,
    clearError: () => setError(null),
    signIn,
    signUp,
    sendPasswordReset,
    updatePassword,
    completeProfile,
    signOut,
    saveCheckIn,
    updateUser,
    deleteUser,
    createTeam,
    updateTeam,
    deleteTeam,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside <StoreProvider>");
  return context;
}

/** Store access for screens that only render once data is ready. */
export function useDatabase(): { db: Database; now: Date } {
  const { db, now } = useStore();
  if (!db) throw new Error("Database is not loaded yet");
  return { db, now };
}
