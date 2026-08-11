import type { DataAdapter } from "./adapter";
import { mockAdapter } from "./mock-adapter";

/**
 * Single swap point for the backend. When Supabase is wired up, add a
 * `supabase-adapter.ts` implementing `DataAdapter` and return it here (e.g.
 * based on `process.env.NEXT_PUBLIC_SUPABASE_URL` being present).
 */
export function getAdapter(): DataAdapter {
  return mockAdapter;
}

export type { DataAdapter, NewUserInput } from "./adapter";
