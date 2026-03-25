import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Server-side API routes only — never import from client components.
 */
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
