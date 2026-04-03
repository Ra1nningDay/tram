import Redis from "ioredis";
import type { Vehicle } from "@/features/shuttle/api";

// ── Channels ────────────────────────────────────────────────────────────────
export const CHANNEL_VEHICLES = "vehicles:update";
const VEHICLE_SNAPSHOT_KEY = "vehicles:snapshot";
const REDIS_READY_TIMEOUT_MS = 1_500;

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
  vehicles: Vehicle[];
};

function isRedisReady(client: Redis): boolean {
  return client.status === "ready";
}

async function ensureRedisReady(client: Redis): Promise<boolean> {
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

export async function readVehicleSnapshot(): Promise<Vehicle[] | null> {
  const isReady = await ensureRedisReady(redisPublisher);
  if (!isReady) {
    return null;
  }

  try {
    const raw = await redisPublisher.get(VEHICLE_SNAPSHOT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Vehicle[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Publish and persist a vehicle snapshot for all live clients.
 */
export async function publishVehicleUpdate(
  vehicles: Vehicle[],
): Promise<void> {
  const isReady = await ensureRedisReady(redisPublisher);
  if (!isReady) return;

  const payload: VehicleUpdatePayload = {
    server_time: new Date().toISOString(),
    vehicles,
  };

  await redisPublisher.set(VEHICLE_SNAPSHOT_KEY, JSON.stringify(vehicles));
  await redisPublisher.publish(CHANNEL_VEHICLES, JSON.stringify(payload));
}
