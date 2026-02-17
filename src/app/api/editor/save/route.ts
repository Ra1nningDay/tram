import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type LngLat = [number, number];

type SaveStop = {
  id: string;
  name_th: string;
  name_en?: string;
  latitude: number;
  longitude: number;
  sequence: number;
  direction: "outbound" | "inbound";
  icon?: string;
  color?: string;
};

type SavePayload = {
  routeCoordinates?: unknown;
  polygon?: unknown;
  stops?: unknown;
};

type ShuttleDataFile = {
  routes: Array<{
    directions: Array<{
      geometry: {
        coordinates: LngLat[];
      };
      stops?: Array<{ id: string; sequence: number }>;
    }>;
  }>;
  stops: SaveStop[];
};

type CampusConfigFile = {
  polygon: LngLat[];
  [key: string]: unknown;
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

function parseStops(value: unknown): SaveStop[] | null {
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
    } as SaveStop;
  });
}

export async function POST(request: Request) {
  try {
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

    const dataDir = path.join(process.cwd(), "src", "data");
    const shuttlePath = path.join(dataDir, "shuttle-data.json");
    const campusPath = path.join(dataDir, "campus-config.json");

    const [shuttleRaw, campusRaw] = await Promise.all([
      fs.readFile(shuttlePath, "utf8"),
      fs.readFile(campusPath, "utf8"),
    ]);

    const shuttleData = JSON.parse(shuttleRaw) as ShuttleDataFile;
    const campusConfig = JSON.parse(campusRaw) as CampusConfigFile;

    const updates: string[] = [];

    if (routeCoordinates || stops) {
      const direction = shuttleData.routes?.[0]?.directions?.[0];
      if (!direction?.geometry) {
        return NextResponse.json({ ok: false, error: "Route geometry not found in shuttle-data.json" }, { status: 500 });
      }

      if (routeCoordinates) {
        direction.geometry.coordinates = routeCoordinates;
        updates.push("route");
      }

      if (stops) {
        shuttleData.stops = stops;
        direction.stops = stops.map((stop, index) => ({ id: stop.id, sequence: index + 1 }));
        updates.push("stops");
      }

      await fs.writeFile(shuttlePath, `${JSON.stringify(shuttleData, null, 2)}\n`, "utf8");
    }

    if (polygon) {
      campusConfig.polygon = polygon;
      updates.push("polygon");
      await fs.writeFile(campusPath, `${JSON.stringify(campusConfig, null, 2)}\n`, "utf8");
    }

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
