import { describe, expect, it } from "vitest";

import { mergeVehicleSourceStates } from "../../src/lib/vehicles/source-arbitration";
import {
  buildLiveVehicleTelemetryState,
  buildTelemetryRouteContext,
} from "../../src/lib/vehicles/telemetry";
import type { ShuttleData } from "../../src/lib/data/shuttle-data";
import type { SourceVehicleState } from "../../src/lib/vehicles/source-state";

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

const routeContext = buildTelemetryRouteContext(shuttleData);

function createState(params: {
  vehicleId: string;
  source: "driver" | "hardware";
  latitude: number;
  longitude: number;
  lastUpdated: string;
  accuracyM?: number;
  crowding?: "normal" | "full";
}) {
  const rawFix = {
    latitude: params.latitude,
    longitude: params.longitude,
    speed: 3,
    heading: 90,
    receivedAt: new Date(params.lastUpdated),
  };
  const telemetry = buildLiveVehicleTelemetryState(
    {
      id: params.vehicleId,
      label: params.vehicleId,
      direction: "outbound",
      crowding: params.crowding,
      lastUpdated: params.lastUpdated,
      rawFix,
    },
    routeContext,
  );

  return {
    vehicleId: params.vehicleId,
    label: params.vehicleId,
    source: params.source,
    direction: "outbound",
    crowding: params.crowding,
    accuracyM: params.accuracyM,
    observedAt: params.lastUpdated,
    rawFix,
    telemetry,
    receivedAt: new Date(params.lastUpdated),
  } satisfies SourceVehicleState;
}

describe("vehicle source arbitration", () => {
  it("prefers on-route hardware position but preserves fresh driver crowding", () => {
    const hardware = createState({
      vehicleId: "TRAM-1",
      source: "hardware",
      latitude: 13.0,
      longitude: 100.0004,
      lastUpdated: "2026-04-04T10:00:00.000Z",
      accuracyM: 1.8,
    });
    const driver = createState({
      vehicleId: "TRAM-1",
      source: "driver",
      latitude: 13.0002,
      longitude: 100.0013,
      lastUpdated: "2026-04-04T10:00:00.000Z",
      crowding: "full",
    });

    const result = mergeVehicleSourceStates({
      vehicleId: "TRAM-1",
      states: [driver, hardware],
      nowMs: Date.parse("2026-04-04T10:00:02.000Z"),
    });

    expect(result.telemetryState?.snapshot.telemetrySource).toBe("hardware");
    expect(result.telemetryState?.snapshot.crowding).toBe("full");
    expect(result.resolutionState?.winnerSource).toBe("hardware");
  });

  it("uses hysteresis before switching to a better challenger source", () => {
    const driver = createState({
      vehicleId: "TRAM-2",
      source: "driver",
      latitude: 13.0,
      longitude: 100.0004,
      lastUpdated: "2026-04-04T10:00:00.000Z",
    });
    const hardware = createState({
      vehicleId: "TRAM-2",
      source: "hardware",
      latitude: 13.0,
      longitude: 100.0005,
      lastUpdated: "2026-04-04T10:00:13.000Z",
      accuracyM: 2,
    });

    const result = mergeVehicleSourceStates({
      vehicleId: "TRAM-2",
      states: [driver, hardware],
      previousResolution: {
        vehicleId: "TRAM-2",
        winnerSource: "driver",
        challengerStreak: 0,
        winnerScore: 0.7,
        lastResolvedAt: "2026-04-04T10:00:00.000Z",
      },
      nowMs: Date.parse("2026-04-04T10:00:14.000Z"),
    });

    expect(result.telemetryState?.snapshot.telemetrySource).toBe("driver");
    expect(result.resolutionState).toEqual(
      expect.objectContaining({
        winnerSource: "driver",
        challengerSource: "hardware",
        challengerStreak: 1,
      }),
    );
  });
});
