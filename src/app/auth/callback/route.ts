import { NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = getSupabaseRouteClient();

  // Build a public base URL resilient to proxies and aligned with env
  const envBase = process.env.NEXT_PUBLIC_SITE_URL;
  const reqHeaders = request.headers;
  const xfHost = reqHeaders.get("x-forwarded-host") ?? reqHeaders.get("host");
  const xfProto = reqHeaders.get("x-forwarded-proto") ?? "https";
  const url = new URL(request.url);
  const origin = url.origin;
  const baseUrl = envBase ?? (xfHost ? `${xfProto}://${xfHost}` : origin);

  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=missing_code`);
  }

  // Exchange the code for a session and set cookies via @supabase/ssr
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${baseUrl}/artworks`);
}
