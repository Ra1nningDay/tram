import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  label: string;
  tone?: "success" | "warning" | "neutral";
};

const TONE_STYLES: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  success: "bg-[var(--admin-badge-success-bg)] text-[var(--admin-badge-success-text)]",
  warning: "bg-[var(--admin-badge-warning-bg)] text-[var(--admin-badge-warning-text)]",
  neutral: "bg-[var(--admin-badge-neutral-bg)] text-[var(--text-soft)]",
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
        TONE_STYLES[tone]
      )}
    >
      {label}
    </span>
  );
}
