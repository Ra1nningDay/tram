import { describe, expect, it } from "vitest";

import { shouldUseLiveVehicleFeed } from "../../src/features/shuttle/live-mode";

describe("shouldUseLiveVehicleFeed", () => {
  it("keeps simulation mode when explicitly requested", () => {
    expect(shouldUseLiveVehicleFeed("simulate")).toBe(false);
  });

  it("stays in live mode even before any driver snapshot has arrived", () => {
    expect(shouldUseLiveVehicleFeed("live")).toBe(true);
  });
});
