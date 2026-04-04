import { NextResponse } from "next/server";
import { CHANNEL_VEHICLES, redisSubscriber } from "@/lib/redis";
import { getLiveVehicleFeedSnapshot } from "@/lib/vehicles/live";
import type Redis from "ioredis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SSE heartbeat interval — keeps proxy / load-balancer connections alive
const HEARTBEAT_INTERVAL_MS = 25_000;

export async function GET() {
  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let localSub: Redis | null = null;

  function closeStream() {
    if (closed) {
      return;
    }

    closed = true;

    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }

    if (localSub) {
      localSub.unsubscribe().catch(() => null);
      localSub.quit().catch(() => null);
      localSub = null;
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      // ── Helpers ──────────────────────────────────────────────────────────
      function send(data: string) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          closeStream();
        }
      }

      function sendEvent(payload: object) {
        send(`data: ${JSON.stringify(payload)}\n\n`);
      }

      function sendHeartbeat() {
        send(": ping\n\n");
      }

      // ── 1. Send current snapshot immediately on connect ───────────────
      const initial = await getLiveVehicleFeedSnapshot();
      sendEvent(initial);

      // ── 2. Subscribe to Redis channel ─────────────────────────────────
      // ioredis requires a *dedicated* connection for subscribe mode.
      // We create a per-request duplicate so that the global subscriber
      // connection's channels are never polluted.
      try {
        localSub = redisSubscriber.duplicate();
        // Since lazyConnect: true is enabled in our configuration,
        // we MUST explicitly connect before calling subscribe when enableOfflineQueue: false.
        await localSub.connect();
        await localSub.subscribe(CHANNEL_VEHICLES);

        localSub.on("message", (_channel: string, message: string) => {
          if (closed) {
            closeStream();
            return;
          }
          try {
            const payload = JSON.parse(message) as object;
            sendEvent(payload);
          } catch {
            // malformed message — skip
          }
        });
      } catch (err) {
        // Redis unavailable — client will receive only the initial snapshot
        // and fall back to polling via the useVehicles() hook.
        console.warn("[sse] redis subscribe failed, no live updates:", err);
      }

      // ── 3. Heartbeat to prevent idle timeout ─────────────────────────
      heartbeat = setInterval(() => {
        if (closed) {
          closeStream();
          return;
        }
        sendHeartbeat();
      }, HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      closeStream();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering
    },
  });
}
