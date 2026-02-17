import type { Eta, Route, Stop, Vehicle } from "./api";
import shuttleData from "../../data/shuttle-data.json";
import { projectPointToPolyline } from "../../lib/geo/polyline";
import { alongM, buildClosedRouteMeasure, forwardDistanceM } from "../../lib/geo/route-measure";

type LngLat = [number, number];

export type EtaWithDetails = Eta & {
  vehicle_label?: string;
  plate?: string;
  distance_meters?: number;
  speed_kph?: number;
};

export type VehicleTelemetry = {
  vehicle_id: string;
  plate: string;
  speed_kph?: number;
  next_stop_id?: string;
  next_stop_name_th?: string;
  next_stop_name_en?: string;
  distance_to_next_stop_m?: number;
  eta_to_next_stop_s?: number;
  arrival_time?: string;
};

type PrevTelemetry = { lngLat: LngLat; atMs: number; speedMpsEma?: number };

type SimulatedInsightsParams = {
  vehicles: Vehicle[];
  route?: Route;
  stops?: Stop[];
  nowMs: number;
  prevByVehicleId: Map<string, PrevTelemetry>;
};

type SimulatedInsightsResult = {
  etasByStopId: Record<string, EtaWithDetails[]>;
  telemetryByVehicleId: Record<string, VehicleTelemetry>;
};

function getRouteCoordinatesFromRoute(route: Route | undefined, direction: "outbound" | "inbound"): LngLat[] | null {
  const match = route?.directions?.find((d) => d.direction === direction);
  const coords = match?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  return coords as LngLat[];
}

function getFirstRouteCoordinatesFromRoute(route?: Route): LngLat[] | null {
  const coords = route?.directions?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  return coords as LngLat[];
}

function getFallbackRouteCoordinates(): LngLat[] {
  return shuttleData.routes[0].directions[0].geometry.coordinates as LngLat[];
}

function getFallbackStops(): Stop[] {
  const rawStops = shuttleData.stops as Array<Record<string, unknown>>;
  return rawStops.map((s, idx) => {
    const directionRaw = String(s.direction ?? "outbound");
    const direction: "outbound" | "inbound" = directionRaw === "inbound" ? "inbound" : "outbound";
    return {
      id: String(s.id ?? `stop-${idx + 1}`),
      name_th: String(s.name_th ?? s.id ?? `Stop ${idx + 1}`),
      name_en: typeof s.name_en === "string" ? s.name_en : undefined,
      latitude: Number(s.latitude ?? 0),
      longitude: Number(s.longitude ?? 0),
      sequence: Number(s.sequence ?? idx + 1),
      direction,
      icon: typeof s.icon === "string" ? s.icon : undefined,
    };
  });
}

function buildRouteCoordsByDirection(route?: Route): { outbound: LngLat[]; inbound: LngLat[] } {
  const fallback = getFallbackRouteCoordinates();
  const outbound = getRouteCoordinatesFromRoute(route, "outbound") ?? getFirstRouteCoordinatesFromRoute(route) ?? fallback;
  const inboundFromRoute = getRouteCoordinatesFromRoute(route, "inbound");
  const inbound = inboundFromRoute && inboundFromRoute.length >= 2 ? inboundFromRoute : [...outbound].reverse();
  return { outbound, inbound };
}

function pickStopsByDirection(stops?: Stop[]): { outbound: Stop[]; inbound: Stop[] } {
  const allStops = stops ?? getFallbackStops();
  const outboundStops = allStops.filter((s) => s.direction !== "inbound");
  const inboundStopsRaw = allStops.filter((s) => s.direction === "inbound");
  const inboundStops = inboundStopsRaw.length > 0 ? inboundStopsRaw : outboundStops;
  return { outbound: outboundStops, inbound: inboundStops };
}

function getVehicleLngLat(v: Vehicle): LngLat {
  return [v.longitude, v.latitude];
}

