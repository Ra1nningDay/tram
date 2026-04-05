import type { UserLocation } from "@/hooks/useUserLocation";

export const USER_FOLLOW_FOREGROUND_MAX_AGE_MS = 4_000;
export const USER_FOLLOW_FOREGROUND_TIMEOUT_MS = 10_000;
export const USER_FOLLOW_BACKGROUND_MAX_AGE_MS = 60_000;
export const USER_FOLLOW_BACKGROUND_TIMEOUT_MS = 30_000;

export const USER_CURSOR_DEFAULT_EXPECTED_INTERVAL_MS =
  USER_FOLLOW_FOREGROUND_MAX_AGE_MS;
export const USER_CURSOR_MIN_EXPECTED_INTERVAL_MS = 1_000;
export const USER_CURSOR_MAX_EXPECTED_INTERVAL_MS =
  USER_FOLLOW_FOREGROUND_TIMEOUT_MS;
export const USER_CURSOR_FREEZE_AFTER_MULTIPLIER = 1.5;

export type UserCursorMotionState =
  | "interpolating"
  | "extrapolating"
  | "frozen";

export type UserLocationCursor = UserLocation & {
  interpolationStartLatitude: number;
  interpolationStartLongitude: number;
  expectedIntervalMs: number;
  lastGpsMs: number;
};

export type VisibleUserLocation = UserLocation & {
  displayLatitude: number;
  displayLongitude: number;
  motionState: UserCursorMotionState;
  isMotionDelayed: boolean;
};

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getExpectedUserCursorIntervalMs(
  previousTimestampMs?: number,
  nextTimestampMs?: number,
): number {
  if (
    typeof previousTimestampMs !== "number" ||
    typeof nextTimestampMs !== "number" ||
    nextTimestampMs <= previousTimestampMs
  ) {
    return USER_CURSOR_DEFAULT_EXPECTED_INTERVAL_MS;
  }

  return clamp(
    nextTimestampMs - previousTimestampMs,
    USER_CURSOR_MIN_EXPECTED_INTERVAL_MS,
    USER_CURSOR_MAX_EXPECTED_INTERVAL_MS,
  );
}

export function resolveUserLocationCursorDisplay(
  cursor: UserLocationCursor,
  nowMs: number,
): VisibleUserLocation {
  const expectedIntervalMs = Math.max(1, cursor.expectedIntervalMs);
  const elapsedSinceGpsMs = Math.max(0, nowMs - cursor.lastGpsMs);
  const interpolationProgress = Math.min(
    elapsedSinceGpsMs / expectedIntervalMs,
    1,
  );
  const deltaLatitude = cursor.latitude - cursor.interpolationStartLatitude;
  const deltaLongitude = cursor.longitude - cursor.interpolationStartLongitude;

  if (elapsedSinceGpsMs <= expectedIntervalMs) {
    return {
      ...cursor,
      displayLatitude: lerp(
        cursor.interpolationStartLatitude,
        cursor.latitude,
        interpolationProgress,
      ),
      displayLongitude: lerp(
        cursor.interpolationStartLongitude,
        cursor.longitude,
        interpolationProgress,
      ),
      motionState: "interpolating",
      isMotionDelayed: false,
    };
  }

  const freezeAfterMs =
    expectedIntervalMs * USER_CURSOR_FREEZE_AFTER_MULTIPLIER;
  const extrapolationRatio = Math.min(
    (elapsedSinceGpsMs - expectedIntervalMs) / expectedIntervalMs,
    USER_CURSOR_FREEZE_AFTER_MULTIPLIER - 1,
  );
  const extrapolatedLatitude = cursor.latitude + deltaLatitude * extrapolationRatio;
  const extrapolatedLongitude =
    cursor.longitude + deltaLongitude * extrapolationRatio;

  if (elapsedSinceGpsMs <= freezeAfterMs) {
    return {
      ...cursor,
      displayLatitude: extrapolatedLatitude,
      displayLongitude: extrapolatedLongitude,
      motionState: "extrapolating",
      isMotionDelayed: false,
    };
  }

  return {
    ...cursor,
    displayLatitude: extrapolatedLatitude,
    displayLongitude: extrapolatedLongitude,
    motionState: "frozen",
    isMotionDelayed: true,
  };
}

export function syncUserLocationCursor(
  existingCursor: UserLocationCursor | null,
  location: UserLocation,
  nowMs: number,
): UserLocationCursor {
  const existingDisplay = existingCursor
    ? resolveUserLocationCursorDisplay(existingCursor, nowMs)
    : null;

  return {
    ...location,
    interpolationStartLatitude:
      existingDisplay?.displayLatitude ?? location.latitude,
    interpolationStartLongitude:
      existingDisplay?.displayLongitude ?? location.longitude,
    expectedIntervalMs: getExpectedUserCursorIntervalMs(
      existingCursor?.timestamp,
      location.timestamp,
    ),
    lastGpsMs: nowMs,
  };
}
