import { useState, useEffect, useCallback, useRef } from "react";
import type { Vehicle } from "../features/shuttle/api";
import { type GpsPoint, parseTramCsvFiltered } from "../lib/csv-parser";
import shuttleData from "../data/shuttle-data.json";

/* ------------------------------------------------------------------ */
/*  Tram metadata                                                      */
/* ------------------------------------------------------------------ */

const TRAM_FILES = [
    { id: "tram-1", label: "BUS_1", url: "/data/tram_1.csv", color: "#FE5050" },
    { id: "tram-2", label: "BUS_2", url: "/data/tram_2.csv", color: "#FE5050" },
    { id: "tram-3", label: "BUS_3", url: "/data/tram_3.csv", color: "#FE5050" },
];

/** Playback speed multiplier – 1 = real-time */
const SPEED = 1;

/** Max gap before we skip (ms) */
const MAX_GAP_MS = 10_000;

/** Telemetry UI updates throttle (ms) */
const TELEMETRY_THROTTLE_MS = 500;

/* ------------------------------------------------------------------ */
/*  Route polyline with cumulative distances                           */
/* ------------------------------------------------------------------ */

const ROUTE_COORDS: [number, number][] =
    (shuttleData.routes[0]?.directions[0]?.geometry?.coordinates ?? []) as [number, number][];

function haversineM(a: [number, number], b: [number, number]): number {
    const R = 6_371_000;
    const toRad = Math.PI / 180;
    const dLat = (b[1] - a[1]) * toRad;
    const dLng = (b[0] - a[0]) * toRad;
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const h = sinDLat * sinDLat + Math.cos(a[1] * toRad) * Math.cos(b[1] * toRad) * sinDLng * sinDLng;
    return 2 * R * Math.asin(Math.sqrt(h));
}

const ROUTE_CUM_DIST: number[] = [];
{
    let d = 0;
    ROUTE_CUM_DIST.push(0);
    for (let i = 1; i < ROUTE_COORDS.length; i++) {
        d += haversineM(ROUTE_COORDS[i - 1], ROUTE_COORDS[i]);
        ROUTE_CUM_DIST.push(d);
    }
}
const ROUTE_TOTAL_M = ROUTE_CUM_DIST[ROUTE_CUM_DIST.length - 1] ?? 0;

/* ------------------------------------------------------------------ */
/*  Stop positions                                                     */
/* ------------------------------------------------------------------ */

interface StopOnRoute {
    id: string;
    name: string;
    distanceM: number;
}

function projectStopToRoute(lat: number, lng: number): number {
    let bestDist2 = Infinity;
    let bestRouteDist = 0;
    for (let i = 0; i < ROUTE_COORDS.length - 1; i++) {
        const a = ROUTE_COORDS[i];
        const b = ROUTE_COORDS[i + 1];
        const abx = b[0] - a[0];
        const aby = b[1] - a[1];
        const denom = abx * abx + aby * aby;
        const t = denom <= 1e-18 ? 0 : Math.max(0, Math.min(1, ((lng - a[0]) * abx + (lat - a[1]) * aby) / denom));
        const px = a[0] + abx * t;
        const py = a[1] + aby * t;
        const dx = lng - px;
        const dy = lat - py;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < bestDist2) {
            bestDist2 = dist2;
            const segStart = ROUTE_CUM_DIST[i];
            const segEnd = ROUTE_CUM_DIST[i + 1] ?? segStart;
            bestRouteDist = segStart + (segEnd - segStart) * t;
        }
    }
    return bestRouteDist;
}

const STOPS_ON_ROUTE: StopOnRoute[] = (shuttleData.stops ?? []).map((s) => ({
    id: s.id,
    name: s.name_th,
    distanceM: projectStopToRoute(s.latitude, s.longitude),
})).sort((a, b) => a.distanceM - b.distanceM);

/* ------------------------------------------------------------------ */
/*  Position at distance                                               */
/* ------------------------------------------------------------------ */

function positionAtDistance(distM: number): { lng: number; lat: number; heading: number } {
    const d = ((distM % ROUTE_TOTAL_M) + ROUTE_TOTAL_M) % ROUTE_TOTAL_M;

    let lo = 0;
    let hi = ROUTE_CUM_DIST.length - 2;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (ROUTE_CUM_DIST[mid] <= d) lo = mid;
        else hi = mid - 1;
    }

    const segStart = ROUTE_CUM_DIST[lo];
    const segEnd = ROUTE_CUM_DIST[lo + 1] ?? segStart;
    const segLen = segEnd - segStart || 1;
    const t = (d - segStart) / segLen;

    const a = ROUTE_COORDS[lo];
    const b = ROUTE_COORDS[lo + 1] ?? a;
    const lng = a[0] + (b[0] - a[0]) * t;
    const lat = a[1] + (b[1] - a[1]) * t;

    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const heading = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;

    return { lng, lat, heading };
}

