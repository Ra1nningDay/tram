import { describe, expect, it } from "vitest";

import type { VehicleFeedSnapshot } from "../../src/features/shuttle/api";
import {
  buildLiveFeedDiagnostics,
} from "../../src/lib/vehicles/live";

describe("live feed diagnostics", () => {
  it("summarizes cadence buckets, stale age, and ETA confidence for the balanced profile", () => {
    const now = new Date("2026-04-04T12:00:00.000Z");
    const snapshot: VehicleFeedSnapshot = {
      server_time: now.toISOString(),
      vehicles: [
        {
          id: "TRAM-FAST",
          label: "TRAM-FAST",
          latitude: 13.612,
          longitude: 100.837,
          heading: 90,
          direction: "outbound",
          last_updated: new Date(now.getTime() - 10_000).toISOString(),
          status: "fresh",
          crowding: "normal",
          speedKph: 18,
          routeDistanceM: 120,
          matchedPosition: { lng: 100.837, lat: 13.612 },
          etaConfidence: 0.92,
        },
        {
          id: "TRAM-IDLE",
          label: "TRAM-IDLE",
          latitude: 13.613,
          longitude: 100.838,
          heading: 90,
          direction: "outbound",
          last_updated: new Date(now.getTime() - 70_000).toISOString(),
          status: "delayed",
          crowding: "full",
          speedKph: 3.6,
          routeDistanceM: 240,
          matchedPosition: { lng: 100.838, lat: 13.613 },
          etaConfidence: 0.2,
        },
        {
          id: "TRAM-OFFLINE",
          label: "TRAM-OFFLINE",
          latitude: 13.614,
          longitude: 100.839,
          heading: 90,
          direction: "outbound",
          last_updated: new Date(now.getTime() - 6 * 60_000).toISOString(),
          status: "offline",
          crowding: "normal",
          speedKph: 0,
          routeDistanceM: 360,
          matchedPosition: { lng: 100.839, lat: 13.614 },
          etaConfidence: 0.5,
        },
      ],
      telemetryByVehicleId: {},
    };

    const diagnostics = buildLiveFeedDiagnostics(snapshot, now.getTime());

    expect(diagnostics.vehicleCount).toBe(3);
    expect(diagnostics.cadenceBuckets[2_000]).toBe(1);
    expect(diagnostics.cadenceBuckets[5_000]).toBe(2);
    expect(diagnostics.backgroundCadenceMs).toBe(10_000);
    expect(diagnostics.statusCounts).toEqual({
      fresh: 1,
      delayed: 1,
      offline: 1,
      hidden: 0,
    });
    expect(diagnostics.maxStaleAgeMs).toBe(6 * 60_000);
    expect(diagnostics.averageEtaConfidence).toBe(0.54);
    expect(diagnostics.lowConfidenceVehicleCount).toBe(1);
  });
});
