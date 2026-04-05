import type { Vehicle } from "@/features/shuttle/api";
import { mergeVehicleSourceStates } from "@/lib/vehicles/source-arbitration";
import { deriveVehicleStatus, normalizeLiveVehicleFeed } from "@/lib/vehicles/status";
import {
  buildVehicleSourceKey,
  deleteResolutionState,
  deleteSourceVehicleState,
  deleteSourceVehicleStateByKey,
  readAllResolutionStates,
  readAllSourceVehicleStates,
  readSourceVehicleState,
  upsertResolutionState,
  upsertSourceVehicleState,
  type SourceVehicleState,
  type VehicleSource,
} from "@/lib/vehicles/source-state";
import {
  buildLiveVehicleTelemetryState,
  getTelemetryRouteContext,
  resolveTelemetryDirection,
  type LiveVehicleTelemetryState,
  type RawVehicleFix,
} from "@/lib/vehicles/telemetry";

export type { VehicleSource } from "@/lib/vehicles/source-state";
export type IngestedVehicle = SourceVehicleState;

type UpsertVehicleInput = {
  id: string;
  label?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  direction?: Vehicle["direction"];
  source: VehicleSource;
  crowding?: Vehicle["crowding"];
  sessionId?: string;
  accuracyM?: number;
  observedAt?: string | Date;
  sourceRef?: string;
  hardwareVehicleId?: string;
  hardwareId?: string;
};

function resolveObservedAt(value?: string | Date): Date {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }

  if (typeof value === "string") {
    const resolved = new Date(value);
    if (Number.isFinite(resolved.getTime())) {
      return resolved;
    }
  }

  return new Date();
}

export async function upsertVehicle(data: UpsertVehicleInput): Promise<IngestedVehicle> {
  const existing = await readSourceVehicleState(data.id, data.source);
  const observedAt = resolveObservedAt(data.observedAt);
  const rawFix: RawVehicleFix = {
    latitude: data.latitude,
    longitude: data.longitude,
    heading: data.heading,
    speed: data.speed,
    receivedAt: observedAt,
  };
  const routeContext = await getTelemetryRouteContext();
  const direction =
    data.direction ??
    resolveTelemetryDirection({
      rawFix,
      routeContext,
      previousDirection: existing?.direction,
    });
  const lastUpdated = observedAt.toISOString();
  const telemetry = buildLiveVehicleTelemetryState(
    {
      id: data.id,
      label: data.label ?? existing?.label,
      direction,
      crowding: data.crowding ?? existing?.crowding,
      lastUpdated,
      rawFix,
      previousRawFix: existing?.rawFix,
      previousTelemetry: existing?.telemetry,
    },
    routeContext,
  );

  const vehicle: IngestedVehicle = {
    vehicleId: data.id,
    label: data.label ?? existing?.label,
    source: data.source,
    direction,
    crowding: data.crowding ?? existing?.crowding,
    sessionId: data.sessionId ?? existing?.sessionId,
    accuracyM: data.accuracyM,
    observedAt: lastUpdated,
    sourceRef: data.sourceRef,
    hardwareVehicleId: data.hardwareVehicleId,
    hardwareId: data.hardwareId,
    rawFix,
    previousRawFix: existing?.rawFix,
    telemetry,
    receivedAt: new Date(),
  };

  await upsertSourceVehicleState(vehicle);
  return vehicle;
}

export async function removeVehicleSource(
  vehicleId: string,
  source: VehicleSource,
  sessionId?: string,
): Promise<boolean> {
  return deleteSourceVehicleState(vehicleId, source, sessionId);
}

export async function removeVehicle(id: string, sessionId?: string): Promise<boolean> {
  return removeVehicleSource(id, "driver", sessionId);
}

async function buildMergedVehicleTelemetryStates(
  nowMs: number = Date.now(),
): Promise<LiveVehicleTelemetryState[]> {
  const [sourceStates, resolutionStates] = await Promise.all([
    readAllSourceVehicleStates(),
    readAllResolutionStates(),
  ]);
  const groupedStates = new Map<string, SourceVehicleState[]>();
  const hiddenStateKeys: string[] = [];

  for (const state of sourceStates) {
    const status = deriveVehicleStatus(state.telemetry.snapshot.last_updated, nowMs);

    if (status === "hidden") {
      hiddenStateKeys.push(buildVehicleSourceKey(state.vehicleId, state.source));
      continue;
    }

    const current = groupedStates.get(state.vehicleId);
    if (current) {
      current.push(state);
    } else {
      groupedStates.set(state.vehicleId, [state]);
    }
  }

  const resolutionByVehicleId = new Map(
    resolutionStates.map((state) => [state.vehicleId, state] as const),
  );
  const telemetryStates: LiveVehicleTelemetryState[] = [];
  const pendingMutations: Promise<unknown>[] = hiddenStateKeys.map((fieldKey) =>
    deleteSourceVehicleStateByKey(fieldKey),
  );

  for (const [vehicleId, states] of groupedStates.entries()) {
    const { telemetryState, resolutionState } = mergeVehicleSourceStates({
      vehicleId,
      states,
      previousResolution: resolutionByVehicleId.get(vehicleId),
      nowMs,
    });

    if (!telemetryState) {
      pendingMutations.push(deleteResolutionState(vehicleId));
      continue;
    }

    telemetryStates.push(telemetryState);

    if (resolutionState) {
      pendingMutations.push(upsertResolutionState(resolutionState));
    } else {
      pendingMutations.push(deleteResolutionState(vehicleId));
    }
  }

  for (const vehicleId of resolutionByVehicleId.keys()) {
    if (!groupedStates.has(vehicleId)) {
      pendingMutations.push(deleteResolutionState(vehicleId));
    }
  }

  if (pendingMutations.length > 0) {
    await Promise.allSettled(pendingMutations);
  }

  return telemetryStates.sort((left, right) =>
    left.snapshot.id.localeCompare(right.snapshot.id),
  );
}

export async function getAllVehicles(): Promise<Vehicle[]> {
  const telemetryStates = await buildMergedVehicleTelemetryStates();
  return telemetryStates.map((telemetry) => telemetry.snapshot);
}

export async function hasLiveVehicles(): Promise<boolean> {
  return (await getAllVehicles()).length > 0;
}

export async function getAllVehicleTelemetryStates(): Promise<LiveVehicleTelemetryState[]> {
  return buildMergedVehicleTelemetryStates();
}

export async function getCurrentLiveVehicleFeed(): Promise<Vehicle[]> {
  return normalizeLiveVehicleFeed(await getAllVehicles());
}
