import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { VehicleFeedSnapshot } from "../../src/features/shuttle/api";
import {
  getTelemetryRouteContext,
  resetTelemetryRouteContextCache,
} from "../../src/lib/vehicles/telemetry";
import {
  getAllVehicles,
  upsertVehicle,
} from "../../src/lib/vehicles/store";
import { resetVehicleSourceStateStores } from "../../src/lib/vehicles/source-state";

type VehicleHardwareMappingMockRecord = {
  id: string;
  vehicleId: string;
  displayLabel: string | null;
  hardwareVehicleId: string | null;
  hardwareId: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type LocalSubscriber = {
  connect: () => Promise<void>;
  subscribe: (channel: string) => Promise<void>;
  on: (event: string, handler: (channel: string, message: string) => void) => LocalSubscriber;
  unsubscribe: () => Promise<void>;
  quit: () => Promise<void>;
};

const prismaMocks = vi.hoisted(() => {
  const vehicleLocationCreate = vi.fn(async () => undefined);
  const shuttleRouteFindMany = vi.fn(async () => []);
  const stopFindMany = vi.fn(async () => []);
  const vehicleHardwareMappingFindMany = vi.fn<
    [],
    Promise<VehicleHardwareMappingMockRecord[]>
  >(async () => []);

  return {
    vehicleLocationCreate,
    shuttleRouteFindMany,
    stopFindMany,
    vehicleHardwareMappingFindMany,
    reset() {
      vehicleLocationCreate.mockClear();
      shuttleRouteFindMany.mockClear();
      stopFindMany.mockClear();
      vehicleHardwareMappingFindMany.mockClear();
      shuttleRouteFindMany.mockResolvedValue([]);
      stopFindMany.mockResolvedValue([]);
      vehicleHardwareMappingFindMany.mockResolvedValue([]);
    },
  };
});

const redisMocks = vi.hoisted(() => {
  let messageHandler: ((channel: string, message: string) => void) | null = null;

  const localSub = {} as LocalSubscriber;

  localSub.connect = vi.fn(async () => undefined);
  localSub.subscribe = vi.fn(async () => undefined);
  localSub.on = vi.fn((event: string, handler: (channel: string, message: string) => void) => {
      if (event === "message") {
        messageHandler = handler;
      }

      return localSub;
    });
  localSub.unsubscribe = vi.fn(async () => undefined);
  localSub.quit = vi.fn(async () => undefined);

  const publishVehicleUpdate = vi.fn<
    [VehicleFeedSnapshot],
    Promise<void>
  >(async () => undefined);
  const readVehicleSnapshot = vi.fn<[], Promise<VehicleFeedSnapshot | null>>(
    async () => null,
  );
  const readRedisHash = vi.fn(async () => null);
  const writeRedisHashValue = vi.fn(async () => false);
  const deleteRedisHashValue = vi.fn(async () => false);
  const duplicate = vi.fn(() => localSub);

  return {
    localSub,
    publishVehicleUpdate,
    readVehicleSnapshot,
    readRedisHash,
    writeRedisHashValue,
    deleteRedisHashValue,
    duplicate,
    emitMessage(payload: object | string) {
      const encoded =
        typeof payload === "string" ? payload : JSON.stringify(payload);
      messageHandler?.("vehicles:update", encoded);
    },
    reset() {
      messageHandler = null;
      publishVehicleUpdate.mockClear();
      publishVehicleUpdate.mockResolvedValue(undefined);
      readVehicleSnapshot.mockClear();
      readVehicleSnapshot.mockResolvedValue(null);
      readRedisHash.mockClear();
      readRedisHash.mockResolvedValue(null);
      writeRedisHashValue.mockClear();
      writeRedisHashValue.mockResolvedValue(false);
      deleteRedisHashValue.mockClear();
      deleteRedisHashValue.mockResolvedValue(false);
      duplicate.mockClear();
      localSub.connect.mockClear();
      localSub.subscribe.mockClear();
      localSub.on.mockClear();
      localSub.unsubscribe.mockClear();
      localSub.quit.mockClear();
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    vehicleLocation: {
      create: prismaMocks.vehicleLocationCreate,
    },
    shuttleRoute: {
      findMany: prismaMocks.shuttleRouteFindMany,
    },
    stop: {
      findMany: prismaMocks.stopFindMany,
    },
    vehicleHardwareMapping: {
      findMany: prismaMocks.vehicleHardwareMappingFindMany,
    },
  }),
}));