/* ------------------------------------------------------------------ */
/*  Telemetry                                                          */
/* ------------------------------------------------------------------ */

export interface VehicleTelemetry {
    vehicleId: string;
    label: string;
    speedKmh: number;
    nextStopName: string;
    distanceToNextStopM: number;
    progressPercent: number;
    prevStopName: string;
    status: "normal" | "warning";
}

function computeTelemetry(
    vehicleId: string, label: string, distanceM: number, speedKmh: number,
): VehicleTelemetry {
    const d = ((distanceM % ROUTE_TOTAL_M) + ROUTE_TOTAL_M) % ROUTE_TOTAL_M;
    let nextIdx = STOPS_ON_ROUTE.findIndex((s) => s.distanceM > d);
    if (nextIdx < 0) nextIdx = 0;
    const prevIdx = (nextIdx - 1 + STOPS_ON_ROUTE.length) % STOPS_ON_ROUTE.length;
    const nextStop = STOPS_ON_ROUTE[nextIdx];
    const prevStop = STOPS_ON_ROUTE[prevIdx];

    let distToNext = nextStop.distanceM - d;
    if (distToNext < 0) distToNext += ROUTE_TOTAL_M;

    let segLength = nextStop.distanceM - prevStop.distanceM;
    if (segLength <= 0) segLength += ROUTE_TOTAL_M;
    let traveled = d - prevStop.distanceM;
    if (traveled < 0) traveled += ROUTE_TOTAL_M;
    const progressPercent = Math.min(100, Math.max(0, (traveled / segLength) * 100));

    return {
        vehicleId, label,
        speedKmh: Math.round(speedKmh * 10) / 10,
        nextStopName: nextStop.name,
        distanceToNextStopM: Math.round(distToNext),
        progressPercent: Math.round(progressPercent),
        prevStopName: prevStop.name,
        status: speedKmh < 1 ? "warning" : "normal",
    };
}

/* ------------------------------------------------------------------ */
/*  Per-tram cursor                                                    */
/* ------------------------------------------------------------------ */

interface TramCursor {
    id: string;
    label: string;
    color: string;
    gpsPoints: GpsPoint[];
    gpsIdx: number;
    virtualMs: number;
    distanceM: number;
    currentSpeedKmh: number;
}

function initCursor(
    id: string, label: string, color: string,
    gpsPoints: GpsPoint[], startFraction: number,
): TramCursor {
    const startIdx = Math.floor(gpsPoints.length * startFraction) % Math.max(gpsPoints.length, 1);
    return {
        id, label, color, gpsPoints,
        gpsIdx: startIdx,
        virtualMs: gpsPoints.length > 0 ? gpsPoints[startIdx].timestampMs : 0,
        distanceM: ROUTE_TOTAL_M * startFraction,
        currentSpeedKmh: 0,
    };
}

/** Mutates cursor in-place and returns position for zero-allocation hot path */
function advanceCursorMut(cursor: TramCursor, realDeltaMs: number): {
    lat: number; lng: number; heading: number; speedKmh: number;
} {
    const { gpsPoints } = cursor;
    if (gpsPoints.length === 0 || ROUTE_TOTAL_M === 0) {
        return { lat: 0, lng: 0, heading: 0, speedKmh: 0 };
    }

    cursor.virtualMs += realDeltaMs * SPEED;

    // Skip large gaps
    while (cursor.gpsIdx < gpsPoints.length - 1) {
        const gap = gpsPoints[cursor.gpsIdx + 1].timestampMs - gpsPoints[cursor.gpsIdx].timestampMs;
        if (gap > MAX_GAP_MS && cursor.virtualMs > gpsPoints[cursor.gpsIdx].timestampMs + MAX_GAP_MS) {
            cursor.virtualMs += gap - MAX_GAP_MS;
            cursor.gpsIdx++;
        } else {
            break;
        }
    }

    while (cursor.gpsIdx < gpsPoints.length - 2 && cursor.virtualMs >= gpsPoints[cursor.gpsIdx + 1].timestampMs) {
        cursor.gpsIdx++;
    }

    if (cursor.gpsIdx >= gpsPoints.length - 1) {
        cursor.gpsIdx = 0;
        cursor.virtualMs = gpsPoints[0].timestampMs;
    }

    const a = gpsPoints[cursor.gpsIdx];
    const b = gpsPoints[cursor.gpsIdx + 1] ?? a;
    const segDuration = b.timestampMs - a.timestampMs || 1;
    const t = Math.max(0, Math.min(1, (cursor.virtualMs - a.timestampMs) / segDuration));

    const speedKmh = a.speed_kmh + (b.speed_kmh - a.speed_kmh) * t;
    const speedMPerMs = (speedKmh * 1000) / 3_600_000;

    cursor.distanceM += speedMPerMs * realDeltaMs * SPEED;
    if (cursor.distanceM >= ROUTE_TOTAL_M) {
        cursor.distanceM %= ROUTE_TOTAL_M;
    }
    cursor.currentSpeedKmh = speedKmh;

    return { ...positionAtDistance(cursor.distanceM), speedKmh };
}

