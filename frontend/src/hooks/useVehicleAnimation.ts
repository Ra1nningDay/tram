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

// Pre-calculate stop indices on the route
const stopIndices = new Set(stops.map(s => findClosestRouteIndex(s.latitude, s.longitude)));

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
        // Slower realistic speed (approx 10x slower than before)
        const BASE_SPEED = 0.002;

        const initialVehicles: AnimatedVehicle[] = [
            {
                id: "vehicle-1",
                label: "BU-01",
                position: routeCoordinates[0],
                heading: 0,
                routeIndex: 0,
                progress: 0,
                speed: BASE_SPEED,
                baseSpeed: BASE_SPEED + Math.random() * 0.0005,
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
                baseSpeed: BASE_SPEED + Math.random() * 0.0005,
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
                baseSpeed: BASE_SPEED + Math.random() * 0.0005,
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

                // Finished dwelling
                if (dwellTime <= 0) {
                    status = "fresh";
                    speed = baseSpeed;
                    // HACK: Bump progress slightly to avoid immediate re-trigger if index hasn't changed
                    // But since we trigger on routeIndex change, we should be fine as long as we move.
                }

                return { ...vehicle, dwellTime, status, speed };
            }

            // Normal movement
            status = "fresh";
            speed = baseSpeed;
            progress += speed;

            // Move to next segment if progress >= 1
            while (progress >= 1) {
                progress -= 1;
                routeIndex++;

                // Loop back to start when reaching end
                if (routeIndex >= routeCoordinates.length - 1) {
                    routeIndex = 0;
                }

                // Check if we arrived at a stop
                if (stopIndices.has(routeIndex)) {
                    // Start dwelling
                    // Random dwell time: 300 - 600 ticks (at 60fps = 5-10 seconds)
                    dwellTime = 300 + Math.random() * 300;
                    break; // Stop processing movement for this frame
                }
            }

            // If currently dwelling (triggered inside the while loop), simplify position update
            if (dwellTime > 0) {
                status = "delayed";
                speed = 0;
                // Snap to the exact coordinate of the stop index
                const snapPoint = routeCoordinates[routeIndex];
                position = snapPoint;
                // Heading remains same as arrival
            } else {
                // Calculate interpolated position
                const currentPoint = routeCoordinates[routeIndex];
                const nextPoint = routeCoordinates[routeIndex + 1] || routeCoordinates[0];
                position = interpolate(currentPoint, nextPoint, progress);
                heading = getHeading(currentPoint, nextPoint);
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
