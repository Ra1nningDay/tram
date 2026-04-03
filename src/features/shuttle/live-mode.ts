export type VehicleDataMode = "live" | "simulate";

export function shouldUseLiveVehicleFeed(
  mode: VehicleDataMode,
  liveVehicleCount: number,
  hasSeenLiveSnapshot: boolean,
) {
  if (mode !== "live") {
    return false;
  }

  return hasSeenLiveSnapshot || liveVehicleCount > 0;
}
