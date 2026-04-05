import type { Status, Vehicle } from "@/features/shuttle/api";
import { getShuttleData, type LngLat, type ShuttleData } from "@/lib/data/shuttle-data";
import { distanceMeters } from "@/lib/geo/distance";
import { projectPointToPolyline } from "@/lib/geo/polyline";
import {
  alongM,
  buildClosedRouteMeasure,
  forwardDistanceM,
  type ClosedRouteMeasure,
} from "@/lib/geo/route-measure";

type VehicleDirection = Vehicle["direction"];
type SpeedSource = "device" | "derived" | "previous" | "none";

type RouteStopContext = {
  id: string;
  nameTh: string;
  nameEn?: string;
  alongM: number;
};

export type RouteProjectionContext = {
  coordinates: LngLat[];
  measure: ClosedRouteMeasure;
  stops: RouteStopContext[];
};

export type RawVehicleFix = {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  receivedAt: Date;
};

export type TelemetryRouteContext = {
  outbound: RouteProjectionContext | null;
  inbound: RouteProjectionContext | null;
};

export type TelemetryDirectionCandidate = {
  direction: VehicleDirection;
  matchedPosition: Vehicle["matchedPosition"];
  routeDistanceM?: number;
  offRouteDistanceM?: number;
  projected: boolean;
  headingDeltaDeg?: number;
};

export type LiveVehicleTelemetryInput = {
  id: string;
  label?: string;
  direction: VehicleDirection;
  crowding?: Vehicle["crowding"];
  lastUpdated: string;
  rawFix: RawVehicleFix;
  previousRawFix?: RawVehicleFix;
  previousTelemetry?: LiveVehicleTelemetryState;
};

export type LiveVehicleTelemetryState = {
  snapshot: Vehicle;
  direction: VehicleDirection;
  rawFix: RawVehicleFix;
  matchedPosition: Vehicle["matchedPosition"];
  routeDistanceM?: number;
  offRouteDistanceM?: number;
  projected: boolean;
  rawSpeedKph: number;
  speedKph: number;
  speedEmaKph: number;
  instantaneousAlongRouteSpeedKph?: number;
  speedSource: SpeedSource;
  isOffRoute: boolean;
};

export const OFF_ROUTE_CORRIDOR_M = 20;
export const ETA_MIN_SPEED_MPS = 0.5;
export const ETA_AT_STOP_DISTANCE_M = 10;

const TELEMETRY_CONTEXT_TTL_MS = 60_000;
const MAX_SANE_DEVICE_SPEED_MPS = 35;
const MAX_SANE_DERIVED_SPEED_KPH = 80;
const MAX_SANE_ROUTE_SPEED_KPH = 80;
const MIN_HEADING_DISTANCE_M = 1.5;
const SPEED_EMA_ALPHA = 0.35;

let cachedTelemetryRouteContext:
  | { expiresAt: number; promise: Promise<TelemetryRouteContext> }
  | null = null;

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeDirection(value: string | null | undefined): VehicleDirection {
  return value === "inbound" ? "inbound" : "outbound";
}

function pickStopsByDirection(
  shuttleData: ShuttleData,
): { outbound: ShuttleData["stops"]; inbound: ShuttleData["stops"] } {
  const outbound = shuttleData.stops.filter(
    (stop) => normalizeDirection(stop.direction) !== "inbound",
  );
  const inboundRaw = shuttleData.stops.filter(
    (stop) => normalizeDirection(stop.direction) === "inbound",
  );

  return {
    outbound,
    inbound: inboundRaw.length > 0 ? inboundRaw : outbound,
  };
}

