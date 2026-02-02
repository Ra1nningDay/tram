import { useState, useEffect, useCallback, useRef } from "react";
import type { Vehicle } from "../features/shuttle/api";
import shuttleData from "../data/shuttle-data.json";

// Get route coordinates from JSON
const routeCoordinates = shuttleData.routes[0].directions[0].geometry.coordinates as [number, number][];

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



// Get stops from JSON
const stops = shuttleData.stops;

// Helper: Find the route index closest to a given stop
function findClosestRouteIndex(stopLat: number, stopLng: number): number {
    let minDistance = Infinity;
    let closestIndex = 0;

    routeCoordinates.forEach((coord, index) => {
        const dist = getDistance([stopLng, stopLat], coord);
        if (dist < minDistance) {
            minDistance = dist;
            closestIndex = index;
        }
    });
    return closestIndex;
}

// Pre-calculate stop indices and their coordinates
const stopLocationMap = new Map<number, [number, number]>();
stops.forEach(s => {
    const index = findClosestRouteIndex(s.latitude, s.longitude);
    stopLocationMap.set(index, [s.longitude, s.latitude]);
});

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

export function useVehicleAnimation(enabled = true) {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const animatedVehiclesRef = useRef<AnimatedVehicle[]>([]);
    const animationFrameRef = useRef<number | null>(null);

    // Initialize vehicles at different points on the route
    useEffect(() => {
        // Speed is distance per tick (degrees). Keep consistent speed across segments.
        const BASE_SPEED = 0.0000013;
        const SPEED_VARIANCE = 0.0000004;

        const initialVehicles: AnimatedVehicle[] = [
            {
                id: "vehicle-1",
                label: "BU-01",
                position: routeCoordinates[0],
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
                position: routeCoordinates[Math.floor(routeCoordinates.length / 3)],
                heading: 0,
                routeIndex: Math.floor(routeCoordinates.length / 3),
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
                position: routeCoordinates[Math.floor((routeCoordinates.length * 2) / 3)],
                heading: 0,
                routeIndex: Math.floor((routeCoordinates.length * 2) / 3),
                progress: 0,
                speed: BASE_SPEED,
                baseSpeed: BASE_SPEED + Math.random() * SPEED_VARIANCE,
                direction: "outbound",
                status: "fresh",
                dwellTime: 0,
            },
        ];

        animatedVehiclesRef.current = initialVehicles;
        updateVehicleState();
    }, []);

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

    const animate = useCallback(() => {
        animatedVehiclesRef.current = animatedVehiclesRef.current.map((vehicle) => {
            let { routeIndex, progress, position, heading, speed, baseSpeed, dwellTime, status } = vehicle;

            // Handle dwelling (stops)
            if (dwellTime > 0) {
                dwellTime -= 1;
                status = "delayed"; // Show as delayed/waiting while dwelling
                speed = 0;

                // Keep position snapped to stop while dwelling
                const exactStopPosition = stopLocationMap.get(routeIndex);
                if (exactStopPosition) {
                    position = exactStopPosition;
                }

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
            const nextIndex = routeIndex + 1 >= routeCoordinates.length ? 0 : routeIndex + 1;
            const currentPointForSpeed = stopLocationMap.get(routeIndex) ?? routeCoordinates[routeIndex];
            const nextPointForSpeed = stopLocationMap.get(nextIndex) ?? routeCoordinates[nextIndex];
            const segmentLength = Math.max(getDistance(currentPointForSpeed, nextPointForSpeed), 1e-9);
            progress += speed / segmentLength;

            let shouldDwell = false;

            // Move to next segment if progress >= 1
            while (progress >= 1) {
                progress -= 1;
                routeIndex++;

                // Loop back to start when reaching end
                if (routeIndex >= routeCoordinates.length - 1) {
                    routeIndex = 0;
                }

                // Check if the NEXT index is a stop - we'll dwell when we arrive there (progress ~= 0)
                if (stopLocationMap.has(routeIndex)) {
                    shouldDwell = true;
                    progress = 0; // Snap progress to exactly 0 at the start of this segment
                    break;
                }
            }

            // Calculate interpolated position first (normal movement)
            const nextPointIndex = routeIndex + 1 >= routeCoordinates.length ? 0 : routeIndex + 1;
            const currentPoint = stopLocationMap.get(routeIndex) ?? routeCoordinates[routeIndex];
            const nextPoint = stopLocationMap.get(nextPointIndex) ?? routeCoordinates[nextPointIndex];
            position = interpolate(currentPoint, nextPoint, progress);
            heading = getHeading(currentPoint, nextPoint);

            // If we just arrived at a stop, snap to exact stop position and start dwelling
            if (shouldDwell) {
                const exactStopPosition = stopLocationMap.get(routeIndex);
                if (exactStopPosition) {
                    position = exactStopPosition;
                }
                // Random dwell time: 300 - 600 ticks (at 60fps = 5-10 seconds)
                dwellTime = 300 + Math.random() * 300;
                status = "delayed";
                speed = 0;
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
    }, [enabled, updateVehicleState]);

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
