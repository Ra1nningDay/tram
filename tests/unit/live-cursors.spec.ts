import { describe, expect, it } from "vitest";

import type { Vehicle } from "../../src/features/shuttle/api";
import {
  getVisibleLiveCursors,
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
  };
}

function createCursor(id: string, lastUpdated: string): LiveCursor {
  return {
    id,
    label: id,
    latitude: 13.612,
    longitude: 100.837,
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
  });
});