export function normalizeHeading(heading: number): number {
  const normalized = heading % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function isSaneDeviceHeading(heading?: number): heading is number {
  return isFiniteNumber(heading);
}

export function isSaneDeviceSpeed(speed?: number): speed is number {
  return isFiniteNumber(speed) && speed >= 0 && speed <= MAX_SANE_DEVICE_SPEED_MPS;
}

export function deriveHeading(
  previousFix?: RawVehicleFix,
  currentFix?: RawVehicleFix,
): number | undefined {
  if (!previousFix || !currentFix) {
    return undefined;
  }

  const from: LngLat = [previousFix.longitude, previousFix.latitude];
  const to: LngLat = [currentFix.longitude, currentFix.latitude];

  if (distanceMeters(from, to) < MIN_HEADING_DISTANCE_M) {
    return undefined;
  }

  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  return normalizeHeading((Math.atan2(dx, dy) * 180) / Math.PI);
}

export function deriveSpeedKph(
  previousFix?: RawVehicleFix,
  currentFix?: RawVehicleFix,
): number | undefined {
  if (!previousFix || !currentFix) {
    return undefined;
  }

  const deltaSeconds = (currentFix.receivedAt.getTime() - previousFix.receivedAt.getTime()) / 1000;
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return undefined;
  }

  const distanceM = distanceMeters(
    [previousFix.longitude, previousFix.latitude],
    [currentFix.longitude, currentFix.latitude],
  );

  if (distanceM < 0.5) {
    return 0;
  }

  const derived = (distanceM / deltaSeconds) * 3.6;
  if (!Number.isFinite(derived) || derived > MAX_SANE_DERIVED_SPEED_KPH) {
    return undefined;
  }

  return roundTo(derived, 1);
}

function toRouteProjectionContext(
  coordinates: LngLat[] | null,
  stops: ShuttleData["stops"],
): RouteProjectionContext | null {
  if (!coordinates || coordinates.length < 2) {
    return null;
  }

  const measure = buildClosedRouteMeasure(coordinates);
  const projectedStops = stops
    .map((stop) => {
      const projection = projectPointToPolyline(coordinates, [stop.longitude, stop.latitude]);
      return {
        id: stop.id,
        nameTh: stop.nameTh,
        nameEn: stop.nameEn ?? undefined,
        alongM: alongM(measure, projection),
      } satisfies RouteStopContext;
    })
    .sort((left, right) => left.alongM - right.alongM);

  return {
    coordinates,
    measure,
    stops: projectedStops,
  };
}

function getDirectionCoordinates(
  shuttleData: ShuttleData,
  direction: VehicleDirection,
): LngLat[] | null {
  const firstRoute = shuttleData.routes[0];
  if (!firstRoute || firstRoute.directions.length === 0) {
    return null;
  }

  const preferred = firstRoute.directions.find(
    (entry) => normalizeDirection(entry.direction) === direction,
  )?.coordinates;
  if (preferred && preferred.length >= 2) {
    return preferred;
  }

  const fallback = firstRoute.directions[0]?.coordinates ?? null;
  if (!fallback || fallback.length < 2) {
    return null;
  }

  if (direction === "inbound") {
    return [...fallback].reverse();
  }

  return fallback;
}

export function buildTelemetryRouteContext(shuttleData: ShuttleData): TelemetryRouteContext {
  const stopsByDirection = pickStopsByDirection(shuttleData);

  return {
    outbound: toRouteProjectionContext(
      getDirectionCoordinates(shuttleData, "outbound"),
      stopsByDirection.outbound,
    ),
    inbound: toRouteProjectionContext(
      getDirectionCoordinates(shuttleData, "inbound"),
      stopsByDirection.inbound,
    ),
  };
}

async function loadTelemetryRouteContext(): Promise<TelemetryRouteContext> {
  const shuttleData = await getShuttleData();
  return buildTelemetryRouteContext(shuttleData);
}

export async function getTelemetryRouteContext(): Promise<TelemetryRouteContext> {
  const now = Date.now();

  if (cachedTelemetryRouteContext && cachedTelemetryRouteContext.expiresAt > now) {
    return cachedTelemetryRouteContext.promise;
  }

  const promise = loadTelemetryRouteContext();
  cachedTelemetryRouteContext = {
    expiresAt: now + TELEMETRY_CONTEXT_TTL_MS,
    promise,
  };

  return promise;
}

