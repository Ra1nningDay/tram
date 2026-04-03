import type { Vehicle } from "@/features/shuttle/api";

// ── Types ────────────────────────────────────────────────────────────────────

export type VehicleSource = "hardware" | "driver";

export type IngestedVehicle = Vehicle & {
  speed?: number;
  source: VehicleSource;
  receivedAt: Date;
};

// ── In-Memory Store ──────────────────────────────────────────────────────────
// Holds the latest known position for each vehicle.
// Shared across requests within a single Node.js process.

declare global {
  // eslint-disable-next-line no-var
  var __vehicleStore: Map<string, IngestedVehicle> | undefined;
}

function getStore(): Map<string, IngestedVehicle> {
  if (!global.__vehicleStore) {
    global.__vehicleStore = new Map();
  }
  return global.__vehicleStore;
}

// ── Public API ───────────────────────────────────────────────────────────────

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes → mark offline

/**
 * Upsert the latest position for a vehicle.
 * Returns the updated vehicle record.
 */
export function upsertVehicle(data: {
  id: string;
  label?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  direction: "outbound" | "inbound";
  source: VehicleSource;
}): IngestedVehicle {
  const store = getStore();
  const now = new Date();

  const vehicle: IngestedVehicle = {
    id: data.id,
    label: data.label,
    latitude: data.latitude,
    longitude: data.longitude,
    heading: data.heading,
    speed: data.speed,
    direction: data.direction,
    source: data.source,
    last_updated: now.toISOString(),
    status: "fresh",
    receivedAt: now,
  };

  store.set(data.id, vehicle);
  return vehicle;
}

/**
 * Remove a vehicle from the live in-memory store immediately.
 * Returns true when the vehicle existed.
 */
export function removeVehicle(id: string): boolean {
  return getStore().delete(id);
}

/**
 * Return all vehicles, applying staleness logic.
 */
export function getAllVehicles(): Vehicle[] {
  const store = getStore();
  const now = Date.now();

  return Array.from(store.values()).map((v) => {
    const ageMs = now - v.receivedAt.getTime();
    const status =
      ageMs > STALE_THRESHOLD_MS
        ? "offline"
        : ageMs > 60_000 // > 1 min → delayed
          ? "delayed"
          : "fresh";

    return {
      id: v.id,
      label: v.label,
      latitude: v.latitude,
      longitude: v.longitude,
      heading: v.heading,
      direction: v.direction,
      last_updated: v.last_updated,
      status,
    } satisfies Vehicle;
  });
}

/** True when at least one vehicle has been ingested (not mock). */
export function hasLiveVehicles(): boolean {
  return getStore().size > 0;
}
