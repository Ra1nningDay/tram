import { describe, expect, it } from "vitest";

import {
  clampMobilePanelFreeHeightPx,
  getMobilePanelHeight,
  getVehicleIdFromAutoExpandRequest,
  MOBILE_HEADER_HEIGHT,
  MOBILE_PANEL_MAX_HEIGHT_VH,
  promoteVehiclePanelItems,
} from "../../src/components/vehicle-panel-state";

describe("vehicle panel state helpers", () => {
  it("promotes a vehicle only when a promoted id is provided", () => {
    const items = [
      { vehicleId: "TRAM-01" },
      { vehicleId: "TRAM-02" },
      { vehicleId: "TRAM-03" },
    ];

    expect(promoteVehiclePanelItems(items, null)).toEqual(items);
    expect(promoteVehiclePanelItems(items, "TRAM-03").map((item) => item.vehicleId)).toEqual([
      "TRAM-03",
      "TRAM-01",
      "TRAM-02",
    ]);
  });

  it("derives snap heights and clamps free heights for the mobile panel", () => {
    expect(
      getMobilePanelHeight({
        snapLevel: 0,
        panelHeightMode: "snap",
        freePanelHeightPx: null,
        viewportHeightPx: 1_000,
      })
    ).toBe(MOBILE_HEADER_HEIGHT);

    expect(
      getMobilePanelHeight({
        snapLevel: 1,
        panelHeightMode: "snap",
        freePanelHeightPx: null,
        viewportHeightPx: 1_000,
      })
    ).toBe("52vh");

    expect(
      getMobilePanelHeight({
        snapLevel: 2,
        panelHeightMode: "free",
        freePanelHeightPx: 1_200,
        viewportHeightPx: 1_000,
      })
    ).toBe(1_000 * (MOBILE_PANEL_MAX_HEIGHT_VH / 100));
  });

  it("clamps free heights between the header height and the configured max", () => {
    expect(clampMobilePanelFreeHeightPx(40, 1_000)).toBe(MOBILE_HEADER_HEIGHT);
    expect(clampMobilePanelFreeHeightPx(700, 1_000)).toBe(700);
    expect(clampMobilePanelFreeHeightPx(1_400, 1_000)).toBe(850);
  });

  it("parses auto-expand requests into vehicle ids for explicit scrolls", () => {
    expect(getVehicleIdFromAutoExpandRequest("TRAM-02:123456")).toBe("TRAM-02");
    expect(getVehicleIdFromAutoExpandRequest("TRAM-09")).toBe("TRAM-09");
    expect(getVehicleIdFromAutoExpandRequest(null)).toBeNull();
  });
});
