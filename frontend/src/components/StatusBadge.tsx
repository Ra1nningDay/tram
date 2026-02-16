import type { Status } from "../features/shuttle/api";
import { statusCopy } from "../lib/status-copy";

export function StatusBadge({ status }: { status: Status }) {
  const label = statusCopy[status]();
  return (
    <span className="rounded bg-[var(--color-surface-lighter)] px-2 py-1 text-xs text-[var(--color-text)]">
      {label}
    </span>
  );
}
