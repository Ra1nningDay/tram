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
      <div className="admin-shell min-h-screen bg-[linear-gradient(180deg,var(--admin-bg-start)_0%,var(--admin-bg-mid)_50%,var(--admin-bg-end)_100%)] text-[var(--color-text)]">
        <div className="relative flex min-h-screen w-full flex-col lg:flex-row">
          <AdminSidebar />

          <main data-admin-main className="min-w-0 flex-1">
            <AdminHeader user={user} />
            <div className="px-3 pb-4 pt-4 sm:px-4 sm:pb-5 lg:px-5 lg:pb-6 lg:pt-5 xl:px-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </LocaleProvider>
  );
}
