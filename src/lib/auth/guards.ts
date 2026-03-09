import { redirect } from "next/navigation";

import { userCanAccessAdmin, userCanAccessEditor } from "@/lib/auth/roles";
import { getAuthSession } from "@/lib/auth/session";

export async function requireEditorAccess(nextPath = "/editor") {
  const session = await getAuthSession();

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const canAccessEditor = await userCanAccessEditor(session.user.id);

  if (!canAccessEditor) {
    redirect("/unauthorized");
  }

  return session;
}

export async function requireAdminAccess(nextPath = "/admin") {
  const session = await getAuthSession();

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const canAccessAdmin = await userCanAccessAdmin(session.user.id);

  if (!canAccessAdmin) {
    redirect("/unauthorized");
  }

  return session;
}
