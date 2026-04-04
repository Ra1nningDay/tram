import type { Status, Vehicle, VehicleFeedSnapshot } from "@/features/shuttle/api";
import { readVehicleSnapshot } from "@/lib/redis";
import {
  BALANCED_BACKGROUND_INTERVAL_MS,
  BALANCED_IDLE_INTERVAL_MS,
  BALANCED_MOVING_INTERVAL_MS,
  BALANCED_MOVING_SPEED_THRESHOLD_KPH,
} from "@/lib/vehicles/balanced-profile";
import { buildVehicleEtaSnapshot } from "@/lib/vehicles/eta";
import { getVehicleAgeMs, normalizeLiveVehicleFeed } from "@/lib/vehicles/status";
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

export type LiveFeedDiagnostics = {
  vehicleCount: number;
  cadenceBuckets: Record<number, number>;
  backgroundCadenceMs: number;
  statusCounts: Record<Status, number>;
  maxStaleAgeMs: number;
  averageEtaConfidence: number | null;
  lowConfidenceVehicleCount: number;
};

export function buildLiveFeedDiagnostics(
  snapshot: VehicleFeedSnapshot,
  nowMs: number = Date.now(),
): LiveFeedDiagnostics {
  const diagnostics: LiveFeedDiagnostics = {
    vehicleCount: snapshot.vehicles.length,
    cadenceBuckets: {
      [BALANCED_MOVING_INTERVAL_MS]: 0,
      [BALANCED_IDLE_INTERVAL_MS]: 0,
    },
    backgroundCadenceMs: BALANCED_BACKGROUND_INTERVAL_MS,
    statusCounts: {
      fresh: 0,
      delayed: 0,
      offline: 0,
      hidden: 0,
    },
    maxStaleAgeMs: 0,
    averageEtaConfidence: null,
    lowConfidenceVehicleCount: 0,
  };

  let etaConfidenceTotal = 0;
  let etaConfidenceCount = 0;

  for (const vehicle of snapshot.vehicles) {
    diagnostics.statusCounts[vehicle.status] += 1;
    diagnostics.maxStaleAgeMs = Math.max(
      diagnostics.maxStaleAgeMs,
      getVehicleAgeMs(vehicle.last_updated, nowMs),
    );

    const cadenceBucketMs =
      (vehicle.speedKph ?? 0) >= BALANCED_MOVING_SPEED_THRESHOLD_KPH
        ? BALANCED_MOVING_INTERVAL_MS
        : BALANCED_IDLE_INTERVAL_MS;
    diagnostics.cadenceBuckets[cadenceBucketMs] += 1;

    if (typeof vehicle.etaConfidence === "number") {
      etaConfidenceTotal += vehicle.etaConfidence;
      etaConfidenceCount += 1;

      if (vehicle.etaConfidence <= 0.35) {
        diagnostics.lowConfidenceVehicleCount += 1;
      }
    }
  }

  if (etaConfidenceCount > 0) {
    diagnostics.averageEtaConfidence = Number(
      (etaConfidenceTotal / etaConfidenceCount).toFixed(2),
    );
  }

  return diagnostics;
}

export async function buildLiveVehicleFeedSnapshot(
  serverTime: Date = new Date(),
): Promise<VehicleFeedSnapshot> {
  const telemetryStates = getAllVehicleTelemetryStates();
  const vehicles = telemetryStates.map((telemetry) => telemetry.snapshot);
  const { telemetryByVehicleId } = await buildVehicleEtaSnapshot(telemetryStates, serverTime);
  const snapshot = {
    server_time: serverTime.toISOString(),
    vehicles,
    telemetryByVehicleId,
  };

  if (process.env.LIVE_TRACKING_DEBUG_METRICS === "1") {
    console.info(
      "[live-tracking] feed diagnostics",
      buildLiveFeedDiagnostics(snapshot, serverTime.getTime()),
    );
  }

  return snapshot;
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
