import type { Vehicle } from "@/features/shuttle/api";
import {
  deleteRedisHashValue,
  readRedisHash,
  writeRedisHashValue,
} from "@/lib/redis";
import type { LiveVehicleTelemetryState, RawVehicleFix } from "@/lib/vehicles/telemetry";

export type VehicleSource = "hardware" | "driver";

export type SourceVehicleState = {
  vehicleId: string;
  label?: string;
  source: VehicleSource;
  direction: Vehicle["direction"];
  crowding?: Vehicle["crowding"];
  sessionId?: string;
  accuracyM?: number;
  observedAt: string;
  sourceRef?: string;
  hardwareVehicleId?: string;
  hardwareId?: string;
  rawFix: RawVehicleFix;
  previousRawFix?: RawVehicleFix;
  telemetry: LiveVehicleTelemetryState;
  receivedAt: Date;
};

export type VehicleSourceResolutionState = {
  vehicleId: string;
  winnerSource: VehicleSource;
  challengerSource?: VehicleSource;
  challengerStreak: number;
  winnerScore: number;
  lastResolvedAt: string;
};

export type PendingHardwarePreview = {
  sourceKey: string;
  hardwareVehicleId?: string;
  hardwareId?: string;
  label?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speedMps?: number;
  accuracyM?: number;
  observedAt: string;
  lastPolledAt: string;
};

const VEHICLE_SOURCE_STATE_HASH_KEY = "vehicles:source-state:v1";
const VEHICLE_SOURCE_RESOLUTION_HASH_KEY = "vehicles:source-resolution:v1";
const VEHICLE_PENDING_HARDWARE_HASH_KEY = "vehicles:pending-hardware:v1";

declare global {
  // eslint-disable-next-line no-var
  var __vehicleSourceStore: Map<string, SourceVehicleState> | undefined;
  // eslint-disable-next-line no-var
  var __vehicleSourceResolutionStore:
    | Map<string, VehicleSourceResolutionState>
    | undefined;
  // eslint-disable-next-line no-var
  var __vehiclePendingHardwareStore: Map<string, PendingHardwarePreview> | undefined;
}

function getSourceStore() {
  if (!global.__vehicleSourceStore) {
    global.__vehicleSourceStore = new Map();
  }

  return global.__vehicleSourceStore;
}

function getResolutionStore() {
  if (!global.__vehicleSourceResolutionStore) {
    global.__vehicleSourceResolutionStore = new Map();
  }

  return global.__vehicleSourceResolutionStore;
}

function getPendingHardwareStore() {
  if (!global.__vehiclePendingHardwareStore) {
    global.__vehiclePendingHardwareStore = new Map();
  }

  return global.__vehiclePendingHardwareStore;
}

function serializeRawFix(rawFix: RawVehicleFix | undefined) {
  if (!rawFix) {
    return undefined;
  }

  return {
    ...rawFix,
    receivedAt: rawFix.receivedAt.toISOString(),
  };
}

function deserializeRawFix(
  rawFix: (Omit<RawVehicleFix, "receivedAt"> & { receivedAt: string }) | undefined,
): RawVehicleFix | undefined {
  if (!rawFix) {
    return undefined;
  }

  return {
    ...rawFix,
    receivedAt: new Date(rawFix.receivedAt),
  };
}

function serializeSourceVehicleState(state: SourceVehicleState) {
  return JSON.stringify({
    ...state,
    rawFix: serializeRawFix(state.rawFix),
    previousRawFix: serializeRawFix(state.previousRawFix),
    telemetry: {
      ...state.telemetry,
      rawFix: serializeRawFix(state.telemetry.rawFix),
    },
    receivedAt: state.receivedAt.toISOString(),
  });
}

function deserializeSourceVehicleState(raw: string): SourceVehicleState | null {
  try {
    const parsed = JSON.parse(raw) as Omit<
      SourceVehicleState,
      "rawFix" | "previousRawFix" | "receivedAt" | "telemetry"
    > & {
      rawFix: Omit<RawVehicleFix, "receivedAt"> & { receivedAt: string };
      previousRawFix?: Omit<RawVehicleFix, "receivedAt"> & { receivedAt: string };
      telemetry: Omit<LiveVehicleTelemetryState, "rawFix"> & {
        rawFix: Omit<RawVehicleFix, "receivedAt"> & { receivedAt: string };
      };
      receivedAt: string;
    };

    return {
      ...parsed,
      rawFix: deserializeRawFix(parsed.rawFix)!,
      previousRawFix: deserializeRawFix(parsed.previousRawFix),
      telemetry: {
        ...parsed.telemetry,
        rawFix: deserializeRawFix(parsed.telemetry.rawFix)!,
      },
      receivedAt: new Date(parsed.receivedAt),
    };
  } catch {
    return null;
  }
}

function serializeResolutionState(state: VehicleSourceResolutionState) {
  return JSON.stringify(state);
}

function deserializeResolutionState(raw: string): VehicleSourceResolutionState | null {
  try {
    return JSON.parse(raw) as VehicleSourceResolutionState;
  } catch {
    return null;
  }
}

function serializePendingHardwarePreview(preview: PendingHardwarePreview) {
  return JSON.stringify(preview);
}

function deserializePendingHardwarePreview(raw: string): PendingHardwarePreview | null {
  try {
    return JSON.parse(raw) as PendingHardwarePreview;
  } catch {
    return null;
  }
}

