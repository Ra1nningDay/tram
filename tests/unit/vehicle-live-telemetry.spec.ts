import { describe, expect, it } from "vitest";

import {
  buildLiveVehicleSnapshot,
  buildLiveVehicleTelemetryState,
  buildTelemetryRouteContext,
} from "../../src/lib/vehicles/telemetry";
import type { ShuttleData } from "../../src/lib/data/shuttle-data";

const shuttleData: ShuttleData = {
  routes: [
    {
      id: "route-1",
      name: "Campus Loop",
      directions: [
        {
          direction: "outbound",
          coordinates: [
            [100.0, 13.0],
            [100.001, 13.0],
            [100.001, 13.001],
          ],
          stopReferences: [],
        },
      ],
    },
  ],
  stops: [],
};

describe("vehicle live telemetry", () => {
  it("prefers sane device speed and heading when building the live snapshot", () => {
    const snapshot = buildLiveVehicleSnapshot(
      {
        id: "TRAM-1",
        label: "TRAM-1",
        direction: "outbound",
        crowding: "normal",
        lastUpdated: "2026-04-04T10:00:00.000Z",
        rawFix: {
          latitude: 13.0,
          longitude: 100.0004,
          heading: 95,
          speed: 3,
          receivedAt: new Date("2026-04-04T10:00:00.000Z"),
        },
      },
      buildTelemetryRouteContext(shuttleData),
    );

    expect(snapshot.speedKph).toBe(10.8);
    expect(snapshot.heading).toBe(95);
    expect(snapshot.routeDistanceM).toBeGreaterThan(0);
    expect(snapshot.matchedPosition).toEqual({
      lng: 100.0004,
      lat: 13,
    });
    expect(snapshot.etaConfidence).toBeGreaterThanOrEqual(0.8);
  });

  it("falls back to server-derived speed and heading when device values are not sane", () => {
    const snapshot = buildLiveVehicleSnapshot(
      {
        id: "TRAM-2",
        label: "TRAM-2",
        direction: "outbound",
        lastUpdated: "2026-04-04T10:00:01.000Z",
        rawFix: {
          latitude: 13.0,
          longitude: 100.0001,
          speed: 999,
          receivedAt: new Date("2026-04-04T10:00:01.000Z"),
        },
        previousRawFix: {
          latitude: 13.0,
          longitude: 100.0,
          receivedAt: new Date("2026-04-04T10:00:00.000Z"),
        },
      },
      buildTelemetryRouteContext(shuttleData),
    );

    expect(snapshot.speedKph).toBeGreaterThan(35);
    expect(snapshot.speedKph).toBeLessThan(45);
    expect(snapshot.heading).toBeGreaterThan(80);
    expect(snapshot.heading).toBeLessThan(100);
    expect(snapshot.routeDistanceM).toBeGreaterThan(0);
    expect(snapshot.etaConfidence).toBeGreaterThanOrEqual(0.8);
  });

  it("lowers ETA confidence when the vehicle is outside the off-route corridor", () => {
    const telemetry = buildLiveVehicleTelemetryState(
      {
        id: "TRAM-3",
        label: "TRAM-3",
        direction: "outbound",
        lastUpdated: "2026-04-04T10:00:02.000Z",
        rawFix: {
          latitude: 13.0002,
          longitude: 100.0013,
          speed: 3,
          receivedAt: new Date("2026-04-04T10:00:02.000Z"),
        },
      },
      buildTelemetryRouteContext(shuttleData),
    );

    expect(telemetry.isOffRoute).toBe(true);
    expect(telemetry.offRouteDistanceM).toBeGreaterThan(20);
    expect(telemetry.snapshot.etaConfidence).toBeLessThanOrEqual(0.2);
  });
});
