import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { userCanAccessEditor } from "@/lib/auth/roles";
import { getAuthSession } from "@/lib/auth/session";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[] | undefined;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextParam = Array.isArray(resolvedSearchParams?.next)
    ? resolvedSearchParams?.next[0]
    : resolvedSearchParams?.next;
  const session = await getAuthSession();

  if (session) {
    if (nextParam) {
      redirect(getSafeRedirectPath(nextParam));
    }

    const canAccessEditor = await userCanAccessEditor(session.user.id);
    redirect(canAccessEditor ? "/editor" : "/unauthorized");
  }

  return <LoginForm />;
}
