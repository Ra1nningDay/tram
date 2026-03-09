import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1a1d23] px-6 text-white">
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-white/40">Access denied</p>
        <h1 className="mt-4 text-3xl font-semibold">You do not have editor access</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Your account is authenticated, but it is not assigned to a role that can access the editor.
        </p>
        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
