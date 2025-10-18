import { NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = getSupabaseRouteClient();

  // Build a public base URL that works behind proxies (DigitalOcean) and in prod/dev
  const envBase = process.env.NEXT_PUBLIC_SITE_URL;
  const reqHeaders = request.headers;
  const xfHost = reqHeaders.get("x-forwarded-host") ?? reqHeaders.get("host");
  const xfProto = reqHeaders.get("x-forwarded-proto") ?? "https";
  const origin = new URL(request.url).origin;
  const baseUrl = envBase ?? (xfHost ? `${xfProto}://${xfHost}` : origin);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${baseUrl}/auth/callback`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error.message)}`);
  }

  // data.url is the OAuth consent screen URL
  return NextResponse.redirect(data.url);
}
