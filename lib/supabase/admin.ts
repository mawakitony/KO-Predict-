import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublicEnv,
  getSupabaseServiceRoleKey,
} from "@/lib/supabase/env";

/**
 * Client admin avec SUPABASE_SERVICE_ROLE_KEY.
 * Bypass RLS — usage serveur uniquement (sync, cron, seed).
 * Ne jamais importer ce module dans un Client Component.
 */
export function createAdminClient() {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