function resolveRawSpeed(input: LiveVehicleTelemetryInput): {
  speedKph: number;
  speedSource: SpeedSource;
} {
  const deviceSpeedKph = isSaneDeviceSpeed(input.rawFix.speed)
    ? roundTo(input.rawFix.speed * 3.6, 1)
    : undefined;

  if (typeof deviceSpeedKph === "number") {
    return { speedKph: deviceSpeedKph, speedSource: "device" };
  }

  const derivedSpeedKph = deriveSpeedKph(input.previousRawFix, input.rawFix);
  if (typeof derivedSpeedKph === "number") {
    return { speedKph: derivedSpeedKph, speedSource: "derived" };
  }

  if (typeof input.previousTelemetry?.speedKph === "number") {
    return {
      speedKph: roundTo(input.previousTelemetry.speedKph, 1),
      speedSource: "previous",
    };
  }

  return { speedKph: 0, speedSource: "none" };
}

function resolveHeading(input: LiveVehicleTelemetryInput): number | undefined {
  if (isSaneDeviceHeading(input.rawFix.heading)) {
    return normalizeHeading(input.rawFix.heading);
  }

  const derivedHeading = deriveHeading(input.previousRawFix, input.rawFix);
  if (typeof derivedHeading === "number") {
    return derivedHeading;
  }

  if (typeof input.previousTelemetry?.snapshot.heading === "number") {
    return normalizeHeading(input.previousTelemetry.snapshot.heading);
  }

  return undefined;
}

function projectToRoute(
  rawFix: RawVehicleFix,
  direction: VehicleDirection,
  routeContext: TelemetryRouteContext,
): {
  matchedPosition: Vehicle["matchedPosition"];
  routeDistanceM?: number;
  offRouteDistanceM?: number;
  projected: boolean;
} {
  const directionContext = routeContext[direction];
  const rawPoint: LngLat = [rawFix.longitude, rawFix.latitude];

  if (!directionContext) {
    return {
      matchedPosition: { lng: rawFix.longitude, lat: rawFix.latitude },
      projected: false,
    };
  }

  const projection = projectPointToPolyline(directionContext.coordinates, rawPoint);
  return {
    matchedPosition: {
      lng: roundTo(projection.point[0], 6),
      lat: roundTo(projection.point[1], 6),
    },
    routeDistanceM: roundTo(alongM(directionContext.measure, projection), 1),
    offRouteDistanceM: roundTo(distanceMeters(rawPoint, projection.point), 1),
    projected: true,
  };
}

function deriveSegmentHeading(
  coordinates: LngLat[],
  segmentIndex: number,
): number | undefined {
  const from = coordinates[segmentIndex];
  const to = coordinates[(segmentIndex + 1) % coordinates.length];

  if (!from || !to) {
    return undefined;
  }

  const dx = to[0] - from[0];
  const dy = to[1] - from[1];

  if (Math.abs(dx) < 1e-12 && Math.abs(dy) < 1e-12) {
    return undefined;
  }

  return normalizeHeading((Math.atan2(dx, dy) * 180) / Math.PI);
}

function getHeadingDeltaDeg(
  heading: number | undefined,
  segmentHeading: number | undefined,
): number | undefined {
  if (typeof heading !== "number" || typeof segmentHeading !== "number") {
    return undefined;
  }

  const delta = Math.abs(heading - segmentHeading);
  return Math.min(delta, 360 - delta);
}

export function getTelemetryDirectionCandidates(
  rawFix: RawVehicleFix,
  routeContext: TelemetryRouteContext,
): TelemetryDirectionCandidate[] {
  const rawPoint: LngLat = [rawFix.longitude, rawFix.latitude];

  return (["outbound", "inbound"] as const)
    .map((direction) => {
      const directionContext = routeContext[direction];
      if (!directionContext) {
        return {
          direction,
          matchedPosition: {
            lng: rawFix.longitude,
            lat: rawFix.latitude,
          },
          projected: false,
        } satisfies TelemetryDirectionCandidate;
      }

      const projection = projectPointToPolyline(directionContext.coordinates, rawPoint);
      const segmentHeading = deriveSegmentHeading(
        directionContext.coordinates,
        projection.segmentIndex,
      );

      return {
        direction,
        matchedPosition: {
          lng: roundTo(projection.point[0], 6),
          lat: roundTo(projection.point[1], 6),
        },
        routeDistanceM: roundTo(alongM(directionContext.measure, projection), 1),
        offRouteDistanceM: roundTo(distanceMeters(rawPoint, projection.point), 1),
        projected: true,
        headingDeltaDeg: getHeadingDeltaDeg(
          isSaneDeviceHeading(rawFix.heading) ? normalizeHeading(rawFix.heading) : undefined,
          segmentHeading,
        ),
      } satisfies TelemetryDirectionCandidate;
    })
    .sort((left, right) => {
      const leftDistance = left.offRouteDistanceM ?? Number.POSITIVE_INFINITY;
      const rightDistance = right.offRouteDistanceM ?? Number.POSITIVE_INFINITY;
      return leftDistance - rightDistance;
    });
}

