import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminAccess } from "@/lib/auth/guards";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminAccess("/admin");

  return (
    <AdminShell
      user={{
        name: session.user.name,
        email: session.user.email,
      }}
    >
      {children}
    </AdminShell>
  );
}
