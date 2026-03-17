import { TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  accent?: "amber" | "slate";
  icon?: ReactNode;
};

export function MetricCard({ label, value, hint, accent = "slate", icon }: MetricCardProps) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[20px] p-4 sm:p-5",
        accent === "amber" ? "admin-panel-strong" : "admin-panel"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text)] md:text-[2.05rem]">
            {value}
          </p>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--admin-icon-bg)] text-[var(--color-text)]">
          {icon ?? <TrendingUp size={18} />}
        </span>
      </div>
      {hint ? <p className="mt-3 text-xs font-medium leading-5 text-[var(--text-soft)]">{hint}</p> : null}
    </article>
  );
}
