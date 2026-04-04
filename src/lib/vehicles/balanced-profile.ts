export const BALANCED_MOVING_INTERVAL_MS = 2_000;
export const BALANCED_IDLE_INTERVAL_MS = 5_000;
export const BALANCED_BACKGROUND_INTERVAL_MS = 10_000;
export const BALANCED_MOVING_SPEED_THRESHOLD_MPS = 2;
export const BALANCED_MOVING_SPEED_THRESHOLD_KPH =
  BALANCED_MOVING_SPEED_THRESHOLD_MPS * 3.6;

export type BalancedTrackingMode = "foreground" | "background";

export function getBalancedTrackingIntervalMs(
  speedMps?: number | null,
  trackingMode: BalancedTrackingMode = "foreground",
): number {
  if (trackingMode === "background") {
    return BALANCED_BACKGROUND_INTERVAL_MS;
  }

  return (speedMps ?? 0) >= BALANCED_MOVING_SPEED_THRESHOLD_MPS
    ? BALANCED_MOVING_INTERVAL_MS
    : BALANCED_IDLE_INTERVAL_MS;
}

export function getBalancedExpectedIntervalMs(speedKph?: number | null): number {
  return (speedKph ?? 0) >= BALANCED_MOVING_SPEED_THRESHOLD_KPH
    ? BALANCED_MOVING_INTERVAL_MS
    : BALANCED_IDLE_INTERVAL_MS;
}
