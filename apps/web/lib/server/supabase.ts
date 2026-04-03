import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getOptionalEnv } from "@ceg/security";

import { createAppUrl } from "./runtime-origin";

export type SupabaseServerClient = SupabaseClient;

export function getSupabaseConfig() {
  const url = getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getOptionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (url === undefined || anonKey === undefined) {
    return null;
  }

  return {
    url,
    anonKey,
  };
}

export async function createSupabaseServerClient(): Promise<SupabaseServerClient | null> {
  // Intentionally use the anon key here. The service role key must stay server-only
  // and out of request/session-scoped auth flows so it never crosses a client boundary.
  const config = getSupabaseConfig();

  if (config === null) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>,
      ) {
        for (const cookie of cookiesToSet) {
          try {
            cookieStore.set({
              name: cookie.name,
              value: cookie.value,
              ...cookie.options,
            });
          } catch {
            // Server components may be read-only; route handlers can still persist.
          }
        }
      },
    },
  });
}

export function createRedirectUrl(pathname: string): string | undefined {
  return createAppUrl(pathname);
}

export type AuthCookieOptions = CookieOptions;
