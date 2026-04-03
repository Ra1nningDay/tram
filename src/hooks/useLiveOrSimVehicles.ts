import { useState, useEffect, useCallback, useRef } from "react";
import type { Vehicle } from "../features/shuttle/api";
import { parseTramCsvFiltered } from "../lib/csv-parser";
import { haversineM } from "../lib/geo/distance";
import { deriveVehicleStatus } from "../lib/vehicles/status";
import { useVehicleStream } from "../features/shuttle/useVehicleStream";
import { shouldUseLiveVehicleFeed, type VehicleDataMode } from "../features/shuttle/live-mode";
import {
    TRAM_FILES,
    ROUTE_TOTAL_M,
    positionAtDistance,
    computeTelemetry,
    buildVehicleFeature,
    projectGpsToRoute,
    initCursor,
    type VehicleTelemetry,
    type GpsReplayState,
    type MapSourceUpdater,
    type TramCursor,
} from "./useGpsReplay";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const SPEED = 1;
const MAX_GAP_MS = 10_000;
const TELEMETRY_THROTTLE_MS = 500;

/** Default speed used for dead-reckoning when we have no speed signal */
const DEFAULT_SPEED_KMH = 20;

/* ------------------------------------------------------------------ */
/*  Live cursor — tracks each real vehicle between GPS updates         */
/* ------------------------------------------------------------------ */

export type LiveCursor = {
    id: string;
    label: string;
    /** Latest raw GPS coordinate from the driver / hardware feed */
    latitude: number;
    longitude: number;
    /** Route-projected distance is still used for telemetry such as next stop */
    routeDistanceM: number;
    /** Derived speed in km/h from consecutive GPS snapshots */
    speedKmh: number;
    heading: number;
    crowding?: Vehicle["crowding"];
    direction: Vehicle["direction"];
    status: Vehicle["status"];
    last_updated: string;
    /** When the last GPS update was received (ms) */
    lastGpsMs: number;
};

export function syncLiveCursors(
    liveCursors: Map<string, LiveCursor>,
    streamVehicles: Vehicle[],
    nowMs: number,
) {
    const activeVehicleIds = new Set<string>();

    for (const v of streamVehicles) {
        activeVehicleIds.add(v.id);
        const newRouteDistanceM = projectGpsToRoute(v.latitude, v.longitude);
        const existing = liveCursors.get(v.id);

        let speedKmh = DEFAULT_SPEED_KMH;
        let heading =
            typeof v.heading === "number"
                ? normalizeHeading(v.heading)
                : existing?.heading ?? 0;

        if (existing) {
            const deltaD = haversineM(
                [existing.longitude, existing.latitude],
                [v.longitude, v.latitude],
            );
            const deltaT = (nowMs - existing.lastGpsMs) / 1000;

            if (deltaT > 0 && deltaD < 1_000) {
                speedKmh = Math.min((deltaD / deltaT) * 3.6, 80);
            } else {
                speedKmh = existing.speedKmh;
            }

            if (typeof v.heading !== "number" && deltaD > 0.5) {
                heading = normalizeHeading(
                    getHeading(
                        [existing.longitude, existing.latitude],
                        [v.longitude, v.latitude],
                    ),
                );
            }
        }

        liveCursors.set(v.id, {
            id: v.id,
            label: v.label ?? v.id,
            latitude: v.latitude,
            longitude: v.longitude,
            routeDistanceM: newRouteDistanceM,
            speedKmh,
            heading,
            crowding: v.crowding,
            direction: v.direction,
            status: v.status,
            last_updated: v.last_updated,
            lastGpsMs: nowMs,
        });
    }

    for (const id of liveCursors.keys()) {
        if (!activeVehicleIds.has(id)) {
            liveCursors.delete(id);
        }
    }
}

