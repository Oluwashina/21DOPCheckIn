import type { DataAdapter } from "./adapter";
import { supabaseAdapter } from "./supabase-adapter";

/** Single swap point for the backend. */
export function getAdapter(): DataAdapter {
  return supabaseAdapter;
}

export type { DataAdapter, ProfileInput } from "./adapter";
