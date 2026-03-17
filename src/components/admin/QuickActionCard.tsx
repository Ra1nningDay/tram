"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { useAdminLocale } from "@/components/admin/LocaleProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn } from "@/lib/utils";

type QuickActionCardProps = {
  href: string;
  title: string;
  description?: string;
  icon: ReactNode;
  badge?: string;
  badgeTone?: "success" | "warning" | "neutral";
  tone?: "dark" | "accent" | "light";
  download?: boolean;
};

export function QuickActionCard({
  href,
  title,
  description,
  icon,
  badge,
  badgeTone,
  tone = "light",
  download = false,
}: QuickActionCardProps) {
  const { t } = useAdminLocale();
  const className = cn(
    "group flex h-full min-h-[148px] flex-col justify-between rounded-[20px] border p-4 transition duration-200 hover:-translate-y-0.5",
    tone === "dark"
      ? "border-slate-900/70 bg-slate-950 text-white hover:border-slate-700 hover:shadow-[0_16px_28px_rgba(15,23,42,0.12)] dark:border-slate-700/70 dark:bg-slate-900/80"
      : tone === "accent"
        ? "border-[var(--admin-panel-border-strong)] bg-[linear-gradient(180deg,var(--admin-accent-soft),var(--admin-inner-bg))] text-[var(--color-text)] hover:shadow-[0_16px_28px_rgba(15,23,42,0.08)]"
        : "border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)] text-[var(--color-text)] hover:border-[var(--admin-panel-border-strong)] hover:shadow-[0_16px_28px_rgba(15,23,42,0.08)]"
  );

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-2xl border",
            tone === "dark"
              ? "border-white/10 bg-white/10 text-white"
              : "border-[var(--admin-panel-border)] bg-[var(--admin-icon-bg)] text-[var(--color-text)]"
          )}
        >
          {icon}
        </span>
        {badge ? <StatusBadge label={badge} tone={badgeTone ?? (badge === "JSON" ? "neutral" : "success")} /> : null}
      </div>

      <div className="mt-4 flex-1">
        <h3
          className={cn(
            "text-base font-semibold tracking-[-0.02em]",
            tone === "dark" ? "text-white" : "text-[var(--color-text)]"
          )}
        >
          {title}
        </h3>
        {description ? (
          <p className={cn("mt-2 text-sm leading-6", tone === "dark" ? "text-white/72" : "text-[var(--text-soft)]")}>
            {description}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-4 inline-flex items-center gap-2 text-sm font-semibold",
          tone === "dark" ? "text-white" : "text-[var(--color-text)]"
        )}
      >
        <span>{download ? t("common.download") : t("common.open")}</span>
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
