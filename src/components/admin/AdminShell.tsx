import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { LocaleProvider } from "@/components/admin/LocaleProvider";

type AdminShellProps = {
  children: ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
  };
};

export function AdminShell({ children, user }: AdminShellProps) {
  return (
    <LocaleProvider>
      <div className="admin-shell min-h-screen bg-[linear-gradient(180deg,var(--admin-bg-start)_0%,var(--admin-bg-mid)_42%,var(--admin-bg-end)_100%)] text-[var(--color-text)]">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,var(--admin-accent-soft),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,var(--admin-accent-soft),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_28%)]" />
        <div className="admin-grid pointer-events-none fixed inset-0 opacity-40" />

        <div className="relative flex flex-col gap-3 px-2 py-2 sm:px-3 sm:py-3 md:flex-row md:px-4 md:py-4">
          <AdminSidebar />

          <main data-admin-main className="min-w-0 flex-1 pb-3 sm:pb-4">
            <div className="space-y-4">
              <AdminHeader user={user} />
              {children}
            </div>
          </main>
        </div>
      </div>
    </LocaleProvider>
  );
}
