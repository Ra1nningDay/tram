import { ShieldCheck, UserRound } from "lucide-react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

type AdminHeaderProps = {
  user: {
    name?: string | null;
    email?: string | null;
  };
};

export function AdminHeader({ user }: AdminHeaderProps) {
  const displayName = user.name?.trim() || user.email?.trim() || "Admin";
  const email = user.email?.trim();

  return (
    <header className="admin-panel relative overflow-hidden px-4 py-4 sm:px-5 sm:py-5 md:px-7">
      <div className="pointer-events-none absolute right-0 top-0 h-32 w-40 bg-[radial-gradient(circle,var(--admin-accent-glow),transparent_70%)] blur-2xl" />

      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--text-faint)]">
            Operations Desk
          </p>
          <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-[var(--color-text)] md:text-4xl">
            Admin Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
            Control access, inspect the current network state, and route into the editor without mixing
            operational UI into the map workspace.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center xl:flex xl:flex-none">
          <div className="flex min-w-0 items-center gap-3 rounded-[22px] border border-[var(--admin-panel-border)] bg-[linear-gradient(180deg,var(--glass-strong-bg),var(--glass-bg))] px-4 py-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(15,23,42,0.06)] text-[var(--color-text)]">
              <UserRound size={18} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                <span className="truncate">{displayName}</span>
                <span className="rounded-full bg-[#e7f5eb] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#18703c] dark:bg-[rgba(34,197,94,0.18)] dark:text-[#9fe6af]">
                  Admin
                </span>
              </span>
              <span className="mt-1 flex items-center gap-1 text-xs text-[var(--text-soft)]">
                <ShieldCheck size={12} />
                <span className="truncate">{email ?? "Role verified for dashboard access"}</span>
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end xl:justify-start">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
