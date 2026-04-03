import { describe, expect, it } from "vitest";

import { shouldUseLiveVehicleFeed } from "../../src/features/shuttle/live-mode";

describe("shouldUseLiveVehicleFeed", () => {
  it("keeps simulation mode when explicitly requested", () => {
    expect(shouldUseLiveVehicleFeed("simulate", 3, true)).toBe(false);
  });

  it("waits for a first live vehicle snapshot before leaving simulation fallback", () => {
    expect(shouldUseLiveVehicleFeed("live", 0, false)).toBe(false);
  });

  it("switches to live mode as soon as live vehicles appear", () => {
    expect(shouldUseLiveVehicleFeed("live", 1, false)).toBe(true);
  });

  it("stays in live mode after a live snapshot has been seen", () => {
    expect(shouldUseLiveVehicleFeed("live", 0, true)).toBe(true);
  });
});
