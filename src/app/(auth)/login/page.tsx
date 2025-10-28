import { redirect } from "next/navigation";
import { getSupabaseRouteClient } from "@/lib/supabase/server";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  async function login(formData: FormData) {
    "use server";
    const supabase = getSupabaseRouteClient();

    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      redirect("/login?error=Missing%20email%20or%20password");
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/artworks");
  }

  const errorMessage = searchParams?.error;

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
        <h1 className="text-xl font-semibold mb-2">Admin Sign In</h1>
        <p className="text-sm text-neutral-500 mb-4">
          Sign in with your admin email and password.
        </p>

        {errorMessage ? (
          <div className="mb-4 rounded border border-red-300/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-3 py-2 text-sm">
            {decodeURIComponent(errorMessage)}
          </div>
        ) : null}

        <form action={login} className="space-y-3">
          <div>
            <label className="block text-sm mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm mb-1" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            Sign In
          </button>
        </form>

        <p className="text-xs text-neutral-500 mt-4">
          For internal testing only.
        </p>
      </div>
    </main>
  );
}
