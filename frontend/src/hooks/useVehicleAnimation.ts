import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Route, Stop, Vehicle } from "../features/shuttle/api";
import shuttleData from "../data/shuttle-data.json";

// Calculate distance between two points (simplified)
function getDistance(p1: [number, number], p2: [number, number]): number {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    return Math.sqrt(dx * dx + dy * dy);
}

// Interpolate between two points
function interpolate(p1: [number, number], p2: [number, number], t: number): [number, number] {
    return [
        p1[0] + (p2[0] - p1[0]) * t,
        p1[1] + (p2[1] - p1[1]) * t,
    ];
}

// Calculate heading from one point to another
function getHeading(from: [number, number], to: [number, number]): number {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    return (Math.atan2(dx, dy) * 180) / Math.PI;
}

function normalizeHeading(headingDeg: number): number {
    // MapLibre expects degrees; keep in [0, 360) to make style expressions predictable.
    const h = headingDeg % 360;
    return h < 0 ? h + 360 : h;
}

function clamp01(v: number): number {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
}

type SegmentProjection = {
    t: number; // 0-1
    point: [number, number];
    dist2: number;
};

function projectPointToSegment(p: [number, number], a: [number, number], b: [number, number]): SegmentProjection {
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const apx = p[0] - a[0];
    const apy = p[1] - a[1];
    const denom = abx * abx + aby * aby;
    const t = denom <= 1e-18 ? 0 : clamp01((apx * abx + apy * aby) / denom);
    const point: [number, number] = [a[0] + abx * t, a[1] + aby * t];
    const dx = p[0] - point[0];
    const dy = p[1] - point[1];
    return { t, point, dist2: dx * dx + dy * dy };
}

type PolylineProjection = {
    segmentIndex: number; // segment from i -> i+1 (wrapping)
    t: number; // 0-1 on that segment
    point: [number, number];
    dist2: number;
};

function projectPointToPolyline(coords: [number, number][], p: [number, number]): PolylineProjection {
    let best: PolylineProjection = { segmentIndex: 0, t: 0, point: coords[0], dist2: Number.POSITIVE_INFINITY };
    const len = coords.length;
    for (let i = 0; i < len; i++) {
        const j = (i + 1) % len;
        const a = coords[i];
        const b = coords[j];
        const proj = projectPointToSegment(p, a, b);
        if (proj.dist2 < best.dist2) {
            best = { segmentIndex: i, t: proj.t, point: proj.point, dist2: proj.dist2 };
        }
    }
    return best;
}

type AnimatedVehicle = {
    id: string;
    label: string;
    position: [number, number];
    heading: number;
    routeIndex: number;
    progress: number; // 0-1 between current and next point
    speed: number; // Points per tick
    baseSpeed: number; // Normal cruising speed
    direction: "outbound" | "inbound";
    status: Vehicle["status"];
    dwellTime: number; // Ticks remaining to dwell
};

type UseVehicleAnimationOptions = {
    enabled?: boolean;
    route?: Route;
    stops?: Stop[];
};

function getRouteCoordinatesFromRoute(route: Route | undefined, direction: "outbound" | "inbound"): [number, number][] | null {
    const match = route?.directions?.find((d) => d.direction === direction);
    const coords = match?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    return coords as [number, number][];
}

function getFirstRouteCoordinatesFromRoute(route?: Route): [number, number][] | null {
    const coords = route?.directions?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    return coords as [number, number][];
}

function getFallbackRouteCoordinates(): [number, number][] {
    return shuttleData.routes[0].directions[0].geometry.coordinates as [number, number][];
}

