import shuttleData from "@/data/shuttle-data.json";
import type { Status, Vehicle } from "@/features/shuttle/api";
import { STATUS_THRESHOLDS } from "@/lib/thresholds";
import { getAllVehicles, hasLiveVehicles } from "@/lib/vehicles/store";

// ── Mock Fallback (dev only) ─────────────────────────────────────────────────

const SAMPLE_AGE_MS = [0, 45_000, 180_000] as const;

function getSampleAgeMs(index: number) {
  if (index < SAMPLE_AGE_MS.length) {
    return SAMPLE_AGE_MS[index];
  }
  return SAMPLE_AGE_MS[SAMPLE_AGE_MS.length - 1] + (index - SAMPLE_AGE_MS.length + 1) * 30_000;
}

function getVehicleStatus(ageMs: number): Status {
  const ageSeconds = ageMs / 1000;
  if (ageSeconds <= STATUS_THRESHOLDS.freshSeconds) return "fresh";
  if (ageSeconds <= STATUS_THRESHOLDS.delayedSeconds) return "delayed";
  return "offline";
}

function getMockVehicleFeed(now = Date.now()): Vehicle[] {
  return shuttleData.vehicles.map((vehicle, index) => {
    const ageMs = getSampleAgeMs(index);
    return {
      ...vehicle,
      direction: vehicle.direction as "outbound" | "inbound",
      last_updated: new Date(now - ageMs).toISOString(),
      status: getVehicleStatus(ageMs),
    };
  });
}

// ── Live Feed ────────────────────────────────────────────────────────────────

/**
 * Returns the current vehicle snapshot.
 * - When GPS data has been ingested → returns live store data.
 * - When store is empty (dev/cold start) → falls back to mock data.
 */
export function getLiveVehicleFeed(now = Date.now()): Vehicle[] {
  if (hasLiveVehicles()) {
    return getAllVehicles();
  }
  return getMockVehicleFeed(now);
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
