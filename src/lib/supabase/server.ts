import { cookies, headers } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * Read-only client for React Server Components (RSC).
 * Avoids mutating cookies to comply with Next.js constraint:
 * "Cookies can only be modified in a Server Action or Route Handler."
 */
/**
 * Read-only Supabase client for RSC that avoids Next's dynamic cookies() API.
 * We read cookie values directly from the request "cookie" header to satisfy
 * the "cookies() should be awaited" constraint in Next canary.
 */
export async function getSupabaseRSC() {
  // Next can expose headers() as an async dynamic API in some versions,
  // so await it to satisfy the type system and avoid runtime warnings.
  const hdrs = await headers();

  function readCookie(name: string): string | undefined {
    try {
      const cookieHeader = hdrs.get("cookie") || "";
      if (!cookieHeader) return undefined;
      const target = name + "=";
      const parts = cookieHeader.split(/; */);
      for (const p of parts) {
        if (p.startsWith(target)) {
          return decodeURIComponent(p.slice(target.length));
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return readCookie(name);
        },
        // No-ops in RSC to prevent mutations (must be done in Route/Server Action)
        set(_: string, __: string, ___: CookieOptions) {},
        remove(_: string, __: CookieOptions) {},
      },
    }
  );
}

/**
 * Route Handler / Server Action client (allows cookie mutations).
 * Use inside Next Route Handlers or Server Actions only.
 */
export function getSupabaseRouteClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const store = cookies() as any;
          return store?.get?.(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          const store = cookies() as any;
          store?.set?.({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          const store = cookies() as any;
          store?.set?.({ name, value: "", ...options });
        },
      },
    }
  );
}

/**
 * Admin client using the service role key (server-only).
 */
export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createAdminClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