export function resolveTelemetryDirection(params: {
  rawFix: RawVehicleFix;
  routeContext: TelemetryRouteContext;
  previousDirection?: VehicleDirection;
}): VehicleDirection {
  const candidates = getTelemetryDirectionCandidates(params.rawFix, params.routeContext);
  const [bestCandidate, fallbackCandidate] = candidates;

  if (!bestCandidate) {
    return params.previousDirection ?? "outbound";
  }

  if (!fallbackCandidate) {
    return bestCandidate.direction;
  }

  const bestDistance = bestCandidate.offRouteDistanceM ?? Number.POSITIVE_INFINITY;
  const fallbackDistance = fallbackCandidate.offRouteDistanceM ?? Number.POSITIVE_INFINITY;

  if (
    params.previousDirection &&
    Math.abs(bestDistance - fallbackDistance) <= 5
  ) {
    return params.previousDirection;
  }

  const bestHeadingDelta = bestCandidate.headingDeltaDeg ?? Number.POSITIVE_INFINITY;
  const fallbackHeadingDelta =
    fallbackCandidate.headingDeltaDeg ?? Number.POSITIVE_INFINITY;

  if (Math.abs(bestDistance - fallbackDistance) <= 2) {
    if (Math.abs(bestHeadingDelta - fallbackHeadingDelta) >= 20) {
      return bestHeadingDelta <= fallbackHeadingDelta
        ? bestCandidate.direction
        : fallbackCandidate.direction;
    }
  }

  return bestDistance <= fallbackDistance
    ? bestCandidate.direction
    : fallbackCandidate.direction;
}

function deriveAlongRouteSpeedKph(
  previousTelemetry: LiveVehicleTelemetryState | undefined,
  currentDirection: VehicleDirection,
  currentRouteDistanceM: number | undefined,
  currentFix: RawVehicleFix,
  directionContext: RouteProjectionContext | null,
  offRouteDistanceM?: number,
): number | undefined {
  if (
    !previousTelemetry ||
    !directionContext ||
    typeof currentRouteDistanceM !== "number" ||
    typeof previousTelemetry.routeDistanceM !== "number"
  ) {
    return undefined;
  }

  if (previousTelemetry.direction !== currentDirection) {
    return undefined;
  }

  if (previousTelemetry.isOffRoute || (offRouteDistanceM ?? 0) > OFF_ROUTE_CORRIDOR_M) {
    return undefined;
  }

  const deltaSeconds =
    (currentFix.receivedAt.getTime() - previousTelemetry.rawFix.receivedAt.getTime()) / 1000;
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return undefined;
  }

  const forwardDistance = forwardDistanceM(
    directionContext.measure.totalLengthM,
    previousTelemetry.routeDistanceM,
    currentRouteDistanceM,
  );
  const instantaneousSpeedKph = roundTo((forwardDistance / deltaSeconds) * 3.6, 1);

  if (
    !Number.isFinite(instantaneousSpeedKph) ||
    instantaneousSpeedKph < 0 ||
    instantaneousSpeedKph > MAX_SANE_ROUTE_SPEED_KPH
  ) {
    return undefined;
  }

  return instantaneousSpeedKph;
}

function applySpeedEma(
  previousEmaKph: number | undefined,
  instantaneousKph: number | undefined,
  fallbackKph: number,
): number {
  if (typeof instantaneousKph === "number") {
    if (typeof previousEmaKph === "number") {
      return roundTo(previousEmaKph * (1 - SPEED_EMA_ALPHA) + instantaneousKph * SPEED_EMA_ALPHA, 1);
    }

    return roundTo(instantaneousKph, 1);
  }

  if (typeof previousEmaKph === "number") {
    return roundTo(previousEmaKph, 1);
  }

  return roundTo(fallbackKph, 1);
}

