import { NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = getSupabaseRouteClient();
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  // Exchange the code for a session and set cookies via @supabase/ssr
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/artworks`);
}