export function buildSimulatedInsights(params: SimulatedInsightsParams): SimulatedInsightsResult {
  const { vehicles, route, stops, nowMs, prevByVehicleId } = params;

  const routeCoordsByDirection = buildRouteCoordsByDirection(route);
  const stopsByDirection = pickStopsByDirection(stops);

  const etasByStopId: Record<string, EtaWithDetails[]> = {};
  const telemetryByVehicleId: Record<string, VehicleTelemetry> = {};

  const perDirection = (direction: "outbound" | "inbound") => {
    const coords = routeCoordsByDirection[direction];
    if (!coords || coords.length < 2) return null;
    const measure = buildClosedRouteMeasure(coords);
    const stopsForDir = stopsByDirection[direction];

    const stopAlongById = new Map<string, { along: number; stop: Stop }>();
    for (const s of stopsForDir) {
      const proj = projectPointToPolyline(coords, [s.longitude, s.latitude]);
      const a = alongM(measure, proj);
      stopAlongById.set(s.id, { along: a, stop: s });
    }

    return { coords, measure, stopsForDir, stopAlongById };
  };

  const outbound = perDirection("outbound");
  const inbound = perDirection("inbound");

  const SPEED_OK_MPS = 0.3; // ~1.1 km/h
  const MIN_DISTANCE_AT_STOP_M = 10; // treat as "at stop"

  for (const vehicle of vehicles) {
    if (vehicle.status === "hidden") continue;

    const dir = vehicle.direction;
    const ctx = dir === "inbound" ? inbound : outbound;
    if (!ctx) continue;

    const { coords, measure, stopsForDir, stopAlongById } = ctx;
    const total = measure.totalLengthM;
    if (total <= 0) continue;

    const nowLngLat = getVehicleLngLat(vehicle);

    // Speed estimation (EMA).
    const prev = prevByVehicleId.get(vehicle.id);
    let speedMpsEma = prev?.speedMpsEma;

    // Position along the route.
    const vProj = projectPointToPolyline(coords, nowLngLat);
    const vAlong = alongM(measure, vProj);

    if (prev) {
      const dt = Math.max(0, (nowMs - prev.atMs) / 1000);
      if (dt > 0) {
        const prevProj = projectPointToPolyline(coords, prev.lngLat);
        const prevAlong = alongM(measure, prevProj);
        const forward = forwardDistanceM(total, prevAlong, vAlong);
        const distAlong = Math.min(forward, Math.max(0, total - forward)); // protect against tiny back-jitter spikes
        const instMps = distAlong / dt;
        speedMpsEma = typeof speedMpsEma === "number" ? 0.7 * speedMpsEma + 0.3 * instMps : instMps;
      }
    }
    prevByVehicleId.set(vehicle.id, { lngLat: nowLngLat, atMs: nowMs, speedMpsEma });
    const speedKph = typeof speedMpsEma === "number" ? speedMpsEma * 3.6 : undefined;

    // Find next stop (min forward distance).
    let nextStop: Stop | undefined;
    let nextDistM = Number.POSITIVE_INFINITY;
    for (const s of stopsForDir) {
      const entry = stopAlongById.get(s.id);
      if (!entry) continue;
      const d = forwardDistanceM(total, vAlong, entry.along);
      if (d < nextDistM) {
        nextDistM = d;
        nextStop = s;
      }
    }

    if (nextStop) {
      const dist = nextDistM <= MIN_DISTANCE_AT_STOP_M ? 0 : nextDistM;
      const speedForEta = typeof speedMpsEma === "number" ? speedMpsEma : undefined;
      const etaOk = vehicle.status === "fresh" && typeof speedForEta === "number" && speedForEta > SPEED_OK_MPS;
      const etaS = etaOk && speedForEta ? dist / speedForEta : undefined;
      const arrival_time = etaS !== undefined ? new Date(nowMs + etaS * 1000).toISOString() : undefined;

      telemetryByVehicleId[vehicle.id] = {
        vehicle_id: vehicle.id,
        plate: vehicle.label ?? vehicle.id,
        speed_kph: speedKph,
        next_stop_id: nextStop.id,
        next_stop_name_th: nextStop.name_th,
        next_stop_name_en: nextStop.name_en,
        distance_to_next_stop_m: dist,
        eta_to_next_stop_s: etaS,
        arrival_time,
      };
    } else {
      telemetryByVehicleId[vehicle.id] = {
        vehicle_id: vehicle.id,
        plate: vehicle.label ?? vehicle.id,
        speed_kph: speedKph,
      };
    }

    // Build per-stop ETAs for the stop popup (top 3 after sorting).
    for (const s of stopsForDir) {
      const entry = stopAlongById.get(s.id);
      if (!entry) continue;
      const distRaw = forwardDistanceM(total, vAlong, entry.along);
      const dist = distRaw <= MIN_DISTANCE_AT_STOP_M ? 0 : distRaw;

      const speedForEta = typeof speedMpsEma === "number" ? speedMpsEma : undefined;
      const etaOk = vehicle.status === "fresh" && typeof speedForEta === "number" && speedForEta > SPEED_OK_MPS;
      const etaS = etaOk && speedForEta ? dist / speedForEta : undefined;
      const etaMinutes = etaS !== undefined ? Math.max(0, Math.ceil(etaS / 60)) : -1;
      const arrival_time = etaS !== undefined ? new Date(nowMs + etaS * 1000).toISOString() : undefined;

      const row: EtaWithDetails = {
        stop_id: s.id,
        vehicle_id: vehicle.id,
        eta_minutes: etaMinutes,
        arrival_time,
        last_updated: vehicle.last_updated,
        status: vehicle.status,
        vehicle_label: vehicle.label,
        plate: vehicle.label ?? vehicle.id,
        distance_meters: dist,
        speed_kph: speedKph,
      };

      (etasByStopId[s.id] ??= []).push(row);
    }
  }

  // Sort + trim.
  for (const [stopId, rows] of Object.entries(etasByStopId)) {
    rows.sort((a, b) => {
      const aKnown = a.status === "fresh" && a.eta_minutes >= 0;
      const bKnown = b.status === "fresh" && b.eta_minutes >= 0;
      if (aKnown !== bKnown) return aKnown ? -1 : 1;
      if (aKnown && bKnown) return a.eta_minutes - b.eta_minutes;
      const ad = typeof a.distance_meters === "number" ? a.distance_meters : Number.POSITIVE_INFINITY;
      const bd = typeof b.distance_meters === "number" ? b.distance_meters : Number.POSITIVE_INFINITY;
      return ad - bd;
    });
    etasByStopId[stopId] = rows.slice(0, 3);
  }

  return { etasByStopId, telemetryByVehicleId };
}