function resolveEtaConfidence(params: {
  projected: boolean;
  offRouteDistanceM?: number;
  speedSource: SpeedSource;
  instantaneousAlongRouteSpeedKph?: number;
}): number {
  if (!params.projected) {
    return 0;
  }

  const offRouteDistanceM = params.offRouteDistanceM ?? 0;
  if (offRouteDistanceM > OFF_ROUTE_CORRIDOR_M) {
    return 0.2;
  }

  let confidence = 1;

  if (params.speedSource === "derived") confidence -= 0.08;
  if (params.speedSource === "previous") confidence -= 0.2;
  if (params.speedSource === "none") confidence -= 0.35;
  if (typeof params.instantaneousAlongRouteSpeedKph !== "number") confidence -= 0.12;

  if (offRouteDistanceM > 15) confidence -= 0.18;
  else if (offRouteDistanceM > 8) confidence -= 0.08;

  return roundTo(clamp(confidence, 0, 1), 2);
}

export function buildLiveVehicleTelemetryState(
  input: LiveVehicleTelemetryInput,
  routeContext: TelemetryRouteContext,
): LiveVehicleTelemetryState {
  const { speedKph: rawSpeedKph, speedSource } = resolveRawSpeed(input);
  const heading = resolveHeading(input);
  const routeProjection = projectToRoute(input.rawFix, input.direction, routeContext);
  const directionContext = routeContext[input.direction];
  const instantaneousAlongRouteSpeedKph = deriveAlongRouteSpeedKph(
    input.previousTelemetry,
    input.direction,
    routeProjection.routeDistanceM,
    input.rawFix,
    directionContext,
    routeProjection.offRouteDistanceM,
  );
  const speedEmaKph = applySpeedEma(
    input.previousTelemetry?.speedEmaKph,
    instantaneousAlongRouteSpeedKph,
    rawSpeedKph,
  );
  const isOffRoute = (routeProjection.offRouteDistanceM ?? 0) > OFF_ROUTE_CORRIDOR_M;
  const etaConfidence = resolveEtaConfidence({
    projected: routeProjection.projected,
    offRouteDistanceM: routeProjection.offRouteDistanceM,
    speedSource,
    instantaneousAlongRouteSpeedKph,
  });

  return {
    direction: input.direction,
    rawFix: input.rawFix,
    matchedPosition: routeProjection.matchedPosition,
    routeDistanceM: routeProjection.routeDistanceM,
    offRouteDistanceM: routeProjection.offRouteDistanceM,
    projected: routeProjection.projected,
    rawSpeedKph,
    speedKph: speedEmaKph,
    speedEmaKph,
    instantaneousAlongRouteSpeedKph,
    speedSource,
    isOffRoute,
    snapshot: {
      id: input.id,
      label: input.label,
      latitude: input.rawFix.latitude,
      longitude: input.rawFix.longitude,
      heading,
      direction: input.direction,
      last_updated: input.lastUpdated,
      status: "fresh",
      crowding: input.crowding,
      speedKph: speedEmaKph,
      routeDistanceM: routeProjection.routeDistanceM,
      matchedPosition: routeProjection.matchedPosition,
      etaConfidence,
    },
  };
}

export function buildLiveVehicleSnapshot(
  input: LiveVehicleTelemetryInput,
  routeContext: TelemetryRouteContext,
): Vehicle {
  return buildLiveVehicleTelemetryState(input, routeContext).snapshot;
}

export function isEtaEligible(status: Status, telemetry: LiveVehicleTelemetryState): boolean {
  return (
    status === "fresh" &&
    telemetry.projected &&
    !telemetry.isOffRoute &&
    (telemetry.snapshot.etaConfidence ?? 0) > 0.35 &&
    telemetry.speedEmaKph / 3.6 > ETA_MIN_SPEED_MPS &&
    typeof telemetry.routeDistanceM === "number"
  );
}

export function resetTelemetryRouteContextCache() {
  cachedTelemetryRouteContext = null;
}
