import { describe, test, expect } from "vitest";
import {
    projectGpsToRoute,
    positionAtDistance,
    computeTelemetry,
    ROUTE_COORDS,
    ROUTE_TOTAL_M
} from "../useGpsReplay";

// Assuming we have at least a few points in the route from the JSON
describe("GPS Replay / Route Calculations", () => {
    test("ROUTE_COORDS and ROUTE_TOTAL_M should be properly loaded", () => {
        // Just verify our mock data or real data from JSON is not empty
        expect(ROUTE_COORDS.length).toBeGreaterThan(0);
        expect(ROUTE_TOTAL_M).toBeGreaterThan(0);
    });

    test("projectGpsToRoute should return a valid distance within bounds", () => {
        // Take the very first point on the route
        const [lng, lat] = ROUTE_COORDS[0] ?? [0, 0];
        
        // Snapping the exact first point should yield ~0 distance
        const dist = projectGpsToRoute(lat, lng);
        expect(dist).toBeGreaterThanOrEqual(0);
        expect(dist).toBeLessThanOrEqual(ROUTE_TOTAL_M);
    });

    test("positionAtDistance should return a valid coordinate and heading", () => {
        // Check start of route
        const startPos = positionAtDistance(0);
        expect(startPos).toHaveProperty("lat");
        expect(startPos).toHaveProperty("lng");
        expect(startPos).toHaveProperty("heading");

        // Check somewhere in the middle
        const midPos = positionAtDistance(ROUTE_TOTAL_M / 2);
        expect(midPos).toHaveProperty("lat");
        expect(midPos).toHaveProperty("lng");
        expect(midPos).toHaveProperty("heading");

        // Check out of bounds (should wrap around correctly using modulo)
        const wrappedPos = positionAtDistance(ROUTE_TOTAL_M + 100);
        expect(wrappedPos).toHaveProperty("lat");
        expect(wrappedPos).toHaveProperty("lng");
    });

    test("computeTelemetry should generate correctly formatted telemetry", () => {
        const vehicleId = "TRAM-99";
        const label = "Test Tram";
        const distanceM = 100;
        const speedKmh = 15;

        const telemetry = computeTelemetry(vehicleId, label, distanceM, speedKmh, "full");

        expect(telemetry.vehicleId).toBe(vehicleId);
        expect(telemetry.label).toBe(label);
        expect(telemetry.speedKmh).toBe(15);
        expect(telemetry.crowding).toBe("full");
        
        // Ensure status handles low speed correctly
        expect(telemetry.status).toBe("normal");

        const slowTelemetry = computeTelemetry(vehicleId, label, distanceM, 0.5);
        expect(slowTelemetry.status).toBe("warning");

        // Should return calculated next stops and distances
        expect(typeof telemetry.nextStopName).toBe("string");
        expect(typeof telemetry.distanceToNextStopM).toBe("number");
        expect(typeof telemetry.progressPercent).toBe("number");
        
        // Progress should be bound between 0 and 100
        expect(telemetry.progressPercent).toBeGreaterThanOrEqual(0);
        expect(telemetry.progressPercent).toBeLessThanOrEqual(100);
    });
});
