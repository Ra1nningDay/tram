import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { userCanAccessEditor } from "@/lib/auth/roles";
import { getAuthSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getAuthSession();

  if (session) {
    const canAccessEditor = await userCanAccessEditor(session.user.id);
    redirect(canAccessEditor ? "/editor" : "/unauthorized");
  }

  return <LoginForm />;
}
