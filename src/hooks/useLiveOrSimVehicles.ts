import { useState, useEffect, useCallback, useRef } from "react";
import type { Vehicle, VehicleTelemetry } from "../features/shuttle/api";
import { parseTramCsvFiltered } from "../lib/csv-parser";
import { deriveVehicleStatus } from "../lib/vehicles/status";
import {
    BALANCED_IDLE_INTERVAL_MS,
    BALANCED_MOVING_INTERVAL_MS,
    getBalancedExpectedIntervalMs,
} from "../lib/vehicles/balanced-profile";
import { useVehicleStream } from "../features/shuttle/useVehicleStream";
import { shouldUseLiveVehicleFeed, type VehicleDataMode } from "../features/shuttle/live-mode";
import {
    TRAM_FILES,
    ROUTE_TOTAL_M,
    positionAtDistance,
    computeTelemetry,
    buildVehicleFeature,
    initCursor,
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
export const LIVE_MOVING_EXPECTED_INTERVAL_MS = BALANCED_MOVING_INTERVAL_MS;
export const LIVE_IDLE_EXPECTED_INTERVAL_MS = BALANCED_IDLE_INTERVAL_MS;
export const LIVE_FREEZE_AFTER_MULTIPLIER = 1.5;

export type LiveMotionState = "interpolating" | "extrapolating" | "frozen";

/* ------------------------------------------------------------------ */
/*  Live cursor — tracks each real vehicle between GPS updates         */
/* ------------------------------------------------------------------ */

export type LiveCursor = {
    id: string;
    label: string;
    /** Latest raw GPS coordinate from the driver / hardware feed */
    latitude: number;
    longitude: number;
    /** Smoothed marker start point for the current animation window */
    interpolationStartLatitude: number;
    interpolationStartLongitude: number;
    expectedIntervalMs: number;
    /** Route-projected distance is still used for telemetry such as next stop */
    routeDistanceM: number;
    /** Server-derived or device-reported speed in km/h */
    speedKmh: number;
    heading: number;
    matchedPosition?: Vehicle["matchedPosition"];
    etaConfidence?: Vehicle["etaConfidence"];
    crowding?: Vehicle["crowding"];
    direction: Vehicle["direction"];
    status: Vehicle["status"];
    last_updated: string;
    /** When the last GPS update was received (ms) */
    lastGpsMs: number;
};

export type VisibleLiveCursor = LiveCursor & {
    displayLatitude: number;
    displayLongitude: number;
    displayStatus: Vehicle["status"];
    isMotionDelayed: boolean;
    motionState: LiveMotionState;
};

export function getExpectedLiveIntervalMs(speedKmh: number): number {
    return getBalancedExpectedIntervalMs(speedKmh);
}

function lerp(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
}

export function resolveLiveCursorDisplay(
    cursor: LiveCursor,
    nowMs: number,
): {
    latitude: number;
    longitude: number;
    status: Vehicle["status"];
    isMotionDelayed: boolean;
    motionState: LiveMotionState;
} {
    const expectedIntervalMs = Math.max(1, cursor.expectedIntervalMs);
    const elapsedSinceGpsMs = Math.max(0, nowMs - cursor.lastGpsMs);
    const interpolationProgress = Math.min(elapsedSinceGpsMs / expectedIntervalMs, 1);
    const deltaLatitude = cursor.latitude - cursor.interpolationStartLatitude;
    const deltaLongitude = cursor.longitude - cursor.interpolationStartLongitude;

    if (elapsedSinceGpsMs <= expectedIntervalMs) {
        return {
            latitude: lerp(
                cursor.interpolationStartLatitude,
                cursor.latitude,
                interpolationProgress,
            ),
            longitude: lerp(
                cursor.interpolationStartLongitude,
                cursor.longitude,
                interpolationProgress,
            ),
            status: cursor.status,
            isMotionDelayed: false,
            motionState: "interpolating",
        };
    }

    const freezeAfterMs = expectedIntervalMs * LIVE_FREEZE_AFTER_MULTIPLIER;
    const extrapolationRatio = Math.min(
        (elapsedSinceGpsMs - expectedIntervalMs) / expectedIntervalMs,
        LIVE_FREEZE_AFTER_MULTIPLIER - 1,
    );
    const extrapolatedLatitude = cursor.latitude + deltaLatitude * extrapolationRatio;
    const extrapolatedLongitude = cursor.longitude + deltaLongitude * extrapolationRatio;

    if (elapsedSinceGpsMs <= freezeAfterMs) {
        return {
            latitude: extrapolatedLatitude,
            longitude: extrapolatedLongitude,
            status: cursor.status,
            isMotionDelayed: false,
            motionState: "extrapolating",
        };
    }

    return {
        latitude: extrapolatedLatitude,
        longitude: extrapolatedLongitude,
        status: cursor.status === "fresh" ? "delayed" : cursor.status,
        isMotionDelayed: true,
        motionState: "frozen",
    };
}

export function syncLiveCursors(
    liveCursors: Map<string, LiveCursor>,
    streamVehicles: Vehicle[],
    nowMs: number,
) {
    const activeVehicleIds = new Set<string>();

    for (const v of streamVehicles) {
        activeVehicleIds.add(v.id);
        const existing = liveCursors.get(v.id);
        const existingDisplay = existing
            ? resolveLiveCursorDisplay(existing, nowMs)
            : null;
        const speedKmh =
            typeof v.speedKph === "number"
                ? v.speedKph
                : existing?.speedKmh ?? 0;
        const heading =
            typeof v.heading === "number"
                ? normalizeHeading(v.heading)
                : existing?.heading ?? 0;
        const routeDistanceM =
            typeof v.routeDistanceM === "number"
                ? v.routeDistanceM
                : existing?.routeDistanceM ?? 0;
        const matchedPosition =
            v.matchedPosition ??
            existing?.matchedPosition ??
            { lng: v.longitude, lat: v.latitude };
        const etaConfidence =
            typeof v.etaConfidence === "number"
                ? v.etaConfidence
                : existing?.etaConfidence;

        liveCursors.set(v.id, {
            id: v.id,
            label: v.label ?? v.id,
            latitude: v.latitude,
            longitude: v.longitude,
            interpolationStartLatitude: existingDisplay?.latitude ?? v.latitude,
            interpolationStartLongitude: existingDisplay?.longitude ?? v.longitude,
            expectedIntervalMs: getExpectedLiveIntervalMs(speedKmh),
            routeDistanceM,
            speedKmh,
            heading,
            matchedPosition,
            etaConfidence,
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
): VisibleLiveCursor[] {
    const hiddenIds: string[] = [];
    const visibleCursors: VisibleLiveCursor[] = [];

    for (const cursor of liveCursors.values()) {
        const status = deriveVehicleStatus(cursor.last_updated, nowMs);

        if (status === "hidden") {
            hiddenIds.push(cursor.id);
            continue;
        }

        const display = resolveLiveCursorDisplay(
            {
                ...cursor,
                status,
            },
            nowMs,
        );

        visibleCursors.push({
            ...cursor,
            status,
            displayLatitude: display.latitude,
            displayLongitude: display.longitude,
            displayStatus: display.status,
            isMotionDelayed: display.isMotionDelayed,
            motionState: display.motionState,
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
 * Drop-in replacement for `useGpsReplay` that cleanly separates
 * real-time SSE data from the CSV simulation mode:
 *
 * • **Live mode**:
 *     Uses the driver GPS/SSE feed only. When no live vehicles exist yet,
 *     the map stays empty instead of falling back to simulation.
 *
 * • **Simulation mode**:
 *     Loads and replays the CSV demo feed unchanged.
 */
export function useLiveOrSimVehicles(
    initialBearing: number = 0,
    mode: VehicleDataMode = "simulate",
): GpsReplayState {
    const isLiveMode = shouldUseLiveVehicleFeed(mode);

    // ── SSE stream ────────────────────────────────────────────────────
    const {
        vehicles: streamVehicles,
        telemetryByVehicleId: streamTelemetryByVehicleId,
        hasReceivedSnapshot,
    } = useVehicleStream(isLiveMode);

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
    const streamTelemetryByVehicleIdRef = useRef<Record<string, VehicleTelemetry>>({});

    // ── Animation refs ────────────────────────────────────────────────
    const rafRef = useRef<number>(0);
    const lastFrameRef = useRef<number>(0);
    const lastTelemetryRef = useRef<number>(0);
    const bearingRef = useRef(initialBearing);

    useEffect(() => {
        bearingRef.current = initialBearing;
    }, [initialBearing]);

    useEffect(() => {
        streamTelemetryByVehicleIdRef.current = streamTelemetryByVehicleId;
    }, [streamTelemetryByVehicleId]);

    // ── Load CSV for simulation fallback ─────────────────────────────
    useEffect(() => {
        if (isLiveMode || simLoadedRef.current) {
            if (!isLiveMode && simLoadedRef.current) {
                setLoading(false);
            }
            return;
        }

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
            if (!isLiveMode) {
                setLoading(false);
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, [isLiveMode]);

    useEffect(() => {
        if (!isLiveMode) {
            setLoading(!simLoadedRef.current);
            return;
        }

        if (!hasReceivedSnapshot) {
            liveCursorsRef.current.clear();
            setVehicles([]);
            setTelemetry([]);
            mapUpdaterRef.current?.({
                type: "FeatureCollection",
                features: [],
            });
        }

        setLoading(!hasReceivedSnapshot);
    }, [hasReceivedSnapshot, isLiveMode]);

    // ── Snap live GPS positions to route when SSE updates arrive ──────
    useEffect(() => {
        if (!isLiveMode) return;

        const nowMs = Date.now();
        syncLiveCursors(liveCursorsRef.current, streamVehicles, nowMs);

        if (hasReceivedSnapshot) {
            setLoading(false);
        }
    }, [streamVehicles, hasReceivedSnapshot, isLiveMode]);

    // ── Animation tick ────────────────────────────────────────────────
    const tick = useCallback(() => {
        const now = performance.now();
        const delta = Math.min(now - lastFrameRef.current, 100);
        lastFrameRef.current = now;
        const nowMs = Date.now();

        const features: ReturnType<typeof buildVehicleFeature>[] = [];
        const newTelemetry: VehicleTelemetry[] = [];
        const newVehicles: Vehicle[] = [];

        if (isLiveMode) {
            // ── Live mode ─────────────────────────────────────────────
            for (const cursor of getVisibleLiveCursors(liveCursorsRef.current, nowMs)) {
                features.push(
                    buildVehicleFeature(
                        cursor.id,
                        cursor.label,
                        cursor.displayLongitude,
                        cursor.displayLatitude,
                        cursor.heading,
                    ),
                );
                // Keep telemetry on the server-matched route progress, while
                // the map marker uses the smoothed raw GPS display position.
                newTelemetry.push(
                    streamTelemetryByVehicleIdRef.current[cursor.id] ??
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
                    latitude: cursor.displayLatitude,
                    longitude: cursor.displayLongitude,
                    heading: cursor.heading,
                    direction: cursor.direction,
                    last_updated: cursor.last_updated,
                    status: cursor.displayStatus,
                    crowding: cursor.crowding,
                    speedKph: cursor.speedKmh,
                    routeDistanceM: cursor.routeDistanceM,
                    matchedPosition: cursor.matchedPosition,
                    etaConfidence: cursor.etaConfidence,
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
    }, [isLiveMode]);

    // ── Start / restart animation when mode or data changes ──────────
    useEffect(() => {
        cancelAnimationFrame(rafRef.current);

        // In sim mode, wait until CSV is loaded
        if (!isLiveMode && !simLoadedRef.current) return;

        lastFrameRef.current = performance.now();
        rafRef.current = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(rafRef.current);
    }, [isLiveMode, tick, simLoaded]);

    return {
        vehicles,
        telemetry,
        trails: [],
        loading,
        setMapUpdater,
    };
}
