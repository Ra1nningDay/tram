export type VehicleDataMode = "live" | "simulate";

export function shouldUseLiveVehicleFeed(mode: VehicleDataMode) {
  return mode === "live";
}
