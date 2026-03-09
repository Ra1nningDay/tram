import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  label: string;
  tone?: "success" | "warning" | "neutral";
};

const TONE_STYLES: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  success: "bg-[#e7f5eb] text-[#18703c]",
  warning: "bg-[#fff2df] text-[#9a5800]",
  neutral: "bg-[rgba(15,23,42,0.08)] text-[var(--text-soft)]",
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
