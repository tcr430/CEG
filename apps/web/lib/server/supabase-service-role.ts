import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getOptionalEnv } from "@ceg/security";

export function createSupabaseServiceRoleClient(): SupabaseClient {
  const url = getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getOptionalEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (url === undefined || serviceRoleKey === undefined) {
    throw new Error(
      "Supabase service-role configuration is missing. This client must remain server-only.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
