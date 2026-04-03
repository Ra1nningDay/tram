import type { Vehicle } from "@/features/shuttle/api";
import { deriveVehicleStatus } from "@/lib/vehicles/status";

// ── Types ────────────────────────────────────────────────────────────────────

export type VehicleSource = "hardware" | "driver";

export type IngestedVehicle = Vehicle & {
  speed?: number;
  source: VehicleSource;
  sessionId?: string;
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
  crowding?: Vehicle["crowding"];
  sessionId?: string;
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
    sessionId: data.sessionId,
    last_updated: now.toISOString(),
    status: "fresh",
    crowding: data.crowding,
    receivedAt: now,
  };

  store.set(data.id, vehicle);
  return vehicle;
}

/**
 * Remove a vehicle from the live in-memory store immediately.
 * Returns true when the vehicle existed.
 */
export function removeVehicle(id: string, sessionId?: string): boolean {
  const store = getStore();
  const current = store.get(id);

  if (!current) {
    return false;
  }

  if (sessionId && current.sessionId && current.sessionId !== sessionId) {
    return false;
  }

  return store.delete(id);
}

/**
 * Return all vehicles, applying staleness logic.
 */
export function getAllVehicles(): Vehicle[] {
  const store = getStore();
  const nowMs = Date.now();
  const hiddenVehicleIds: string[] = [];
  const vehicles: Vehicle[] = [];

  for (const v of store.values()) {
    const status = deriveVehicleStatus(v.last_updated, nowMs);

    if (status === "hidden") {
      hiddenVehicleIds.push(v.id);
      continue;
    }

    vehicles.push({
      id: v.id,
      label: v.label,
      latitude: v.latitude,
      longitude: v.longitude,
      heading: v.heading,
      direction: v.direction,
      last_updated: v.last_updated,
      status,
      crowding: v.crowding,
    } satisfies Vehicle);
  }

  for (const vehicleId of hiddenVehicleIds) {
    store.delete(vehicleId);
  }

  return vehicles;
}

/** True when at least one vehicle has been ingested (not mock). */
export function hasLiveVehicles(): boolean {
  return getStore().size > 0;
}
