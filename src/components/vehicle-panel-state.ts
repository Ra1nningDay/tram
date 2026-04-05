export type PanelHeightMode = "snap" | "free";

export const MOBILE_HEADER_HEIGHT = 126;
export const MOBILE_PANEL_MID_HEIGHT_VH = 52;
export const MOBILE_PANEL_MAX_HEIGHT_VH = 85;

export function clampMobilePanelFreeHeightPx(
  nextHeightPx: number,
  viewportHeightPx: number
): number {
  const maxHeightPx = viewportHeightPx * (MOBILE_PANEL_MAX_HEIGHT_VH / 100);
  return Math.min(Math.max(nextHeightPx, MOBILE_HEADER_HEIGHT), maxHeightPx);
}

export function getMobilePanelHeight({
  snapLevel,
  panelHeightMode,
  freePanelHeightPx,
  viewportHeightPx,
}: {
  snapLevel: 0 | 1 | 2;
  panelHeightMode: PanelHeightMode;
  freePanelHeightPx: number | null;
  viewportHeightPx?: number;
}): number | string {
  if (
    panelHeightMode === "free" &&
    typeof freePanelHeightPx === "number" &&
    typeof viewportHeightPx === "number"
  ) {
    return clampMobilePanelFreeHeightPx(freePanelHeightPx, viewportHeightPx);
  }

  if (snapLevel === 0) {
    return MOBILE_HEADER_HEIGHT;
  }

  return snapLevel === 1
    ? `${MOBILE_PANEL_MID_HEIGHT_VH}vh`
    : `${MOBILE_PANEL_MAX_HEIGHT_VH}vh`;
}

export function promoteVehiclePanelItems<T extends { vehicleId: string }>(
  items: T[],
  promotedVehicleId?: string | null
): T[] {
  if (!promotedVehicleId) {
    return items;
  }

  const selectedIndex = items.findIndex((item) => item.vehicleId === promotedVehicleId);
  if (selectedIndex <= 0) {
    return items;
  }

  const selectedItem = items[selectedIndex];
  return [
    selectedItem,
    ...items.slice(0, selectedIndex),
    ...items.slice(selectedIndex + 1),
  ];
}

export function getVehicleIdFromAutoExpandRequest(
  autoExpandVehicleRequest?: string | null
): string | null {
  if (!autoExpandVehicleRequest) {
    return null;
  }

  const [vehicleId] = autoExpandVehicleRequest.split(":");
  return vehicleId || null;
}
