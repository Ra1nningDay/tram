import { NextResponse } from "next/server";
import { CHANNEL_VEHICLES, redisSubscriber } from "@/lib/redis";
import { getLiveVehicleFeed } from "@/lib/vehicles/live";
import type Redis from "ioredis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SSE heartbeat interval — keeps proxy / load-balancer connections alive
const HEARTBEAT_INTERVAL_MS = 25_000;

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // ── Helpers ──────────────────────────────────────────────────────────
      let closed = false;

      function send(data: string) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          closed = true;
        }
      }

      function sendEvent(payload: object) {
        send(`data: ${JSON.stringify(payload)}\n\n`);
      }

      function sendHeartbeat() {
        send(": ping\n\n");
      }

      // ── 1. Send current snapshot immediately on connect ───────────────
      const initial = await getLiveVehicleFeed();
      sendEvent({ server_time: new Date().toISOString(), vehicles: initial });

      // ── 2. Subscribe to Redis channel ─────────────────────────────────
      // ioredis requires a *dedicated* connection for subscribe mode.
      // We create a per-request duplicate so that the global subscriber
      // connection's channels are never polluted.
      let localSub: Redis | null = null;

      try {
        localSub = redisSubscriber.duplicate();
        // Since lazyConnect: true is enabled in our configuration,
        // we MUST explicitly connect before calling subscribe when enableOfflineQueue: false.
        await localSub.connect();
        await localSub.subscribe(CHANNEL_VEHICLES);

        localSub.on("message", (_channel: string, message: string) => {
          if (closed) {
            localSub?.unsubscribe().catch(() => null);
            localSub?.quit().catch(() => null);
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
      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          return;
        }
        sendHeartbeat();
      }, HEARTBEAT_INTERVAL_MS);

      // ── 4. Cleanup on client disconnect ───────────────────────────────
      return () => {
        closed = true;
        clearInterval(heartbeat);
        if (localSub) {
          localSub.unsubscribe().catch(() => null);
          localSub.quit().catch(() => null);
        }
      };
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
