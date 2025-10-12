import { NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = getSupabaseRouteClient();
  const { origin } = new URL(request.url);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // data.url is the OAuth consent screen URL
  return NextResponse.redirect(data.url);
}
