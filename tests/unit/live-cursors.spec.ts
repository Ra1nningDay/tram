import { describe, expect, it } from "vitest";

import type { Vehicle } from "../../src/features/shuttle/api";
import { shouldUseLiveVehicleFeed } from "../../src/features/shuttle/live-mode";
import {
  getVisibleLiveCursors,
  getExpectedLiveIntervalMs,
  LIVE_MOVING_EXPECTED_INTERVAL_MS,
  resolveLiveCursorDisplay,
  syncLiveCursors,
  type LiveCursor,
} from "../../src/hooks/useLiveOrSimVehicles";

function createVehicle(id: string, lastUpdated: string): Vehicle {
  return {
    id,
    label: id,
    latitude: 13.612,
    longitude: 100.837,
    heading: 180,
    direction: "outbound",
    last_updated: lastUpdated,
    status: "fresh",
    crowding: "normal",
    speedKph: 18,
    routeDistanceM: 100,
    matchedPosition: { lng: 100.837, lat: 13.612 },
    etaConfidence: 0.92,
  };
}

function createCursor(id: string, lastUpdated: string): LiveCursor {
  return {
    id,
    label: id,
    latitude: 13.612,
    longitude: 100.837,
    interpolationStartLatitude: 13.612,
    interpolationStartLongitude: 100.837,
    expectedIntervalMs: LIVE_MOVING_EXPECTED_INTERVAL_MS,
    routeDistanceM: 100,
    speedKmh: 18,
    heading: 180,
    crowding: "normal",
    direction: "outbound",
    status: "fresh",
    last_updated: lastUpdated,
    lastGpsMs: Date.now(),
  };
}

describe("live cursor reconciliation", () => {
  it("treats live mode as live even when there are no driver vehicles yet", () => {
    expect(shouldUseLiveVehicleFeed("live")).toBe(true);
    expect(shouldUseLiveVehicleFeed("simulate")).toBe(false);
  });

  it("clears cursors when the latest live snapshot is empty", () => {
    const cursors = new Map<string, LiveCursor>([
      ["TRAM-8", createCursor("TRAM-8", new Date().toISOString())],
    ]);

    syncLiveCursors(cursors, [], Date.now());

    expect(cursors.size).toBe(0);
  });

  it("drops hidden cursors from the visible live frame", () => {
    const nowMs = Date.parse("2026-04-03T12:00:00.000Z");
    const cursors = new Map<string, LiveCursor>([
      ["TRAM-1", createCursor("TRAM-1", new Date(nowMs - 30_000).toISOString())],
      ["TRAM-8", createCursor("TRAM-8", new Date(nowMs - 11 * 60_000).toISOString())],
    ]);

    const visible = getVisibleLiveCursors(cursors, nowMs);

    expect(visible.map((cursor) => cursor.id)).toEqual(["TRAM-1"]);
    expect(cursors.has("TRAM-8")).toBe(false);
  });

  it("updates an existing cursor from a fresh stream snapshot", () => {
    const nowMs = Date.parse("2026-04-03T12:00:00.000Z");
    const cursors = new Map<string, LiveCursor>([
      ["TRAM-8", createCursor("TRAM-8", new Date(nowMs - 5_000).toISOString())],
    ]);

    syncLiveCursors(
      cursors,
      [createVehicle("TRAM-8", new Date(nowMs).toISOString())],
      nowMs,
    );

    expect(cursors.get("TRAM-8")?.last_updated).toBe(new Date(nowMs).toISOString());
    expect(cursors.get("TRAM-8")?.speedKmh).toBe(18);
    expect(cursors.get("TRAM-8")?.routeDistanceM).toBe(100);
    expect(cursors.get("TRAM-8")?.interpolationStartLatitude).toBe(13.612);
    expect(cursors.get("TRAM-8")?.expectedIntervalMs).toBe(
      getExpectedLiveIntervalMs(18),
    );
  });

  it("interpolates first, then freezes and downgrades to delayed after 1.5x cadence", () => {
    const baseCursor = createCursor("TRAM-8", "2026-04-03T12:00:00.000Z");
    const cursor: LiveCursor = {
      ...baseCursor,
      latitude: 13.613,
      longitude: 100.838,
      interpolationStartLatitude: 13.612,
      interpolationStartLongitude: 100.837,
      lastGpsMs: 2_000,
      status: "fresh",
    };

    const interpolating = resolveLiveCursorDisplay(cursor, 3_000);
    expect(interpolating.latitude).toBeCloseTo(13.6125);
    expect(interpolating.longitude).toBeCloseTo(100.8375);
    expect(interpolating.motionState).toBe("interpolating");
    expect(interpolating.status).toBe("fresh");
    expect(interpolating.isMotionDelayed).toBe(false);

    const extrapolating = resolveLiveCursorDisplay(cursor, 4_500);
    expect(extrapolating.latitude).toBeCloseTo(13.61325);
    expect(extrapolating.longitude).toBeCloseTo(100.83825);
    expect(extrapolating.motionState).toBe("extrapolating");
    expect(extrapolating.status).toBe("fresh");
    expect(extrapolating.isMotionDelayed).toBe(false);

    const frozen = resolveLiveCursorDisplay(cursor, 5_500);
    expect(frozen.latitude).toBeCloseTo(13.6135);
    expect(frozen.longitude).toBeCloseTo(100.8385);
    expect(frozen.motionState).toBe("frozen");
    expect(frozen.status).toBe("delayed");
    expect(frozen.isMotionDelayed).toBe(true);
  });
});
