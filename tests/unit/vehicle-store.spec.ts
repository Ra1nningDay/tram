import { beforeEach, describe, expect, it } from "vitest";

import {
  getAllVehicles,
  removeVehicle,
  upsertVehicle,
} from "../../src/lib/vehicles/store";
import { resetVehicleSourceStateStores } from "../../src/lib/vehicles/source-state";

describe("vehicle store", () => {
  beforeEach(() => {
    resetVehicleSourceStateStores();
  });

  it("removes a live vehicle immediately", async () => {
    await upsertVehicle({
      id: "TRAM-8",
      label: "TRAM-8",
      latitude: 13.612,
      longitude: 100.837,
      direction: "outbound",
      source: "driver",
    });

    await expect(getAllVehicles()).resolves.toHaveLength(1);
    await expect(removeVehicle("TRAM-8")).resolves.toBe(true);
    await expect(getAllVehicles()).resolves.toHaveLength(0);
  });

  it("does not remove a newer vehicle session with a stale stop request", async () => {
    await upsertVehicle({
      id: "TRAM-8",
      label: "TRAM-8",
      latitude: 13.612,
      longitude: 100.837,
      direction: "outbound",
      source: "driver",
      sessionId: "session-new",
    });

    await expect(removeVehicle("TRAM-8", "session-old")).resolves.toBe(false);
    await expect(getAllVehicles()).resolves.toHaveLength(1);
    await expect(removeVehicle("TRAM-8", "session-new")).resolves.toBe(true);
    await expect(getAllVehicles()).resolves.toHaveLength(0);
  });
});
