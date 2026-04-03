import { beforeEach, describe, expect, it } from "vitest";

import {
  getAllVehicles,
  removeVehicle,
  upsertVehicle,
} from "../../src/lib/vehicles/store";

type VehicleStoreGlobal = typeof globalThis & {
  __vehicleStore?: unknown;
};

describe("vehicle store", () => {
  beforeEach(() => {
    delete (globalThis as VehicleStoreGlobal).__vehicleStore;
  });

  it("removes a live vehicle immediately", () => {
    upsertVehicle({
      id: "TRAM-8",
      label: "TRAM-8",
      latitude: 13.612,
      longitude: 100.837,
      direction: "outbound",
      source: "driver",
    });

    expect(getAllVehicles()).toHaveLength(1);
    expect(removeVehicle("TRAM-8")).toBe(true);
    expect(getAllVehicles()).toHaveLength(0);
  });

  it("does not remove a newer vehicle session with a stale stop request", () => {
    upsertVehicle({
      id: "TRAM-8",
      label: "TRAM-8",
      latitude: 13.612,
      longitude: 100.837,
      direction: "outbound",
      source: "driver",
      sessionId: "session-new",
    });

    expect(removeVehicle("TRAM-8", "session-old")).toBe(false);
    expect(getAllVehicles()).toHaveLength(1);
    expect(removeVehicle("TRAM-8", "session-new")).toBe(true);
    expect(getAllVehicles()).toHaveLength(0);
  });
});