function getFallbackStops(): Stop[] {
    // JSON typing usually widens literals to `string`; normalize to our Stop union types.
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

export function useVehicleAnimation(options: UseVehicleAnimationOptions = {}) {
    const enabled = options.enabled ?? true;
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const animatedVehiclesRef = useRef<AnimatedVehicle[]>([]);
    const animationFrameRef = useRef<number | null>(null);

    const updateVehicleState = useCallback(() => {
        const vehicleData: Vehicle[] = animatedVehiclesRef.current.map((v) => ({
            id: v.id,
            label: v.label,
            latitude: v.position[1],
            longitude: v.position[0],
            heading: v.heading,
            direction: v.direction,
            last_updated: new Date().toISOString(),
            status: v.status,
        }));
        setVehicles(vehicleData);
    }, []);

    const routeCoordinatesByDirection = useMemo(() => {
        // Prefer the actual route being displayed (from API/mock hooks) so vehicles follow "the set route".
        const fallback = getFallbackRouteCoordinates();
        const outbound =
            getRouteCoordinatesFromRoute(options.route, "outbound") ??
            getFirstRouteCoordinatesFromRoute(options.route) ??
            fallback;
        const inboundFromRoute = getRouteCoordinatesFromRoute(options.route, "inbound");
        const inbound = inboundFromRoute && inboundFromRoute.length >= 2 ? inboundFromRoute : [...outbound].reverse();
        return { outbound, inbound };
    }, [options.route]);

    type StopAnchor = { id: string; t: number; snap: [number, number] };

    const stopAnchorsByDirection = useMemo(() => {
        const STOP_SNAP_MAX = 0.00008; // ~9m at this latitude; snap to exact stop when it's close enough to the route
        const EPS = 1e-6;

        const allStops = options.stops ?? getFallbackStops();
        const outboundStops = allStops.filter((s) => s.direction !== "inbound");
        const inboundStopsRaw = allStops.filter((s) => s.direction === "inbound");
        const inboundStops = inboundStopsRaw.length > 0 ? inboundStopsRaw : outboundStops;

        const build = (coords: [number, number][], stopsForDirection: Stop[]) => {
            const bySegment: StopAnchor[][] = Array.from({ length: coords.length }, () => []);
            stopsForDirection.forEach((s) => {
                const stopPoint: [number, number] = [s.longitude, s.latitude];
                const proj = projectPointToPolyline(coords, stopPoint);

                // If projection lands exactly at the start of a segment, treat it as the end of the previous segment.
                // This makes "arrive at stop" detection robust across segment boundaries.
                let segmentIndex = proj.segmentIndex;
                let t = proj.t;
                if (t <= EPS) {
                    segmentIndex = (segmentIndex - 1 + coords.length) % coords.length;
                    t = 1;
                }

                const snap = proj.dist2 <= STOP_SNAP_MAX * STOP_SNAP_MAX ? stopPoint : proj.point;
                bySegment[segmentIndex].push({ id: s.id, t, snap });
            });

            bySegment.forEach((arr) => arr.sort((a, b) => a.t - b.t));
            return bySegment;
        };

        return {
            outbound: build(routeCoordinatesByDirection.outbound, outboundStops),
            inbound: build(routeCoordinatesByDirection.inbound, inboundStops),
        };
    }, [options.stops, routeCoordinatesByDirection]);

    // Initialize vehicles at different points on the route
    useEffect(() => {
        const outboundCoords = routeCoordinatesByDirection.outbound;
        const inboundCoords = routeCoordinatesByDirection.inbound;
        if (outboundCoords.length < 2) return;

        // Speed is distance per tick (degrees). Keep consistent speed across segments.
        const BASE_SPEED = 0.0000013;
        const SPEED_VARIANCE = 0.0000004;

        const pickIndex = (coords: [number, number][], fraction: number) => Math.floor(coords.length * fraction) % coords.length;

        const initialVehicles: AnimatedVehicle[] = [
            {
                id: "vehicle-1",
                label: "BU-01",
                position: outboundCoords[0],
                heading: 0,
                routeIndex: 0,
                progress: 0,
                speed: BASE_SPEED,
                baseSpeed: BASE_SPEED + Math.random() * SPEED_VARIANCE,
                direction: "outbound",
                status: "fresh",
                dwellTime: 0,
            },
            {
                id: "vehicle-2",
                label: "BU-02",
                position: outboundCoords[pickIndex(outboundCoords, 1 / 3)],
                heading: 0,
                routeIndex: pickIndex(outboundCoords, 1 / 3),
                progress: 0,
                speed: BASE_SPEED,
                baseSpeed: BASE_SPEED + Math.random() * SPEED_VARIANCE,
                direction: "outbound",
                status: "fresh",
                dwellTime: 0,
            },
            {
                id: "vehicle-3",
                label: "BU-03",
                position: inboundCoords[pickIndex(inboundCoords, 2 / 3)],
                heading: 0,
                routeIndex: pickIndex(inboundCoords, 2 / 3),
                progress: 0,
                speed: BASE_SPEED,
                baseSpeed: BASE_SPEED + Math.random() * SPEED_VARIANCE,
                direction: "inbound",
                status: "fresh",
                dwellTime: 0,
            },
        ];

        animatedVehiclesRef.current = initialVehicles;
        updateVehicleState();
    }, [routeCoordinatesByDirection, updateVehicleState]);

    const animate = useCallback(() => {
        animatedVehiclesRef.current = animatedVehiclesRef.current.map((vehicle) => {
            let { routeIndex, progress, position, heading, speed, dwellTime, status } = vehicle;
            const { baseSpeed } = vehicle;

            const coords =
                vehicle.direction === "inbound" ? routeCoordinatesByDirection.inbound : routeCoordinatesByDirection.outbound;
            const len = coords.length;
            if (len < 2) return vehicle;

            const stopAnchorsBySegment =
                vehicle.direction === "inbound" ? stopAnchorsByDirection.inbound : stopAnchorsByDirection.outbound;

            const getNextIndex = (idx: number) => {
                const next = idx + 1;
                return next >= len ? 0 : next;
            };

            // Handle dwelling (stops)
            if (dwellTime > 0) {
                dwellTime -= 1;
                status = "delayed"; // Show as delayed/waiting while dwelling
                speed = 0;
                // Keep the snapped stop position while dwelling (do not drift/tilt).

                // Finished dwelling
                if (dwellTime <= 0) {
                    status = "fresh";
                    speed = baseSpeed;
                }

                return { ...vehicle, dwellTime, status, speed, position };
            }

            // Normal movement
            status = "fresh";
            speed = baseSpeed;

            let didStop = false;

            // Move along the polyline by "speed" distance, correctly handling very short segments.
            let remaining = speed;
            const EPS = 1e-6;
            while (remaining > 0) {
                const nextIndex = getNextIndex(routeIndex);
                const p1 = coords[routeIndex];
                const p2 = coords[nextIndex];
                const segmentLength = Math.max(getDistance(p1, p2), 1e-9);

                // Stop detection: if we will reach a stop anchor on the current segment in this tick, stop exactly there.
                const anchorsHere = stopAnchorsBySegment[routeIndex] ?? [];
                let anchorToStopAt: StopAnchor | null = null;
                for (const a of anchorsHere) {
                    if (a.t <= progress + EPS) continue;
                    const distToAnchor = (a.t - progress) * segmentLength;
                    if (distToAnchor <= remaining + 1e-12) {
                        anchorToStopAt = a;
                        break; // anchors are sorted by t; first reachable is the earliest stop
                    }
                }

                if (anchorToStopAt) {
                    progress = anchorToStopAt.t;
                    position = anchorToStopAt.snap;
                    heading = normalizeHeading(getHeading(p1, p2));

                    // Random dwell time: 300 - 600 ticks (at 60fps = 5-10 seconds)
                    dwellTime = 300 + Math.random() * 300;
                    status = "delayed";
                    speed = 0;
                    didStop = true;
                    remaining = 0;
                    break;
                }

                const distanceLeftOnSegment = (1 - progress) * segmentLength;

                if (remaining < distanceLeftOnSegment) {
                    progress += remaining / segmentLength;
                    remaining = 0;
                    break;
                }

                // Advance to the next segment.
                remaining -= distanceLeftOnSegment;
                routeIndex = nextIndex;
                progress = 0;
            }

            // Calculate interpolated position/heading along the actual route geometry when not stopping at a stop.
            if (!didStop) {
                const nextPointIndex = getNextIndex(routeIndex);
                const currentPoint = coords[routeIndex];
                const nextPoint = coords[nextPointIndex];
                position = interpolate(currentPoint, nextPoint, progress);
                heading = normalizeHeading(getHeading(currentPoint, nextPoint));
            }

            return {
                ...vehicle,
                routeIndex,
                progress,
                position,
                heading,
                speed,
                status,
                dwellTime,
            };
        });

        updateVehicleState();

        if (enabled) {
            animationFrameRef.current = requestAnimationFrame(animate);
        }
    }, [enabled, routeCoordinatesByDirection, stopAnchorsByDirection, updateVehicleState]);

    // Start/stop animation
    useEffect(() => {
        if (enabled) {
            animationFrameRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [enabled, animate]);

    return vehicles;
}
