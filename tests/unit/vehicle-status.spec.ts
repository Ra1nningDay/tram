import { describe, expect, it } from "vitest";

import type { Vehicle } from "../../src/features/shuttle/api";
import {
  deriveVehicleStatus,
  normalizeLiveVehicleFeed,
} from "../../src/lib/vehicles/status";

function createVehicle(lastUpdated: string): Vehicle {
  return {
    id: "TRAM-8",
    label: "TRAM-8",
    latitude: 13.612,
    longitude: 100.837,
    direction: "outbound",
    last_updated: lastUpdated,
    status: "fresh",
    crowding: "normal",
  };
}

describe("vehicle live status", () => {
  const nowMs = Date.parse("2026-04-03T12:00:00.000Z");

  it("derives fresh, delayed, offline, and hidden from last_updated", () => {
    expect(
      deriveVehicleStatus(new Date(nowMs - 59_000).toISOString(), nowMs),
    ).toBe("fresh");
    expect(
      deriveVehicleStatus(new Date(nowMs - 60_000).toISOString(), nowMs),
    ).toBe("delayed");
    expect(
      deriveVehicleStatus(new Date(nowMs - 5 * 60_000).toISOString(), nowMs),
    ).toBe("offline");
    expect(
      deriveVehicleStatus(new Date(nowMs - 10 * 60_000).toISOString(), nowMs),
    ).toBe("hidden");
  });

  it("filters hidden vehicles from normalized live feeds", () => {
    const vehicles = [
      createVehicle(new Date(nowMs - 30_000).toISOString()),
      createVehicle(new Date(nowMs - 9 * 60_000).toISOString()),
      createVehicle(new Date(nowMs - 11 * 60_000).toISOString()),
    ];

    expect(normalizeLiveVehicleFeed(vehicles, nowMs).map((vehicle) => vehicle.status)).toEqual([
      "fresh",
      "offline",
    ]);
  });
});
