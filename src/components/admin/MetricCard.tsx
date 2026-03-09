import { TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  hint: string;
  accent?: "amber" | "slate";
  icon?: ReactNode;
};

export function MetricCard({ label, value, hint, accent = "slate", icon }: MetricCardProps) {
  return (
    <article
      className={cn(
        "relative overflow-hidden p-5",
        accent === "amber"
          ? "admin-panel-strong"
          : "admin-panel"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full blur-2xl",
          accent === "amber" ? "bg-[var(--admin-accent-soft)]" : "bg-[rgba(15,23,42,0.08)] dark:bg-[rgba(255,255,255,0.08)]"
        )}
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-faint)]">{label}</p>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(15,23,42,0.06)] text-[var(--color-text)]">
            {icon ?? <TrendingUp size={18} />}
          </span>
        </div>
        <p className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text)] md:text-[2.2rem]">
          {value}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{hint}</p>
      </div>
    </article>
  );
}
