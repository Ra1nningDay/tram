import { describe, expect, it } from "vitest";

import { buildVehicleEtaSnapshot } from "../../src/lib/vehicles/eta";
import {
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
          stopReferences: [
            { id: "stop-1", sequence: 1 },
            { id: "stop-2", sequence: 2 },
          ],
        },
      ],
    },
  ],
  stops: [
    {
      id: "stop-1",
      nameTh: "Stop 1",
      nameEn: "Stop 1",
      latitude: 13.0,
      longitude: 100.0005,
      sequence: 1,
      direction: "outbound",
      icon: null,
      color: null,
    },
    {
      id: "stop-2",
      nameTh: "Stop 2",
      nameEn: "Stop 2",
      latitude: 13.0006,
      longitude: 100.001,
      sequence: 2,
      direction: "outbound",
      icon: null,
      color: null,
    },
  ],
};

describe("vehicle eta engine", () => {
  it("returns ETA 0 when the vehicle is at the stop", async () => {
    const routeContext = buildTelemetryRouteContext(shuttleData);
    const telemetry = buildLiveVehicleTelemetryState(
      {
        id: "TRAM-1",
        label: "TRAM-1",
        direction: "outbound",
        lastUpdated: "2026-04-04T10:00:00.000Z",
        rawFix: {
          latitude: 13.0,
          longitude: 100.0005,
          speed: 3,
          receivedAt: new Date("2026-04-04T10:00:00.000Z"),
        },
      },
      routeContext,
    );

    const snapshot = await buildVehicleEtaSnapshot([telemetry], new Date("2026-04-04T10:00:00.000Z"), routeContext);

    expect(snapshot.etasByStopId["stop-1"]?.[0]?.eta_minutes).toBe(0);
    expect(snapshot.telemetryByVehicleId["TRAM-1"]?.nextStopId).toBe("stop-2");
    expect(snapshot.telemetryByVehicleId["TRAM-1"]?.distanceToNextStopM).toBeGreaterThan(0);
  });

  it("sorts known ETAs before unknown ETAs, then by ETA", async () => {
    const routeContext = buildTelemetryRouteContext(shuttleData);

    const fastVehicle = buildLiveVehicleTelemetryState(
      {
        id: "TRAM-FAST",
        label: "FAST",
        direction: "outbound",
        lastUpdated: "2026-04-04T10:00:01.000Z",
        rawFix: {
          latitude: 13.0,
          longitude: 100.0003,
          speed: 4,
          receivedAt: new Date("2026-04-04T10:00:01.000Z"),
        },
      },
      routeContext,
    );

    const slowVehicle = buildLiveVehicleTelemetryState(
      {
        id: "TRAM-SLOW",
        label: "SLOW",
        direction: "outbound",
        lastUpdated: "2026-04-04T10:00:01.000Z",
        rawFix: {
          latitude: 13.0,
          longitude: 100.0,
          speed: 0.6,
          receivedAt: new Date("2026-04-04T10:00:01.000Z"),
        },
      },
      routeContext,
    );

    const offRouteVehicle = buildLiveVehicleTelemetryState(
      {
        id: "TRAM-OFF",
        label: "OFF",
        direction: "outbound",
        lastUpdated: "2026-04-04T10:00:01.000Z",
        rawFix: {
          latitude: 13.0002,
          longitude: 100.0013,
          speed: 3,
          receivedAt: new Date("2026-04-04T10:00:01.000Z"),
        },
      },
      routeContext,
    );

    const snapshot = await buildVehicleEtaSnapshot(
      [slowVehicle, offRouteVehicle, fastVehicle],
      new Date("2026-04-04T10:00:01.000Z"),
      routeContext,
    );

    expect(snapshot.etasByStopId["stop-1"]?.map((eta) => eta.vehicle_id)).toEqual([
      "TRAM-FAST",
      "TRAM-SLOW",
      "TRAM-OFF",
    ]);
    expect(snapshot.etasByStopId["stop-1"]?.[2]?.eta_minutes).toBe(-1);
  });
});
