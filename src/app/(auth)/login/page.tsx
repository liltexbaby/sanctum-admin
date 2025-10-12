import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
        <h1 className="text-xl font-semibold mb-2">Admin Sign In</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Use your admin Google account to continue.
        </p>
        <Link
          href="/auth/login/google"
          className="inline-flex items-center justify-center w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
        >
          Continue with Google
        </Link>
      </div>
    </main>
  );
}
