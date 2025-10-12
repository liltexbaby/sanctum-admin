import { NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = getSupabaseRouteClient();
  const { origin } = new URL(request.url);
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/login`);
}
