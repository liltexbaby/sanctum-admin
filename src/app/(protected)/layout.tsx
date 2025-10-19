import { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSupabaseRSC } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await getSupabaseRSC();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-5xl w-full px-4 py-3 flex items-center justify-between">
          <Link href="/artworks" className="text-sm font-semibold hover:opacity-80">
            Sanctum Admin
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/artworks/new"
              className="text-sm rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              New Artwork
            </Link>
            <Link
              href="/auth/signout"
              className="text-sm rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              Sign out
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-6">{children}</main>
    </div>
  );
}
