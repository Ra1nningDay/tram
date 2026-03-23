import { NextResponse } from "next/server";
import { getShuttleData } from "@/lib/data/shuttle-data";
import { saveEditorData } from "@/lib/data/shuttle-data";
import { getAuth } from "@/lib/auth";
import { userCanAccessEditor } from "@/lib/auth/roles";

export const runtime = "nodejs";

type LngLat = [number, number];

type SavePayload = {
  routeCoordinates?: unknown;
  polygon?: unknown;
  stops?: unknown;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseLngLat(value: unknown): LngLat | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [lng, lat] = value;
  if (!isFiniteNumber(lng) || !isFiniteNumber(lat)) return null;
  return [lng, lat];
}

function parseLngLatList(value: unknown, minCount: number): LngLat[] | null {
  if (!Array.isArray(value) || value.length < minCount) return null;
  const parsed: LngLat[] = [];
  for (const item of value) {
    const coord = parseLngLat(item);
    if (!coord) return null;
    parsed.push(coord);
  }
  return parsed;
}

type ParsedStop = {
  id: string;
  name_th: string;
  name_en?: string;
  latitude: number;
  longitude: number;
  sequence: number;
  direction: string;
  icon?: string;
  color?: string;
};

function parseStops(value: unknown): ParsedStop[] | null {
  if (!Array.isArray(value)) return null;

  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error("Invalid stop payload");
    }

    const stop = item as Record<string, unknown>;
    const id = typeof stop.id === "string" && stop.id.trim() ? stop.id.trim() : `stop-${index + 1}`;
    const name_th =
      typeof stop.name_th === "string" && stop.name_th.trim()
        ? stop.name_th.trim()
        : `Stop ${index + 1}`;
    const name_en = typeof stop.name_en === "string" && stop.name_en.trim() ? stop.name_en.trim() : undefined;

    if (!isFiniteNumber(stop.latitude) || !isFiniteNumber(stop.longitude)) {
      throw new Error(`Invalid coordinates for stop ${id}`);
    }

    return {
      id,
      name_th,
      name_en,
      latitude: stop.latitude,
      longitude: stop.longitude,
      sequence: index + 1,
      direction: "outbound",
      icon: typeof stop.icon === "string" ? stop.icon : undefined,
      color: typeof stop.color === "string" ? stop.color : undefined,
    } as ParsedStop;
  });
}

export async function GET() {
  const data = await getShuttleData();
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: Request) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
      query: { disableRefresh: true },
    });

    if (!session) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const canAccessEditor = await userCanAccessEditor(session.user.id);
    if (!canAccessEditor) {
      return NextResponse.json({ ok: false, error: "Editor role required" }, { status: 403 });
    }

    const body = (await request.json()) as SavePayload;

    const routeCoordinates =
      body.routeCoordinates === undefined ? undefined : parseLngLatList(body.routeCoordinates, 2);
    const polygon = body.polygon === undefined ? undefined : parseLngLatList(body.polygon, 3);
    const stops = body.stops === undefined ? undefined : parseStops(body.stops);

    if (body.routeCoordinates !== undefined && !routeCoordinates) {
      return NextResponse.json({ ok: false, error: "Invalid routeCoordinates payload" }, { status: 400 });
    }
    if (body.polygon !== undefined && !polygon) {
      return NextResponse.json({ ok: false, error: "Invalid polygon payload" }, { status: 400 });
    }
    if (body.stops !== undefined && !stops) {
      return NextResponse.json({ ok: false, error: "Invalid stops payload" }, { status: 400 });
    }
    if (!routeCoordinates && !polygon && !stops) {
      return NextResponse.json({ ok: false, error: "No valid changes provided" }, { status: 400 });
    }

    const updates = await saveEditorData({
      routeCoordinates: routeCoordinates ?? undefined,
      polygon: polygon ?? undefined,
      stops: stops ?? undefined,
    });

    return NextResponse.json({ ok: true, updated: updates });
  } catch (error) {
    console.error("Failed to save editor data", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown save error",
      },
      { status: 500 }
    );
  }
}
