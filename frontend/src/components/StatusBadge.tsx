import type { Status } from "../features/shuttle/api";
import { statusCopy } from "../lib/status-copy";

export function StatusBadge({ status }: { status: Status }) {
  const label = statusCopy[status]();
  return (
    <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-800">
      {label}
    </span>
  );
}