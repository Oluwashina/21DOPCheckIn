import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * False until both env vars are set. The app shows a setup notice instead of
 * crashing, so a fresh clone explains itself.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
  }

  client ??= createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Password-reset links carry a token back to /reset.
      detectSessionInUrl: true,
      storageKey: "21dop.auth",
    },
  });

  return client;
}
