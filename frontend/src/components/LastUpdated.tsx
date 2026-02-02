import { formatAge } from "../lib/time";

export function LastUpdated({ lastUpdated }: { lastUpdated: string }) {
  return <span className="text-xs text-slate-500">{formatAge(lastUpdated)} ago</span>;
}