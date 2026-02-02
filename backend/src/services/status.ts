import { STATUS_THRESHOLDS } from "./thresholds.js";

export type Status = "fresh" | "delayed" | "offline" | "hidden";

export function deriveStatus(lastUpdatedIso: string, serverTime = new Date()): Status {
  const last = new Date(lastUpdatedIso).getTime();
  const ageSeconds = Math.max(0, (serverTime.getTime() - last) / 1000);
  if (ageSeconds <= STATUS_THRESHOLDS.freshSeconds) return "fresh";
  if (ageSeconds <= STATUS_THRESHOLDS.delayedSeconds) return "delayed";
  if (ageSeconds <= STATUS_THRESHOLDS.offlineSeconds) return "offline";
  return "hidden";
}