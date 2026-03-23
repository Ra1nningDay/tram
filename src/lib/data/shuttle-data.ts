import { getPrisma } from "@/lib/prisma";

// JSON file fallbacks for initial seeding
import staticShuttleData from "@/data/shuttle-data.json";
import staticCampusConfig from "@/data/campus-config.json";

// ── Types ───────────────────────────────────────────────────────────

export type LngLat = [number, number];

export type StopRecord = {
  id: string;
  nameTh: string;
  nameEn: string | null;
  latitude: number;
  longitude: number;
  sequence: number;
  direction: string;
  icon: string | null;
  color: string | null;
};

export type StopReference = { id: string; sequence: number };

export type DirectionRecord = {
  direction: string;
  coordinates: LngLat[];
  stopReferences: StopReference[];
};

export type RouteRecord = {
  id: string;
  name: string;
  directions: DirectionRecord[];
};

export type ShuttleData = {
  routes: RouteRecord[];
  stops: StopRecord[];
};

export type MapConfigData = {
  polygon: LngLat[];
  mapStyle: string;
  initialZoom: number;
  minZoom: number;
  maxZoom: number;
  maskOpacity: number;
  maskColor: string;
  initialBearing: number;
};

function getStaticShuttleData(): ShuttleData {
  return {
    routes: staticShuttleData.routes.map((r) => ({
      id: r.id,
      name: r.name,
      directions: r.directions.map((d) => ({
        direction: d.direction,
        coordinates: d.geometry.coordinates as LngLat[],
        stopReferences: (d.stops ?? []) as StopReference[],
      })),
    })),
    stops: staticShuttleData.stops.map((s) => ({
      id: s.id,
      nameTh: s.name_th,
      nameEn: s.name_en ?? null,
      latitude: s.latitude,
      longitude: s.longitude,
      sequence: s.sequence,
      direction: s.direction,
      icon: s.icon ?? null,
      color: s.color ?? null,
    })),
  };
}

function getStaticMapConfig(): MapConfigData {
  return {
    polygon: staticCampusConfig.polygon as LngLat[],
    mapStyle: staticCampusConfig.mapStyle,
    initialZoom: staticCampusConfig.initialZoom,
    minZoom: staticCampusConfig.minZoom,
    maxZoom: staticCampusConfig.maxZoom,
    maskOpacity: staticCampusConfig.maskOpacity,
    maskColor: staticCampusConfig.maskColor,
    initialBearing: staticCampusConfig.initialBearing,
  };
}

// ── Read ─────────────────────────────────────────────────────────────

export async function getShuttleData(): Promise<ShuttleData> {
  try {
    const prisma = getPrisma();
    const [routes, stops] = await Promise.all([
      prisma.shuttleRoute.findMany({
        include: { directions: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.stop.findMany({ orderBy: { sequence: "asc" } }),
    ]);

    if (routes.length === 0) {
      return getStaticShuttleData();
    }

    return {
      routes: routes.map((r) => ({
        id: r.id,
        name: r.name,
        directions: r.directions.map((d) => ({
          direction: d.direction,
          coordinates: d.coordinates as LngLat[],
          stopReferences: d.stopReferences as StopReference[],
        })),
      })),
      stops: stops.map((s) => ({
        id: s.id,
        nameTh: s.nameTh,
        nameEn: s.nameEn,
        latitude: s.latitude,
        longitude: s.longitude,
        sequence: s.sequence,
        direction: s.direction,
        icon: s.icon,
        color: s.color,
      })),
    };
  } catch (error) {
    console.error("Failed to load shuttle data from database, falling back to static JSON", error);
    return getStaticShuttleData();
  }
}

export async function getMapConfig(): Promise<MapConfigData> {
  try {
    const prisma = getPrisma();
    const config = await prisma.mapConfig.findUnique({ where: { id: "default" } });

    if (!config) {
      return getStaticMapConfig();
    }

    return {
      polygon: config.polygon as LngLat[],
      mapStyle: config.mapStyle,
      initialZoom: config.initialZoom,
      minZoom: config.minZoom,
      maxZoom: config.maxZoom,
      maskOpacity: config.maskOpacity,
      maskColor: config.maskColor,
      initialBearing: config.initialBearing,
    };
  } catch (error) {
    console.error("Failed to load map config from database, falling back to static JSON", error);
    return getStaticMapConfig();
  }
}

// ── Write (Editor Save) ──────────────────────────────────────────────

type SaveEditorInput = {
  routeCoordinates?: LngLat[];
  polygon?: LngLat[];
  stops?: Array<{
    id: string;
    name_th: string;
    name_en?: string;
    latitude: number;
    longitude: number;
    sequence: number;
    direction: string;
    icon?: string;
    color?: string;
  }>;
};

export async function saveEditorData(input: SaveEditorInput): Promise<string[]> {
  const prisma = getPrisma();
  const updates: string[] = [];

  // Ensure route exists
  let route = await prisma.shuttleRoute.findFirst({
    include: { directions: true },
  });

  if (!route) {
    // Auto-seed route from JSON on first save
    route = await prisma.shuttleRoute.create({
      data: {
        name: staticShuttleData.routes[0].name,
        directions: {
          create: staticShuttleData.routes[0].directions.map((d) => ({
            direction: d.direction,
            coordinates: d.geometry.coordinates,
            stopReferences: d.stops ?? [],
          })),
        },
      },
      include: { directions: true },
    });
  }

  const direction = route.directions[0];

  if (input.routeCoordinates && direction) {
    await prisma.routeDirection.update({
      where: { id: direction.id },
      data: { coordinates: input.routeCoordinates },
    });
    updates.push("route");
  }

  if (input.stops) {
    // Replace all stops in a transaction
    await prisma.$transaction([
      prisma.stop.deleteMany(),
      ...input.stops.map((s) =>
        prisma.stop.create({
          data: {
            id: s.id,
            nameTh: s.name_th,
            nameEn: s.name_en,
            latitude: s.latitude,
            longitude: s.longitude,
            sequence: s.sequence,
            direction: s.direction,
            icon: s.icon,
            color: s.color,
          },
        })
      ),
    ]);

    // Update stop references in direction
    if (direction) {
      await prisma.routeDirection.update({
        where: { id: direction.id },
        data: {
          stopReferences: input.stops.map((s) => ({
            id: s.id,
            sequence: s.sequence,
          })),
        },
      });
    }

    updates.push("stops");
  }

  if (input.polygon) {
    await prisma.mapConfig.upsert({
      where: { id: "default" },
      update: { polygon: input.polygon },
      create: {
        id: "default",
        polygon: input.polygon,
      },
    });
    updates.push("polygon");
  }

  return updates;
}
