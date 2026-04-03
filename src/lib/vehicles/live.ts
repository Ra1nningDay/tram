import type { Status, Vehicle } from "@/features/shuttle/api";
import { readVehicleSnapshot } from "@/lib/redis";
import { normalizeLiveVehicleFeed } from "@/lib/vehicles/status";
import { getAllVehicles } from "@/lib/vehicles/store";

// ── Live Feed ────────────────────────────────────────────────────────────────

export async function getLiveVehicleFeed(): Promise<Vehicle[]> {
  const snapshot = await readVehicleSnapshot();
  return snapshot ?? normalizeLiveVehicleFeed(getAllVehicles());
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function isVehicleActive(status: Status) {
  return status === "fresh" || status === "delayed";
}

export function getActiveDriverCount(vehicles: Vehicle[]) {
  return vehicles.filter((vehicle) => isVehicleActive(vehicle.status)).length;
}

export function getLatestVehicleUpdateAt(vehicles: Pick<Vehicle, "last_updated">[]) {
  return vehicles.reduce<Date | null>((latest, vehicle) => {
    const updatedAt = new Date(vehicle.last_updated);
    if (!Number.isFinite(updatedAt.getTime())) return latest;
    if (!latest || updatedAt > latest) return updatedAt;
    return latest;
  }, null);
}
