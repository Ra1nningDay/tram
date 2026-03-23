import { getShuttleData, getMapConfig } from "@/lib/data/shuttle-data";

type RouteDirectionSummary = {
  direction: string;
  coordinateCount: number;
  stopReferenceCount: number;
};

type RoutePreview = {
  id: string;
  name: string;
  directionCount: number;
  coordinateCount: number;
  directions: RouteDirectionSummary[];
};

type StopPreview = {
  id: string;
  name: string;
  icon: string;
  color: string;
  sequence: number;
};

type UsageEntry = {
  name: string;
  count: number;
};

export type AdminNetworkData = {
  routeCount: number;
  directionCount: number;
  coordinateCount: number;
  stopCount: number;
  namedStopCount: number;
  polygonPointCount: number;
  lastUpdatedAt: Date | null;
  iconUsage: UsageEntry[];
  colorUsage: UsageEntry[];
  routes: RoutePreview[];
  stops: StopPreview[];
  polygonSettings: {
    pointCount: number;
    initialZoom: number;
    minZoom: number;
    maxZoom: number;
    maskOpacity: number;
  };
  bounds: {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  };
};

function countUsage(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function getPolygonBounds(polygon: Array<[number, number]>) {
  const lngs = polygon.map((point) => point[0]);
  const lats = polygon.map((point) => point[1]);

  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

export async function getAdminNetworkData(): Promise<AdminNetworkData> {
  const [shuttleData, mapConfig] = await Promise.all([
    getShuttleData(),
    getMapConfig(),
  ]);

  const routes = shuttleData.routes.map((route) => {
    const directions = route.directions.map((direction) => ({
      direction: direction.direction,
      coordinateCount: direction.coordinates.length,
      stopReferenceCount: direction.stopReferences.length,
    }));

    return {
      id: route.id,
      name: route.name,
      directionCount: directions.length,
      coordinateCount: directions.reduce((sum, direction) => sum + direction.coordinateCount, 0),
      directions,
    };
  });

  const polygon = mapConfig.polygon;

  return {
    routeCount: routes.length,
    directionCount: routes.reduce((sum, route) => sum + route.directionCount, 0),
    coordinateCount: routes.reduce((sum, route) => sum + route.coordinateCount, 0),
    stopCount: shuttleData.stops.length,
    namedStopCount: shuttleData.stops.filter((stop) => Boolean(stop.nameTh?.trim() || stop.nameEn?.trim())).length,
    polygonPointCount: polygon.length,
    lastUpdatedAt: new Date(),
    iconUsage: countUsage(shuttleData.stops.map((stop) => stop.icon || "MapPin")),
    colorUsage: countUsage(shuttleData.stops.map((stop) => stop.color || "default")),
    routes,
    stops: shuttleData.stops.map((stop) => ({
      id: stop.id,
      name: stop.nameTh || stop.nameEn || stop.id,
      icon: stop.icon || "MapPin",
      color: stop.color || "default",
      sequence: stop.sequence,
    })),
    polygonSettings: {
      pointCount: polygon.length,
      initialZoom: mapConfig.initialZoom,
      minZoom: mapConfig.minZoom,
      maxZoom: mapConfig.maxZoom,
      maskOpacity: mapConfig.maskOpacity,
    },
    bounds: getPolygonBounds(polygon),
  };
}
