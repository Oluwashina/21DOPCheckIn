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

import { getAdapter, type NewUserInput } from "./data";
import type { CheckInInput, Database, Team, User } from "./types";

const SESSION_KEY = "21dop:session:v1";

interface StoreValue {
  db: Database | null;
  loading: boolean;
  currentUser: User | null;
  /** Re-renders on a timer so "live" sessions flip status without a refresh. */
  now: Date;
  signIn: (identifier: string) => User | null;
  signOut: () => void;
  register: (input: NewUserInput) => Promise<User>;
  saveCheckIn: (sessionId: string, input: CheckInInput) => Promise<void>;
  createUser: (input: NewUserInput) => Promise<User>;
  updateUser: (userId: string, patch: Partial<Omit<User, "id">>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  createTeam: (name: string) => Promise<Team>;
  updateTeam: (teamId: string, patch: Partial<Omit<Team, "id">>) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  resetDemoData: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/[\s()-]/g, "");
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => getAdapter(), []);
  const [db, setDb] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    adapter.loadDatabase().then((loaded) => {
      if (cancelled) return;
      setDb(loaded);
      const storedId = window.localStorage.getItem(SESSION_KEY);
      if (storedId && loaded.users.some((user) => user.id === storedId)) {
        setCurrentUserId(storedId);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [adapter]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const currentUser = useMemo(
    () => db?.users.find((user) => user.id === currentUserId) ?? null,
    [db, currentUserId],
  );

  const persistSession = useCallback((userId: string | null) => {
    setCurrentUserId(userId);
    if (userId) window.localStorage.setItem(SESSION_KEY, userId);
    else window.localStorage.removeItem(SESSION_KEY);
  }, []);

  const signIn = useCallback(
    (identifier: string) => {
      if (!db) return null;
      const needle = normalise(identifier);
      if (!needle) return null;
      const match = db.users.find(
        (user) => normalise(user.email) === needle || normalise(user.phone) === needle,
      );
      if (!match) return null;
      persistSession(match.id);
      return match;
    },
    [db, persistSession],
  );

  const signOut = useCallback(() => persistSession(null), [persistSession]);

  const register = useCallback(
    async (input: NewUserInput) => {
      const { db: next, user } = await adapter.createUser(input);
      setDb(next);
      persistSession(user.id);
      return user;
    },
    [adapter, persistSession],
  );

  const saveCheckIn = useCallback(
    async (sessionId: string, input: CheckInInput) => {
      if (!currentUserId) return;
      setDb(await adapter.saveCheckIn(currentUserId, sessionId, input));
    },
    [adapter, currentUserId],
  );

  const createUser = useCallback(
    async (input: NewUserInput) => {
      const { db: next, user } = await adapter.createUser(input);
      setDb(next);
      return user;
    },
    [adapter],
  );

  const updateUser = useCallback(
    async (userId: string, patch: Partial<Omit<User, "id">>) => {
      setDb(await adapter.updateUser(userId, patch));
    },
    [adapter],
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      setDb(await adapter.deleteUser(userId));
      if (userId === currentUserId) persistSession(null);
    },
    [adapter, currentUserId, persistSession],
  );

  const createTeam = useCallback(
    async (name: string) => {
      const { db: next, team } = await adapter.createTeam(name);
      setDb(next);
      return team;
    },
    [adapter],
  );

  const updateTeam = useCallback(
    async (teamId: string, patch: Partial<Omit<Team, "id">>) => {
      setDb(await adapter.updateTeam(teamId, patch));
    },
    [adapter],
  );

  const deleteTeam = useCallback(
    async (teamId: string) => {
      setDb(await adapter.deleteTeam(teamId));
    },
    [adapter],
  );

  const resetDemoData = useCallback(async () => {
    const next = await adapter.resetDatabase();
    setDb(next);
    persistSession(null);
  }, [adapter, persistSession]);

  const value: StoreValue = {
    db,
    loading,
    currentUser,
    now,
    signIn,
    signOut,
    register,
    saveCheckIn,
    createUser,
    updateUser,
    deleteUser,
    createTeam,
    updateTeam,
    deleteTeam,
    resetDemoData,
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
