import Redis from "ioredis";
import type { Vehicle } from "@/features/shuttle/api";

// ── Channels ────────────────────────────────────────────────────────────────
export const CHANNEL_VEHICLES = "vehicles:update";

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

/**
 * Publish a vehicle snapshot to all SSE subscribers.
 * Silently no-ops when Redis is not connected.
 */
export async function publishVehicleUpdate(
  vehicles: Vehicle[],
): Promise<void> {
  if (redisPublisher.status !== "ready") return;

  const payload: VehicleUpdatePayload = {
    server_time: new Date().toISOString(),
    vehicles,
  };

  await redisPublisher.publish(CHANNEL_VEHICLES, JSON.stringify(payload));
}