export function getVisibleLiveCursors(
    liveCursors: Map<string, LiveCursor>,
    nowMs: number,
): LiveCursor[] {
    const hiddenIds: string[] = [];
    const visibleCursors: LiveCursor[] = [];

    for (const cursor of liveCursors.values()) {
        const status = deriveVehicleStatus(cursor.last_updated, nowMs);

        if (status === "hidden") {
            hiddenIds.push(cursor.id);
            continue;
        }

        visibleCursors.push({
            ...cursor,
            status,
        });
    }

    for (const id of hiddenIds) {
        liveCursors.delete(id);
    }

    return visibleCursors;
}

function normalizeHeading(headingDeg: number): number {
    const heading = headingDeg % 360;
    return heading < 0 ? heading + 360 : heading;
}

function getHeading(from: [number, number], to: [number, number]): number {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    return (Math.atan2(dx, dy) * 180) / Math.PI;
}

/* ------------------------------------------------------------------ */
/*  Simulation cursor advance (mirrors useGpsReplay internals)         */
/* ------------------------------------------------------------------ */

/** advanceCursorMut duplicated to avoid exporting it from the original hook */
function advanceCursorMut(
    cursor: TramCursor,
    realDeltaMs: number,
): { lat: number; lng: number; heading: number; speedKmh: number } {
    const { gpsPoints } = cursor;
    if (gpsPoints.length === 0 || ROUTE_TOTAL_M === 0) {
        return { lat: 0, lng: 0, heading: 0, speedKmh: 0 };
    }

    cursor.virtualMs += realDeltaMs * SPEED;

    while (cursor.gpsIdx < gpsPoints.length - 1) {
        const gap =
            gpsPoints[cursor.gpsIdx + 1].timestampMs -
            gpsPoints[cursor.gpsIdx].timestampMs;
        if (
            gap > MAX_GAP_MS &&
            cursor.virtualMs > gpsPoints[cursor.gpsIdx].timestampMs + MAX_GAP_MS
        ) {
            cursor.virtualMs += gap - MAX_GAP_MS;
            cursor.gpsIdx++;
        } else {
            break;
        }
    }

    while (
        cursor.gpsIdx < gpsPoints.length - 2 &&
        cursor.virtualMs >= gpsPoints[cursor.gpsIdx + 1].timestampMs
    ) {
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
/*  The hook                                                            */
/* ------------------------------------------------------------------ */

/**
 * useLiveOrSimVehicles
 *
 * Drop-in replacement for `useGpsReplay` that transparently switches
 * between real-time SSE data and the CSV simulation fallback:
 *
 * • **Live mode** (SSE connected + vehicles present):
 *     Uses the latest raw GPS coordinates for map position while still
 *     projecting onto the route polyline for ETA / next-stop telemetry.
 *
 * • **Simulation mode** (no live data):
 *     Falls back to the original CSV-replay animation unchanged.
 */
export function useLiveOrSimVehicles(
    initialBearing: number = 0,
    mode: VehicleDataMode = "simulate",
): GpsReplayState {
    // ── SSE stream ────────────────────────────────────────────────────
    const { vehicles: streamVehicles } = useVehicleStream(mode === "live");
    const [hasSeenLiveSnapshot, setHasSeenLiveSnapshot] = useState(false);
    const hasLiveData = shouldUseLiveVehicleFeed(
        mode,
        streamVehicles.length,
        hasSeenLiveSnapshot,
    );

    // ── Shared map updater ref (stable across mode switches) ──────────
    const mapUpdaterRef = useRef<MapSourceUpdater | null>(null);

    const setMapUpdater = useCallback((updater: MapSourceUpdater | null) => {
        mapUpdaterRef.current = updater;
    }, []);

    // ── React state (for VehiclePanel, search, ETA) ───────────────────
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [telemetry, setTelemetry] = useState<VehicleTelemetry[]>([]);
    const [loading, setLoading] = useState(true);

    // ── Simulation state ──────────────────────────────────────────────
    const simCursorsRef = useRef<TramCursor[]>([]);
    const simLoadedRef = useRef(false);
    const [simLoaded, setSimLoaded] = useState(false);

    // ── Live cursor map ───────────────────────────────────────────────
    const liveCursorsRef = useRef<Map<string, LiveCursor>>(new Map());

    // ── Animation refs ────────────────────────────────────────────────
    const rafRef = useRef<number>(0);
    const lastFrameRef = useRef<number>(0);
    const lastTelemetryRef = useRef<number>(0);
    const bearingRef = useRef(initialBearing);

    useEffect(() => {
        bearingRef.current = initialBearing;
    }, [initialBearing]);

    useEffect(() => {
        if (mode !== "live" || streamVehicles.length === 0) {
            return;
        }

        setHasSeenLiveSnapshot(true);
    }, [mode, streamVehicles.length]);

    // ── Load CSV for simulation fallback ─────────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function load() {
            const offsets = [0, 1 / 3, 2 / 3];
            const results = await Promise.all(
                TRAM_FILES.map(async (tram, i) => {
                    const res = await fetch(tram.url);
                    const csv = await res.text();
                    const points = parseTramCsvFiltered(csv);
                    return initCursor(tram.id, tram.label, tram.color, points, offsets[i] ?? 0);
                }),
            );
            if (cancelled) return;
            simCursorsRef.current = results;
            simLoadedRef.current = true;
            setSimLoaded(true);
            if (!hasLiveData) {
                setLoading(false);
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    // ── Snap live GPS positions to route when SSE updates arrive ──────
    useEffect(() => {
        if (!hasLiveData) return;

        const nowMs = Date.now();
        syncLiveCursors(liveCursorsRef.current, streamVehicles, nowMs);

        // Show as loaded immediately once we have live data
        setLoading(false);
    }, [streamVehicles, hasLiveData]);

    // ── Animation tick ────────────────────────────────────────────────
    const tick = useCallback(() => {
        const now = performance.now();
        const delta = Math.min(now - lastFrameRef.current, 100);
        lastFrameRef.current = now;
        const nowMs = Date.now();

        const features: ReturnType<typeof buildVehicleFeature>[] = [];
        const newTelemetry: VehicleTelemetry[] = [];
        const newVehicles: Vehicle[] = [];

        if (hasLiveData) {
            // ── Live mode ─────────────────────────────────────────────
            for (const cursor of getVisibleLiveCursors(liveCursorsRef.current, nowMs)) {
                features.push(
                    buildVehicleFeature(
                        cursor.id,
                        cursor.label,
                        cursor.longitude,
                        cursor.latitude,
                        cursor.heading,
                    ),
                );
                newTelemetry.push(
                    computeTelemetry(
                        cursor.id,
                        cursor.label,
                        cursor.routeDistanceM,
                        cursor.speedKmh,
                        cursor.crowding,
                    ),
                );
                newVehicles.push({
                    id: cursor.id,
                    label: cursor.label,
                    latitude: cursor.latitude,
                    longitude: cursor.longitude,
                    heading: cursor.heading,
                    direction: cursor.direction,
                    last_updated: cursor.last_updated,
                    status: cursor.status,
                    crowding: cursor.crowding,
                });
            }
        } else {
            // ── Simulation mode ───────────────────────────────────────
            if (!simLoadedRef.current) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }

            for (const cursor of simCursorsRef.current) {
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
        }

        // Fast path: update MapLibre GeoJSON source directly (bypasses React)
        const updater = mapUpdaterRef.current;
        if (updater) {
            updater({ type: "FeatureCollection", features });
        }

        // Slow path: update React state for VehiclePanel (throttled)
        if (now - lastTelemetryRef.current > TELEMETRY_THROTTLE_MS) {
            lastTelemetryRef.current = now;
            setTelemetry(newTelemetry);
            setVehicles(newVehicles);
        }

        rafRef.current = requestAnimationFrame(tick);
    }, [hasLiveData]);

    // ── Start / restart animation when mode or data changes ──────────
    useEffect(() => {
        cancelAnimationFrame(rafRef.current);

        // In sim mode, wait until CSV is loaded
        if (!hasLiveData && !simLoadedRef.current) return;

        lastFrameRef.current = performance.now();
        rafRef.current = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(rafRef.current);
    }, [hasLiveData, tick, simLoaded]);

    return {
        vehicles,
        telemetry,
        trails: [],
        loading,
        setMapUpdater,
    };
}
