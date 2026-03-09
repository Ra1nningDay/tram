"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await authClient.signOut({}, { throw: true });
    } catch (error) {
      console.error("Failed to sign out", error);
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSubmitting}
      className={cn(
        "glass-card inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--map-control-border)] px-3 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--map-control-hover)] disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      <LogOut size={16} />
      <span>{isSubmitting ? "Signing out..." : "Logout"}</span>
    </button>
  );
}