/* ------------------------------------------------------------------ */
/*  GeoJSON builder — reuses a single object to reduce GC pressure     */
/* ------------------------------------------------------------------ */

function buildVehicleFeature(
    id: string, label: string, lng: number, lat: number, heading: number,
) {
    const rawHeading = ((heading % 360) + 360) % 360;

    return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [lng, lat] },
        properties: {
            icon_image: "Vehicle",
            icon_rotate: 0,
            id,
            label,
            direction: "outbound",
            status: "fresh",
            last_updated: "",
            heading: rawHeading,
        },
    };
}

/* ------------------------------------------------------------------ */
/*  The hook                                                           */
/* ------------------------------------------------------------------ */

export type MapSourceUpdater = (geojson: object) => void;

export interface GpsReplayState {
    vehicles: Vehicle[];
    telemetry: VehicleTelemetry[];
    trails: { coordinates: [number, number][]; color: string }[];
    loading: boolean;
    /** Call this with the map's vehicle GeoJSON source setter for direct updates */
    setMapUpdater: (updater: MapSourceUpdater | null) => void;
}

export function useGpsReplay(initialBearing: number = 0): GpsReplayState {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [telemetry, setTelemetry] = useState<VehicleTelemetry[]>([]);
    const [loading, setLoading] = useState(true);
    const cursorsRef = useRef<TramCursor[]>([]);
    const lastFrameRef = useRef<number>(0);
    const rafRef = useRef<number>(0);
    const mapUpdaterRef = useRef<MapSourceUpdater | null>(null);
    const lastTelemetryUpdate = useRef<number>(0);
    const bearingRef = useRef(initialBearing);

    const setMapUpdater = useCallback((updater: MapSourceUpdater | null) => {
        mapUpdaterRef.current = updater;
    }, []);

    useEffect(() => {
        bearingRef.current = initialBearing;
    }, [initialBearing]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            const offsets = [0, 1 / 3, 2 / 3];
            const results = await Promise.all(
                TRAM_FILES.map(async (tram, i) => {
                    const res = await fetch(tram.url);
                    const csv = await res.text();
                    const points = parseTramCsvFiltered(csv);
                    return initCursor(tram.id, tram.label, tram.color, points, offsets[i]);
                }),
            );
            if (cancelled) return;
            cursorsRef.current = results;
            setLoading(false);
            lastFrameRef.current = performance.now();
        }

        load();
        return () => { cancelled = true; };
    }, []);

    const tick = useCallback(() => {
        const now = performance.now();
        const delta = Math.min(now - lastFrameRef.current, 100); // cap to avoid huge jumps
        lastFrameRef.current = now;

        const features: ReturnType<typeof buildVehicleFeature>[] = [];
        const newTelemetry: VehicleTelemetry[] = [];
        const newVehicles: Vehicle[] = [];

        for (const cursor of cursorsRef.current) {
            const pos = advanceCursorMut(cursor, delta);
            features.push(buildVehicleFeature(cursor.id, cursor.label, pos.lng, pos.lat, pos.heading));
            newTelemetry.push(computeTelemetry(cursor.id, cursor.label, cursor.distanceM, pos.speedKmh));
            newVehicles.push({
                id: cursor.id,
                label: cursor.label,
                latitude: pos.lat,
                longitude: pos.lng,
                heading: pos.heading,
                direction: "outbound",
                last_updated: "",
                status: "fresh",
            });
        }

        // FAST PATH: update map source directly, bypassing React
        const updater = mapUpdaterRef.current;
        if (updater) {
            updater({ type: "FeatureCollection", features });
        }

        // SLOW PATH: update React state for panel — throttled
        if (now - lastTelemetryUpdate.current > TELEMETRY_THROTTLE_MS) {
            lastTelemetryUpdate.current = now;
            setTelemetry(newTelemetry);
            setVehicles(newVehicles);
        }

        rafRef.current = requestAnimationFrame(tick);
    }, []);

    useEffect(() => {
        if (loading) return;
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [loading, tick]);

    const trails = useRef<{ coordinates: [number, number][]; color: string }[]>([]).current;

    return { vehicles, telemetry, trails, loading, setMapUpdater };
}
