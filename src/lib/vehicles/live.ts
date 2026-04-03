import type { Status, Vehicle, VehicleFeedSnapshot } from "@/features/shuttle/api";
import { readVehicleSnapshot } from "@/lib/redis";
import { buildVehicleEtaSnapshot } from "@/lib/vehicles/eta";
import { normalizeLiveVehicleFeed } from "@/lib/vehicles/status";
import {
  getAllVehicleTelemetryStates,
  getAllVehicles,
} from "@/lib/vehicles/store";

function buildFilteredTelemetryByVehicleId(
  vehicles: Vehicle[],
  telemetryByVehicleId: VehicleFeedSnapshot["telemetryByVehicleId"],
) {
  const activeVehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
  const filtered: VehicleFeedSnapshot["telemetryByVehicleId"] = {};

  for (const [vehicleId, telemetry] of Object.entries(telemetryByVehicleId)) {
    if (activeVehicleIds.has(vehicleId)) {
      filtered[vehicleId] = telemetry;
    }
  }

  return filtered;
}

export async function buildLiveVehicleFeedSnapshot(
  serverTime: Date = new Date(),
): Promise<VehicleFeedSnapshot> {
  const telemetryStates = getAllVehicleTelemetryStates();
  const vehicles = telemetryStates.map((telemetry) => telemetry.snapshot);
  const { telemetryByVehicleId } = await buildVehicleEtaSnapshot(telemetryStates, serverTime);

  return {
    server_time: serverTime.toISOString(),
    vehicles,
    telemetryByVehicleId,
  };
}

// ── Live Feed ────────────────────────────────────────────────────────────────

export async function getLiveVehicleFeedSnapshot(): Promise<VehicleFeedSnapshot> {
  const snapshot = await readVehicleSnapshot();
  if (snapshot) {
    return {
      ...snapshot,
      telemetryByVehicleId: buildFilteredTelemetryByVehicleId(
        snapshot.vehicles,
        snapshot.telemetryByVehicleId,
      ),
    };
  }

  return buildLiveVehicleFeedSnapshot();
}

export async function getLiveVehicleFeed(): Promise<Vehicle[]> {
  const snapshot = await getLiveVehicleFeedSnapshot();
  return snapshot.vehicles;
}

export function getCurrentLiveVehicleFeed(): Vehicle[] {
  return normalizeLiveVehicleFeed(getAllVehicles());
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
