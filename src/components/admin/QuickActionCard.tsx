import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn } from "@/lib/utils";

type QuickActionCardProps = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  badge?: string;
  tone?: "dark" | "accent" | "light";
  download?: boolean;
};

export function QuickActionCard({
  href,
  title,
  description,
  icon,
  badge,
  tone = "light",
  download = false,
}: QuickActionCardProps) {
  const className = cn(
    "group relative flex h-full min-h-[184px] flex-col justify-between overflow-hidden rounded-[26px] border p-5 transition duration-200 hover:translate-y-[-2px]",
    tone === "dark"
      ? "border-[rgba(15,23,42,0.22)] bg-[linear-gradient(180deg,#1f2937,#111827)] text-white hover:shadow-[0_18px_34px_rgba(15,23,42,0.2)]"
      : tone === "accent"
        ? "border-[var(--admin-panel-border-strong)] bg-[linear-gradient(180deg,var(--glass-strong-bg),var(--glass-bg))] hover:shadow-[var(--admin-shadow-strong)]"
        : "border-[var(--admin-panel-border)] bg-[linear-gradient(180deg,var(--glass-strong-bg),var(--glass-bg))] hover:shadow-[var(--admin-shadow-soft)]"
  );

  const content = (
    <>
      <div
        className={cn(
          "pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full blur-2xl",
          tone === "dark"
            ? "bg-[var(--admin-accent-glow)]"
            : tone === "accent"
              ? "bg-[var(--admin-accent-soft)]"
              : "bg-[rgba(15,23,42,0.08)] dark:bg-[rgba(255,255,255,0.08)]"
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex h-12 w-12 items-center justify-center rounded-2xl",
            tone === "dark" ? "bg-white/10 text-white" : "bg-[var(--admin-icon-bg)] text-[var(--color-text)]"
          )}
        >
          {icon}
        </span>
        {badge ? <StatusBadge label={badge} tone={badge === "Live" ? "success" : "neutral"} /> : null}
      </div>

      <div className="relative mt-8">
        <h3
          className={cn(
            "text-lg font-semibold tracking-[-0.03em]",
            tone === "dark" ? "text-white" : "text-[var(--color-text)]"
          )}
        >
          {title}
        </h3>
        <p className={cn("mt-2 text-sm leading-6", tone === "dark" ? "text-white/72" : "text-[var(--text-soft)]")}>
          {description}
        </p>
      </div>

      <div
        className={cn(
          "relative mt-6 inline-flex items-center gap-2 text-sm font-semibold",
          tone === "dark" ? "text-white" : "text-[var(--color-text)]"
        )}
      >
        <span>{download ? "Download" : "Open"}</span>
        <ArrowUpRight
          size={16}
          className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>
    </>
  );

  if (download) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
