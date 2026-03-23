"use client";

import type { ReactNode } from "react";
import { useState } from "react";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <LocaleProvider>
      <div className="admin-shell min-h-screen bg-[linear-gradient(180deg,var(--admin-bg-start)_0%,var(--admin-bg-mid)_50%,var(--admin-bg-end)_100%)] text-[var(--color-text)]">
        <div className="relative min-h-screen w-full lg:grid lg:grid-cols-[288px_minmax(0,1fr)] xl:grid-cols-[304px_minmax(0,1fr)]">
          <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main data-admin-main className="min-w-0">
            <AdminHeader user={user} onMenuClick={() => setSidebarOpen(true)} />
            <div className="px-3 pb-4 pt-4 sm:px-4 sm:pb-5 lg:px-5 lg:pb-6 lg:pt-5 xl:px-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </LocaleProvider>
  );
}
