import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { publishVehicleUpdate } from "@/lib/redis";
import { upsertVehicle } from "@/lib/vehicles/store";
import { getAllVehicles } from "@/lib/vehicles/store";
import type { VehicleSource } from "@/lib/vehicles/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Auth helpers ─────────────────────────────────────────────────────────────

const GPS_API_KEY = process.env.GPS_INGEST_API_KEY;

/**
 * Resolves which source is calling:
 * - Bearer <GPS_INGEST_API_KEY>  → "hardware"
 * - Valid better-auth session    → "driver"
 * Returns null when unauthenticated.
 */
async function resolveSource(req: NextRequest): Promise<VehicleSource | null> {
  const authorization = req.headers.get("authorization") ?? "";

  // Hardware: static API key
  if (authorization.startsWith("Bearer ") && GPS_API_KEY) {
    const token = authorization.slice(7);
    if (token === GPS_API_KEY) return "hardware";
  }

  // Driver app: better-auth session cookie
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user) return "driver";
  } catch {
    // session lookup failed — not authenticated
  }

  return null;
}

// ── Body schema ──────────────────────────────────────────────────────────────

type IngestBody = {
  vehicle_id: string;
  label?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  direction?: "outbound" | "inbound";
};

function validateBody(body: unknown): IngestBody | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const vehicle_id = typeof b.vehicle_id === "string" ? b.vehicle_id.trim() : null;
  const latitude = typeof b.latitude === "number" ? b.latitude : null;
  const longitude = typeof b.longitude === "number" ? b.longitude : null;

  if (!vehicle_id || latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;

  return {
    vehicle_id,
    label: typeof b.label === "string" ? b.label : undefined,
    latitude,
    longitude,
    heading: typeof b.heading === "number" ? b.heading : undefined,
    speed: typeof b.speed === "number" ? b.speed : undefined,
    direction:
      b.direction === "inbound" ? "inbound" : "outbound",
  };
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const source = await resolveSource(req);
  if (!source) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse & validate body
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = validateBody(raw);
  if (!body) {
    return NextResponse.json(
      {
        error: "Bad Request",
        message:
          "Required fields: vehicle_id (string), latitude (number), longitude (number)",
      },
      { status: 400 },
    );
  }

  // 3. Upsert in-memory store
  upsertVehicle({
    id: body.vehicle_id,
    label: body.label,
    latitude: body.latitude,
    longitude: body.longitude,
    heading: body.heading,
    speed: body.speed,
    direction: body.direction ?? "outbound",
    source,
  });

  // 4. Persist GPS history to PostgreSQL (fire-and-forget)
  try {
    const prisma = getPrisma();
    void prisma.vehicleLocation.create({
      data: {
        vehicleId: body.vehicle_id,
        label: body.label,
        latitude: body.latitude,
        longitude: body.longitude,
        heading: body.heading,
        speed: body.speed,
        source,
      },
    });
  } catch (err) {
    // Non-fatal: GPS ingest continues even if DB write fails
    console.error("[gps/ingest] db write failed:", err);
  }

  // 5. Broadcast via Redis Pub/Sub → triggers SSE push to all clients
  try {
    await publishVehicleUpdate(getAllVehicles());
  } catch (err) {
    console.error("[gps/ingest] redis publish failed:", err);
  }

  return NextResponse.json({ ok: true, source }, { status: 200 });
}
