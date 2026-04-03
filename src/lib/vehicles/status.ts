import type { Status, Vehicle } from "@/features/shuttle/api";
import { STATUS_THRESHOLDS } from "@/lib/thresholds";

export function getVehicleAgeMs(lastUpdatedIso: string, nowMs: number = Date.now()): number {
  const lastUpdatedMs = new Date(lastUpdatedIso).getTime();

  if (!Number.isFinite(lastUpdatedMs)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, nowMs - lastUpdatedMs);
}

export function deriveVehicleStatus(lastUpdatedIso: string, nowMs: number = Date.now()): Status {
  const ageMs = getVehicleAgeMs(lastUpdatedIso, nowMs);
  const ageSeconds = ageMs / 1000;

  if (ageSeconds < STATUS_THRESHOLDS.delayedSeconds) {
    return "fresh";
  }

  if (ageSeconds < STATUS_THRESHOLDS.offlineSeconds) {
    return "delayed";
  }

  if (ageSeconds < STATUS_THRESHOLDS.hiddenSeconds) {
    return "offline";
  }

  return "hidden";
}

export function normalizeLiveVehicle(vehicle: Vehicle, nowMs: number = Date.now()): Vehicle {
  return {
    ...vehicle,
    status: deriveVehicleStatus(vehicle.last_updated, nowMs),
  };
}

export function normalizeLiveVehicleFeed(
  vehicles: Vehicle[],
  nowMs: number = Date.now(),
): Vehicle[] {
  return vehicles
    .map((vehicle) => normalizeLiveVehicle(vehicle, nowMs))
    .filter((vehicle) => vehicle.status !== "hidden");
}
