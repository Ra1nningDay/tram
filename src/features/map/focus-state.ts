export type SelectionOrigin = "none" | "map" | "panel" | "search" | "stop";

export type MapFocusState = {
  selectedVehicleId: string | null;
  selectedStopId: string | null;
  selectionOrigin: SelectionOrigin;
  promotedVehicleId: string | null;
  vehiclePromotionSessionActive: boolean;
};

export const INITIAL_MAP_FOCUS_STATE: MapFocusState = {
  selectedVehicleId: null,
  selectedStopId: null,
  selectionOrigin: "none",
  promotedVehicleId: null,
  vehiclePromotionSessionActive: false,
};

export function shouldAutoFocusVehicleSelection(origin: SelectionOrigin): boolean {
  return origin === "search" || origin === "panel";
}

export function selectVehicleFromMap(
  state: MapFocusState,
  vehicleId: string
): MapFocusState {
  if (state.selectedVehicleId === vehicleId) {
    return {
      ...INITIAL_MAP_FOCUS_STATE,
    };
  }

  return {
    selectedVehicleId: vehicleId,
    selectedStopId: null,
    selectionOrigin: "map",
    promotedVehicleId: state.vehiclePromotionSessionActive
      ? state.promotedVehicleId
      : vehicleId,
    vehiclePromotionSessionActive: true,
  };
}

export function clearVehicleFocusFromBlankMap(state: MapFocusState): MapFocusState {
  if (!state.selectedVehicleId) {
    return state;
  }

  return {
    selectedVehicleId: null,
    selectedStopId: state.selectedStopId,
    selectionOrigin: state.selectedStopId ? "stop" : "none",
    promotedVehicleId: null,
    vehiclePromotionSessionActive: false,
  };
}

export function selectVehicleFromPanel(
  state: MapFocusState,
  vehicleId: string
): MapFocusState {
  if (state.selectedVehicleId === vehicleId) {
    return {
      ...state,
      selectedVehicleId: null,
      selectionOrigin: state.selectedStopId ? "stop" : "none",
    };
  }

  return {
    ...state,
    selectedVehicleId: vehicleId,
    selectedStopId: null,
    selectionOrigin: "panel",
  };
}

export function selectVehicleFromSearch(
  state: MapFocusState,
  vehicleId: string
): MapFocusState {
  return {
    ...state,
    selectedVehicleId: vehicleId,
    selectedStopId: null,
    selectionOrigin: "search",
    promotedVehicleId: vehicleId,
    vehiclePromotionSessionActive: false,
  };
}

export function selectStop(state: MapFocusState, stopId: string): MapFocusState {
  if (state.selectedStopId === stopId) {
    return {
      ...INITIAL_MAP_FOCUS_STATE,
    };
  }

  return {
    selectedVehicleId: null,
    selectedStopId: stopId,
    selectionOrigin: "stop",
    promotedVehicleId: null,
    vehiclePromotionSessionActive: false,
  };
}

export function clearStopFocus(state: MapFocusState): MapFocusState {
  return {
    ...state,
    selectedStopId: null,
    selectionOrigin: state.selectedVehicleId ? state.selectionOrigin : "none",
    promotedVehicleId: state.selectedVehicleId ? state.promotedVehicleId : null,
    vehiclePromotionSessionActive: state.selectedVehicleId
      ? state.vehiclePromotionSessionActive
      : false,
  };
}