vi.mock("@/lib/auth", () => ({
  getAuth: () => ({
    api: {
      getSession: vi.fn(async () => null),
    },
  }),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

vi.mock("@/lib/redis", () => ({
  CHANNEL_VEHICLES: "vehicles:update",
  publishVehicleUpdate: redisMocks.publishVehicleUpdate,
  readVehicleSnapshot: redisMocks.readVehicleSnapshot,
  readRedisHash: redisMocks.readRedisHash,
  writeRedisHashValue: redisMocks.writeRedisHashValue,
  deleteRedisHashValue: redisMocks.deleteRedisHashValue,
  redisSubscriber: {
    duplicate: redisMocks.duplicate,
  },
}));

type GpsIngestRouteModule = typeof import("../../src/app/api/gps/ingest/route");
type HardwareSyncRouteModule = typeof import("../../src/app/api/gps/hardware/sync/route");
type VehiclesRouteModule = typeof import("../../src/app/api/vehicles/route");
type VehiclesStreamRouteModule = typeof import("../../src/app/api/vehicles/stream/route");
type StopEtasRouteModule = typeof import("../../src/app/api/stops/[id]/etas/route");

let gpsIngestRoute: GpsIngestRouteModule;
let hardwareSyncRoute: HardwareSyncRouteModule;
let vehiclesRoute: VehiclesRouteModule;
let vehiclesStreamRoute: VehiclesStreamRouteModule;
let stopEtasRoute: StopEtasRouteModule;

function createHardwareRequest(body: object) {
  return new Request("http://localhost/api/gps/ingest", {
    method: "POST",
    headers: {
      authorization: "Bearer test-gps-key",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function createHardwareSyncRequest(body: object) {
  return new Request("http://localhost/api/gps/hardware/sync", {
    method: "POST",
    headers: {
      "x-hardware-sync-secret": "test-hardware-sync-secret",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function buildOnRouteBody(overrides: Partial<Record<string, unknown>> = {}) {
  const routeContext = await getTelemetryRouteContext();
  const [longitude, latitude] = routeContext.outbound?.coordinates[0] ?? [100.837, 13.612];

  return {
    vehicle_id: "TRAM-API",
    label: "TRAM-API",
    latitude,
    longitude,
    heading: 90,
    speed: 3,
    direction: "outbound",
    crowding: "normal",
    ...overrides,
  };
}

async function readSseChunk(reader: ReadableStreamDefaultReader<Uint8Array>) {
  const chunk = await reader.read();
  expect(chunk.done).toBe(false);
  expect(chunk.value).toBeDefined();
  return new TextDecoder().decode(chunk.value);
}

function extractSsePayload(chunk: string) {
  const line = chunk
    .split("\n")
    .find((entry) => entry.startsWith("data: "));

  expect(line).toBeTruthy();
  return JSON.parse(line!.slice(6)) as VehicleFeedSnapshot;
}

describe("live vehicle API routes", () => {
  beforeAll(async () => {
    process.env.GPS_INGEST_API_KEY = "test-gps-key";
    process.env.HARDWARE_SYNC_SECRET = "test-hardware-sync-secret";
    gpsIngestRoute = await import("../../src/app/api/gps/ingest/route");
    hardwareSyncRoute = await import("../../src/app/api/gps/hardware/sync/route");
    vehiclesRoute = await import("../../src/app/api/vehicles/route");
    vehiclesStreamRoute = await import("../../src/app/api/vehicles/stream/route");
    stopEtasRoute = await import("../../src/app/api/stops/[id]/etas/route");
  });

  beforeEach(() => {
    resetVehicleSourceStateStores();
    resetTelemetryRouteContextCache();
    prismaMocks.reset();
    redisMocks.reset();
  });

  it("ingests GPS, publishes a live snapshot, and serves matching vehicle and ETA routes", async () => {
    const ingestResponse = await gpsIngestRoute.POST(
      createHardwareRequest(await buildOnRouteBody()) as never,
    );

    expect(ingestResponse.status).toBe(200);
    await expect(ingestResponse.json()).resolves.toEqual({
      ok: true,
      source: "hardware",
    });

    expect(prismaMocks.vehicleLocationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        vehicleId: "TRAM-API",
        label: "TRAM-API",
        source: "hardware",
      }),
    });
    expect(redisMocks.publishVehicleUpdate).toHaveBeenCalledTimes(1);

    const publishedSnapshot =
      redisMocks.publishVehicleUpdate.mock.calls[0]![0] as unknown as VehicleFeedSnapshot;

    expect(publishedSnapshot.vehicles).toHaveLength(1);
    expect(publishedSnapshot.vehicles[0]).toEqual(
      expect.objectContaining({
        id: "TRAM-API",
        routeDistanceM: expect.any(Number),
        matchedPosition: {
          lng: expect.any(Number),
          lat: expect.any(Number),
        },
        etaConfidence: expect.any(Number),
      }),
    );
    expect(publishedSnapshot.telemetryByVehicleId["TRAM-API"]).toEqual(
      expect.objectContaining({
        vehicleId: "TRAM-API",
      }),
    );
    await expect(getAllVehicles()).resolves.toEqual([
      expect.objectContaining({
        id: "TRAM-API",
      }),
    ]);

    const vehiclesResponse = await vehiclesRoute.GET();
    expect(vehiclesResponse.status).toBe(200);

    const vehiclesPayload = (await vehiclesResponse.json()) as VehicleFeedSnapshot;
    expect(vehiclesPayload.vehicles).toHaveLength(1);
    expect(vehiclesPayload.vehicles[0]?.id).toBe("TRAM-API");
    expect(vehiclesPayload.telemetryByVehicleId["TRAM-API"]?.vehicleId).toBe(
      "TRAM-API",
    );

    const stopId = (await getTelemetryRouteContext()).outbound?.stops[0]?.id;
    expect(stopId).toBeTruthy();

    const stopEtasResponse = await stopEtasRoute.GET(
      new Request(`http://localhost/api/stops/${stopId}/etas`) as never,
      { params: Promise.resolve({ id: stopId! }) },
    );

    expect(stopEtasResponse.status).toBe(200);

    const stopEtasPayload = (await stopEtasResponse.json()) as {
      stop_id: string;
      etas: Array<{ vehicle_id?: string }>;
    };

    expect(stopEtasPayload.stop_id).toBe(stopId);
    expect(
      stopEtasPayload.etas.some((eta) => eta.vehicle_id === "TRAM-API"),
    ).toBe(true);
  });

  it("merges driver and hardware source states into one live vehicle", async () => {
    const routeContext = await getTelemetryRouteContext();
    const [hardwareLongitude, hardwareLatitude] = routeContext.outbound?.coordinates[0] ?? [100.837, 13.612];
    const driverObservedAt = new Date();
    const hardwareObservedAt = new Date(driverObservedAt.getTime() + 2_000);

    prismaMocks.vehicleHardwareMappingFindMany.mockResolvedValue([
      {
        id: "mapping-1",
        vehicleId: "TRAM-MERGED",
        displayLabel: "TRAM-MERGED",
        hardwareVehicleId: "TRAM-02",
        hardwareId: "HWID-2",
        enabled: true,
        createdAt: new Date("2026-04-04T10:00:00.000Z"),
        updatedAt: new Date("2026-04-04T10:00:00.000Z"),
      },
    ]);

    await upsertVehicle({
      id: "TRAM-MERGED",
      label: "TRAM-MERGED",
      latitude: hardwareLatitude,
      longitude: hardwareLongitude,
      heading: 90,
      speed: 3,
      direction: "outbound",
      source: "driver",
      crowding: "full",
      sessionId: "session-merged",
      observedAt: driverObservedAt,
    });

    const hardwareResponse = await hardwareSyncRoute.POST(
      createHardwareSyncRequest({
        polledAt: hardwareObservedAt.toISOString(),
        payload: [
          {
            Tram_GEO_Info: {
              accuracy: 1.8,
              direction: "E",
              heading: 90,
              latitude: hardwareLatitude,
              longitude: hardwareLongitude,
              speed: 14.4,
            },
            Tram_Info: {
              hardware_id: "HWID-2",
              id: "TRAM-02",
              status: "Active",
            },
            application_update: hardwareObservedAt.toISOString(),
          },
        ],
      }) as never,
    );

    expect(hardwareResponse.status).toBe(200);
    await expect(hardwareResponse.json()).resolves.toEqual({
      ok: true,
      total: 1,
      active: 1,
      inactive: 0,
      unmapped: 0,
    });

    const publishedSnapshot =
      redisMocks.publishVehicleUpdate.mock.calls.at(-1)?.[0] as unknown as VehicleFeedSnapshot;

    expect(publishedSnapshot.vehicles).toEqual([
      expect.objectContaining({
        id: "TRAM-MERGED",
        telemetrySource: "hardware",
        crowding: "full",
        sourceConfidence: expect.any(Number),
      }),
    ]);
  });

  it("streams the initial snapshot, forwards redis updates, and cleans up the subscriber on cancel", async () => {
    const routeContext = await getTelemetryRouteContext();
    const [longitude, latitude] = routeContext.outbound?.coordinates[0] ?? [100.837, 13.612];

    await upsertVehicle({
      id: "TRAM-SSE",
      label: "TRAM-SSE",
      latitude,
      longitude,
      direction: "outbound",
      source: "driver",
      speed: 3,
      heading: 90,
    });

    const response = await vehiclesStreamRoute.GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const reader = response.body?.getReader();
    expect(reader).toBeTruthy();

    const initialChunk = await readSseChunk(reader!);
    const initialPayload = extractSsePayload(initialChunk);

    expect(initialPayload.vehicles.map((vehicle) => vehicle.id)).toContain("TRAM-SSE");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(redisMocks.localSub.connect).toHaveBeenCalledTimes(1);
    expect(redisMocks.localSub.subscribe).toHaveBeenCalledWith("vehicles:update");

    const updatedVehicle = {
      ...initialPayload.vehicles[0],
      latitude: initialPayload.vehicles[0].latitude + 0.0001,
      longitude: initialPayload.vehicles[0].longitude + 0.0001,
    };
    const updatePayload: VehicleFeedSnapshot = {
      server_time: "2026-04-04T12:00:02.000Z",
      vehicles: [updatedVehicle],
      telemetryByVehicleId: {
        "TRAM-SSE": initialPayload.telemetryByVehicleId["TRAM-SSE"],
      },
    };

    redisMocks.emitMessage(updatePayload);

    const updateChunk = await readSseChunk(reader!);
    const streamedUpdate = extractSsePayload(updateChunk);

    expect(streamedUpdate.server_time).toBe(updatePayload.server_time);
    expect(streamedUpdate.vehicles[0]?.latitude).toBe(updatedVehicle.latitude);
    expect(streamedUpdate.vehicles[0]?.longitude).toBe(updatedVehicle.longitude);

    await reader!.cancel();

    expect(redisMocks.localSub.unsubscribe).toHaveBeenCalledTimes(1);
    expect(redisMocks.localSub.quit).toHaveBeenCalledTimes(1);
  });
});
