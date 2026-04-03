import type { Vehicle } from "@/features/shuttle/api";
import {
  buildLiveVehicleTelemetryState,
  getTelemetryRouteContext,
  type LiveVehicleTelemetryState,
  type RawVehicleFix,
} from "@/lib/vehicles/telemetry";
import { deriveVehicleStatus } from "@/lib/vehicles/status";

// ── Types ────────────────────────────────────────────────────────────────────

export type VehicleSource = "hardware" | "driver";

export type IngestedVehicle = {
  id: string;
  label?: string;
  direction: Vehicle["direction"];
  source: VehicleSource;
  crowding?: Vehicle["crowding"];
  sessionId?: string;
  rawFix: RawVehicleFix;
  previousRawFix?: RawVehicleFix;
  telemetry: LiveVehicleTelemetryState;
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
export async function upsertVehicle(data: {
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
}): Promise<IngestedVehicle> {
  const store = getStore();
  const now = new Date();
  const existing = store.get(data.id);
  const rawFix: RawVehicleFix = {
    latitude: data.latitude,
    longitude: data.longitude,
    heading: data.heading,
    speed: data.speed,
    receivedAt: now,
  };

  const telemetry = buildLiveVehicleTelemetryState(
    {
      id: data.id,
      label: data.label,
      direction: data.direction,
      crowding: data.crowding,
      lastUpdated: now.toISOString(),
      rawFix,
      previousRawFix: existing?.rawFix,
      previousTelemetry: existing?.telemetry,
    },
    await getTelemetryRouteContext(),
  );

  const vehicle: IngestedVehicle = {
    id: data.id,
    label: data.label,
    direction: data.direction,
    source: data.source,
    crowding: data.crowding,
    sessionId: data.sessionId,
    rawFix,
    previousRawFix: existing?.rawFix,
    telemetry,
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
    const status = deriveVehicleStatus(v.telemetry.snapshot.last_updated, nowMs);

    if (status === "hidden") {
      hiddenVehicleIds.push(v.id);
      continue;
    }

    vehicles.push({
      ...v.telemetry.snapshot,
      status,
    });
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

export function getAllVehicleTelemetryStates(): LiveVehicleTelemetryState[] {
  const store = getStore();
  const nowMs = Date.now();
  const hiddenVehicleIds: string[] = [];
  const telemetryStates: LiveVehicleTelemetryState[] = [];

  for (const vehicle of store.values()) {
    const status = deriveVehicleStatus(vehicle.telemetry.snapshot.last_updated, nowMs);

    if (status === "hidden") {
      hiddenVehicleIds.push(vehicle.id);
      continue;
    }

    telemetryStates.push({
      ...vehicle.telemetry,
      snapshot: {
        ...vehicle.telemetry.snapshot,
        status,
      },
    });
  }

  for (const vehicleId of hiddenVehicleIds) {
    store.delete(vehicleId);
  }

  return telemetryStates;
}
