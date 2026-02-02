import type { Status } from "../features/shuttle/api";

export function formatAge(lastUpdatedIso: string): string {
  const ageSeconds = Math.max(0, (Date.now() - new Date(lastUpdatedIso).getTime()) / 1000);
  if (ageSeconds < 60) return `${Math.round(ageSeconds)}s`;
  return `${Math.round(ageSeconds / 60)}m`;
}

export function isStale(status: Status) {
  return status === "delayed" || status === "offline";
}