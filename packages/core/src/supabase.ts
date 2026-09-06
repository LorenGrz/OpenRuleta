import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client factory. Never import this into client code.
 *
 * - The public form uses the anon / publishable key. RLS restricts it to
 *   INSERT on `participants` (no select/update/delete), so it is safe to run
 *   in a deployed serverless route.
 * - The wheel app passes `preferServiceRole: true`. The service_role key
 *   bypasses RLS (SELECT / UPDATE / DELETE) and must only ever run locally.
 */

const cache = new Map<boolean, SupabaseClient>();

export function getSupabaseClient(preferServiceRole = false): SupabaseClient {
  const cached = cache.get(preferServiceRole);
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = preferServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    : process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      preferServiceRole
        ? "Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)."
        : "Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_ANON_KEY.",
    );
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  cache.set(preferServiceRole, client);
  return client;
}
