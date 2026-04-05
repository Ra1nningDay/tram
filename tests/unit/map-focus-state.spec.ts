import { describe, expect, it } from "vitest";

import {
  clearStopFocus,
  clearVehicleFocusFromBlankMap,
  INITIAL_MAP_FOCUS_STATE,
  selectStop,
  selectVehicleFromMap,
  selectVehicleFromPanel,
  selectVehicleFromSearch,
  shouldAutoFocusVehicleSelection,
} from "../../src/features/map/focus-state";

describe("map focus state", () => {
  it("only auto-focuses vehicles for search and panel selections", () => {
    expect(shouldAutoFocusVehicleSelection("map")).toBe(false);
    expect(shouldAutoFocusVehicleSelection("stop")).toBe(false);
    expect(shouldAutoFocusVehicleSelection("none")).toBe(false);
    expect(shouldAutoFocusVehicleSelection("panel")).toBe(true);
    expect(shouldAutoFocusVehicleSelection("search")).toBe(true);
  });

  it("keeps the first promoted vehicle for the whole map-focus session", () => {
    const stopFocusedState = selectStop(INITIAL_MAP_FOCUS_STATE, "stop-a");
    const firstVehicleFocus = selectVehicleFromMap(stopFocusedState, "TRAM-02");
    const reselection = selectVehicleFromMap(firstVehicleFocus, "TRAM-03");

    expect(firstVehicleFocus.selectedStopId).toBeNull();
    expect(firstVehicleFocus.selectedVehicleId).toBe("TRAM-02");
    expect(firstVehicleFocus.selectionOrigin).toBe("map");
    expect(firstVehicleFocus.promotedVehicleId).toBe("TRAM-02");
    expect(firstVehicleFocus.vehiclePromotionSessionActive).toBe(true);

    expect(reselection.selectedVehicleId).toBe("TRAM-03");
    expect(reselection.promotedVehicleId).toBe("TRAM-02");
    expect(reselection.vehiclePromotionSessionActive).toBe(true);
  });

  it("resets the promotion session when blank-map clear cancels vehicle focus", () => {
    const focusedVehicle = selectVehicleFromMap(INITIAL_MAP_FOCUS_STATE, "TRAM-02");
    const cleared = clearVehicleFocusFromBlankMap(focusedVehicle);

    expect(cleared.selectedVehicleId).toBeNull();
    expect(cleared.selectionOrigin).toBe("none");
    expect(cleared.promotedVehicleId).toBeNull();
    expect(cleared.vehiclePromotionSessionActive).toBe(false);
  });

  it("keeps the current promotion order when selecting vehicles from the panel", () => {
    const mapFocused = selectVehicleFromMap(INITIAL_MAP_FOCUS_STATE, "TRAM-02");
    const panelFocused = selectVehicleFromPanel(mapFocused, "TRAM-03");

    expect(panelFocused.selectedVehicleId).toBe("TRAM-03");
    expect(panelFocused.selectionOrigin).toBe("panel");
    expect(panelFocused.promotedVehicleId).toBe("TRAM-02");
    expect(panelFocused.vehiclePromotionSessionActive).toBe(true);
  });

  it("preserves search behavior by promoting the searched vehicle immediately", () => {
    const searched = selectVehicleFromSearch(INITIAL_MAP_FOCUS_STATE, "TRAM-09");

    expect(searched.selectedVehicleId).toBe("TRAM-09");
    expect(searched.selectionOrigin).toBe("search");
    expect(searched.promotedVehicleId).toBe("TRAM-09");
    expect(searched.vehiclePromotionSessionActive).toBe(false);
  });

  it("clears stop focus without reintroducing a vehicle session", () => {
    const focusedStop = selectStop(INITIAL_MAP_FOCUS_STATE, "stop-a");
    const cleared = clearStopFocus(focusedStop);

    expect(cleared.selectedStopId).toBeNull();
    expect(cleared.selectedVehicleId).toBeNull();
    expect(cleared.selectionOrigin).toBe("none");
    expect(cleared.vehiclePromotionSessionActive).toBe(false);
  });
});
