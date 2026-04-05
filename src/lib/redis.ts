import Redis from "ioredis";
import type { VehicleFeedSnapshot } from "@/features/shuttle/api";
import { normalizeLiveVehicleFeed } from "@/lib/vehicles/status";

// ── Channels ────────────────────────────────────────────────────────────────
export const CHANNEL_VEHICLES = "vehicles:update";
const VEHICLE_SNAPSHOT_KEY = "vehicles:snapshot";
const REDIS_READY_TIMEOUT_MS = 1_500;
const REDIS_DISABLED_FOR_TESTS =
  process.env.NODE_ENV === "test" || process.env.VITEST === "true";

// ── Connection options ───────────────────────────────────────────────────────
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

function createRedisClient(name: string): Redis {
  const client = new Redis(REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      // Exponential backoff: 200ms, 400ms, 800ms … cap at 10s
      const delay = Math.min(200 * 2 ** times, 10_000);
      return delay;
    },
  });

  client.on("connect", () => {
    console.log(`[redis:${name}] connected`);
  });

  client.on("error", (err: Error) => {
    // Surface errors without crashing the process
    console.error(`[redis:${name}] error:`, err.message);
  });

  return client;
}

// ── Singleton clients ────────────────────────────────────────────────────────
// Publisher: used for PUBLISH (normal commands)
// Subscriber: dedicated connection required by ioredis when in subscribe mode

declare global {
  // eslint-disable-next-line no-var
  var __redisPublisher: Redis | undefined;
  // eslint-disable-next-line no-var
  var __redisSubscriber: Redis | undefined;
}

function getPublisher(): Redis {
  if (!global.__redisPublisher) {
    global.__redisPublisher = createRedisClient("pub");
    void global.__redisPublisher.connect().catch(() => {
      // Non-fatal: app works without Redis (polling fallback on client)
    });
  }
  return global.__redisPublisher;
}

function getSubscriber(): Redis {
  if (!global.__redisSubscriber) {
    global.__redisSubscriber = createRedisClient("sub");
    void global.__redisSubscriber.connect().catch(() => {
      // Non-fatal
    });
  }
  return global.__redisSubscriber;
}

export const redisPublisher = getPublisher();
export const redisSubscriber = getSubscriber();

// ── Helpers ──────────────────────────────────────────────────────────────────

export type VehicleUpdatePayload = {
  server_time: string;
  vehicles: VehicleFeedSnapshot["vehicles"];
  telemetryByVehicleId: VehicleFeedSnapshot["telemetryByVehicleId"];
};

function isRedisReady(client: Redis): boolean {
  return client.status === "ready";
}

async function ensureRedisReady(client: Redis): Promise<boolean> {
  if (REDIS_DISABLED_FOR_TESTS) {
    return false;
  }

  if (isRedisReady(client)) {
    return true;
  }

  if (client.status === "wait" || client.status === "end" || client.status === "close") {
    try {
      await client.connect();
    } catch {
      // Fall through and inspect final status below.
    }
  }

  if (isRedisReady(client)) {
    return true;
  }

  return await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve(isRedisReady(client));
    }, REDIS_READY_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeout);
      client.off("ready", onReady);
      client.off("error", onError);
      client.off("end", onEnd);
    };

    const onReady = () => {
      cleanup();
      resolve(true);
    };

    const onError = () => {
      cleanup();
      resolve(false);
    };

    const onEnd = () => {
      cleanup();
      resolve(false);
    };

    client.on("ready", onReady);
    client.on("error", onError);
    client.on("end", onEnd);
  });
}

export async function readRedisHash(
  key: string,
): Promise<Record<string, string> | null> {
  const isReady = await ensureRedisReady(redisPublisher);
  if (!isReady) {
    return null;
  }

  try {
    const values = await redisPublisher.hgetall(key);
    return Object.keys(values).length > 0 ? values : {};
  } catch {
    return null;
  }
}

export async function writeRedisHashValue(
  key: string,
  field: string,
  value: string,
): Promise<boolean> {
  const isReady = await ensureRedisReady(redisPublisher);
  if (!isReady) {
    return false;
  }

  try {
    await redisPublisher.hset(key, field, value);
    return true;
  } catch {
    return false;
  }
}

export async function deleteRedisHashValue(
  key: string,
  field: string,
): Promise<boolean> {
  const isReady = await ensureRedisReady(redisPublisher);
  if (!isReady) {
    return false;
  }

  try {
    await redisPublisher.hdel(key, field);
    return true;
  } catch {
    return false;
  }
}

export async function readVehicleSnapshot(): Promise<VehicleFeedSnapshot | null> {
  const isReady = await ensureRedisReady(redisPublisher);
  if (!isReady) {
    return null;
  }

  try {
    const raw = await redisPublisher.get(VEHICLE_SNAPSHOT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as VehicleFeedSnapshot;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.vehicles)) {
      return null;
    }

    return {
      server_time:
        typeof parsed.server_time === "string"
          ? parsed.server_time
          : new Date().toISOString(),
      vehicles: normalizeLiveVehicleFeed(parsed.vehicles),
      telemetryByVehicleId:
        parsed.telemetryByVehicleId && typeof parsed.telemetryByVehicleId === "object"
          ? parsed.telemetryByVehicleId
          : {},
    };
  } catch {
    return null;
  }
}

/**
 * Publish and persist a vehicle snapshot for all live clients.
 */
export async function publishVehicleUpdate(
  snapshot: VehicleFeedSnapshot,
): Promise<void> {
  const isReady = await ensureRedisReady(redisPublisher);
  if (!isReady) return;

  const normalizedVehicles = normalizeLiveVehicleFeed(snapshot.vehicles);
  const payload: VehicleUpdatePayload = {
    server_time: snapshot.server_time,
    vehicles: normalizedVehicles,
    telemetryByVehicleId: snapshot.telemetryByVehicleId,
  };

  await redisPublisher.set(VEHICLE_SNAPSHOT_KEY, JSON.stringify(payload));
  await redisPublisher.publish(CHANNEL_VEHICLES, JSON.stringify(payload));
}