export function buildVehicleSourceKey(
  vehicleId: string,
  source: VehicleSource,
): string {
  return `${vehicleId}:${source}`;
}

export function buildPendingHardwareKey(params: {
  hardwareVehicleId?: string;
  hardwareId?: string;
}): string {
  return params.hardwareId ?? params.hardwareVehicleId ?? "unknown";
}

export async function upsertSourceVehicleState(state: SourceVehicleState) {
  const fieldKey = buildVehicleSourceKey(state.vehicleId, state.source);
  getSourceStore().set(fieldKey, state);
  await writeRedisHashValue(
    VEHICLE_SOURCE_STATE_HASH_KEY,
    fieldKey,
    serializeSourceVehicleState(state),
  );
}

export async function readSourceVehicleState(
  vehicleId: string,
  source: VehicleSource,
): Promise<SourceVehicleState | null> {
  const fieldKey = buildVehicleSourceKey(vehicleId, source);
  const redisValues = await readRedisHash(VEHICLE_SOURCE_STATE_HASH_KEY);
  const redisValue = redisValues?.[fieldKey];

  if (typeof redisValue === "string") {
    return deserializeSourceVehicleState(redisValue);
  }

  return getSourceStore().get(fieldKey) ?? null;
}

export async function deleteSourceVehicleState(
  vehicleId: string,
  source: VehicleSource,
  sessionId?: string,
): Promise<boolean> {
  const fieldKey = buildVehicleSourceKey(vehicleId, source);
  const localStore = getSourceStore();
  const current = localStore.get(fieldKey) ?? (await readSourceVehicleState(vehicleId, source));

  if (sessionId && current?.sessionId && current.sessionId !== sessionId) {
    return false;
  }

  const deleted = localStore.delete(fieldKey);
  await deleteRedisHashValue(VEHICLE_SOURCE_STATE_HASH_KEY, fieldKey);
  return deleted || current !== undefined;
}

export async function deleteSourceVehicleStateByKey(fieldKey: string) {
  getSourceStore().delete(fieldKey);
  await deleteRedisHashValue(VEHICLE_SOURCE_STATE_HASH_KEY, fieldKey);
}

export async function readAllSourceVehicleStates(): Promise<SourceVehicleState[]> {
  const redisValues = await readRedisHash(VEHICLE_SOURCE_STATE_HASH_KEY);
  if (redisValues && Object.keys(redisValues).length > 0) {
    return Object.values(redisValues)
      .map((raw) => deserializeSourceVehicleState(raw))
      .filter((state): state is SourceVehicleState => state !== null);
  }

  return [...getSourceStore().values()];
}

export async function readAllResolutionStates(): Promise<VehicleSourceResolutionState[]> {
  const redisValues = await readRedisHash(VEHICLE_SOURCE_RESOLUTION_HASH_KEY);
  if (redisValues && Object.keys(redisValues).length > 0) {
    return Object.values(redisValues)
      .map((raw) => deserializeResolutionState(raw))
      .filter((state): state is VehicleSourceResolutionState => state !== null);
  }

  return [...getResolutionStore().values()];
}

export async function readResolutionState(
  vehicleId: string,
): Promise<VehicleSourceResolutionState | null> {
  const redisValues = await readRedisHash(VEHICLE_SOURCE_RESOLUTION_HASH_KEY);
  const redisValue = redisValues?.[vehicleId];

  if (typeof redisValue === "string") {
    return deserializeResolutionState(redisValue);
  }

  return getResolutionStore().get(vehicleId) ?? null;
}

export async function upsertResolutionState(
  state: VehicleSourceResolutionState,
) {
  getResolutionStore().set(state.vehicleId, state);
  await writeRedisHashValue(
    VEHICLE_SOURCE_RESOLUTION_HASH_KEY,
    state.vehicleId,
    serializeResolutionState(state),
  );
}

export async function deleteResolutionState(vehicleId: string) {
  getResolutionStore().delete(vehicleId);
  await deleteRedisHashValue(VEHICLE_SOURCE_RESOLUTION_HASH_KEY, vehicleId);
}

export async function upsertPendingHardwarePreview(
  preview: PendingHardwarePreview,
) {
  getPendingHardwareStore().set(preview.sourceKey, preview);
  await writeRedisHashValue(
    VEHICLE_PENDING_HARDWARE_HASH_KEY,
    preview.sourceKey,
    serializePendingHardwarePreview(preview),
  );
}

export async function deletePendingHardwarePreview(sourceKey: string) {
  getPendingHardwareStore().delete(sourceKey);
  await deleteRedisHashValue(VEHICLE_PENDING_HARDWARE_HASH_KEY, sourceKey);
}

export async function readPendingHardwarePreviews(): Promise<PendingHardwarePreview[]> {
  const redisValues = await readRedisHash(VEHICLE_PENDING_HARDWARE_HASH_KEY);
  if (redisValues && Object.keys(redisValues).length > 0) {
    return Object.values(redisValues)
      .map((raw) => deserializePendingHardwarePreview(raw))
      .filter((preview): preview is PendingHardwarePreview => preview !== null);
  }

  return [...getPendingHardwareStore().values()];
}

export function resetVehicleSourceStateStores() {
  getSourceStore().clear();
  getResolutionStore().clear();
  getPendingHardwareStore().clear();
}
