import { describe, expect, it } from "vitest";

import {
  getExpectedUserCursorIntervalMs,
  resolveUserLocationCursorDisplay,
  syncUserLocationCursor,
  USER_CURSOR_DEFAULT_EXPECTED_INTERVAL_MS,
} from "../../src/features/map/user-location-cursor";
import type { UserLocation } from "../../src/hooks/useUserLocation";

function createLocation(
  latitude: number,
  longitude: number,
  timestamp: number,
): UserLocation {
  return {
    latitude,
    longitude,
    accuracy: 6,
    heading: 90,
    timestamp,
  };
}

describe("user location cursor smoothing", () => {
  it("uses a default interval until it has enough GPS history", () => {
    expect(getExpectedUserCursorIntervalMs()).toBe(
      USER_CURSOR_DEFAULT_EXPECTED_INTERVAL_MS,
    );
    expect(getExpectedUserCursorIntervalMs(5_000, 4_000)).toBe(
      USER_CURSOR_DEFAULT_EXPECTED_INTERVAL_MS,
    );
  });

  it("creates a cursor from the first fix and interpolates from the second fix onward", () => {
    const firstFix = createLocation(14.039, 100.601, 1_000);
    const secondFix = createLocation(14.04, 100.602, 5_000);

    const firstCursor = syncUserLocationCursor(null, firstFix, 1_500);
    expect(firstCursor.interpolationStartLatitude).toBe(firstFix.latitude);
    expect(firstCursor.interpolationStartLongitude).toBe(firstFix.longitude);

    const nextCursor = syncUserLocationCursor(firstCursor, secondFix, 5_500);
    const interpolating = resolveUserLocationCursorDisplay(nextCursor, 7_500);

    expect(nextCursor.expectedIntervalMs).toBe(4_000);
    expect(interpolating.displayLatitude).toBeCloseTo(14.0395);
    expect(interpolating.displayLongitude).toBeCloseTo(100.6015);
    expect(interpolating.motionState).toBe("interpolating");
    expect(interpolating.isMotionDelayed).toBe(false);
  });

  it("extrapolates briefly and then freezes when the cursor goes stale", () => {
    const cursor = {
      ...createLocation(14.04, 100.602, 5_000),
      interpolationStartLatitude: 14.039,
      interpolationStartLongitude: 100.601,
      expectedIntervalMs: 4_000,
      lastGpsMs: 5_500,
    };

    const extrapolating = resolveUserLocationCursorDisplay(cursor, 10_500);
    expect(extrapolating.displayLatitude).toBeCloseTo(14.04025);
    expect(extrapolating.displayLongitude).toBeCloseTo(100.60225);
    expect(extrapolating.motionState).toBe("extrapolating");
    expect(extrapolating.isMotionDelayed).toBe(false);

    const frozen = resolveUserLocationCursorDisplay(cursor, 12_000);
    expect(frozen.motionState).toBe("frozen");
    expect(frozen.isMotionDelayed).toBe(true);
  });
});
