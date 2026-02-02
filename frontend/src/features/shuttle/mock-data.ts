import type { Route, Stop, Vehicle, Eta } from "./api";
import shuttleData from "../../data/shuttle-data.json";

// Load routes from JSON
export const mockRoute: Route = shuttleData.routes[0] as Route;

// Load stops from JSON
export const mockStops: Stop[] = shuttleData.stops.map((stop) => ({
    ...stop,
    direction: stop.direction as "outbound" | "inbound",
}));

// Load vehicles from JSON with dynamic timestamps
export const mockVehicles: Vehicle[] = shuttleData.vehicles.map((v, index) => ({
    ...v,
    direction: v.direction as "outbound" | "inbound",
    last_updated: new Date(Date.now() - index * 120000).toISOString(),
    status: (index === 0 ? "fresh" : index === 1 ? "delayed" : "offline") as Vehicle["status"],
}));

// Mock ETAs for stops (dynamic based on current time)
export const mockEtas: Record<string, Eta[]> = {
    "stop-1": [
        {
            stop_id: "stop-1",
            vehicle_id: "vehicle-1",
            eta_minutes: 5,
            last_updated: new Date().toISOString(),
            status: "fresh",
        },
    ],
    "stop-2": [
        {
            stop_id: "stop-2",
            vehicle_id: "vehicle-1",
            eta_minutes: 2,
            last_updated: new Date().toISOString(),
            status: "fresh",
        },
    ],
    "stop-3": [
        {
            stop_id: "stop-3",
            vehicle_id: "vehicle-1",
            eta_minutes: 1,
            last_updated: new Date().toISOString(),
            status: "fresh",
        },
        {
            stop_id: "stop-3",
            vehicle_id: "vehicle-2",
            eta_minutes: 8,
            last_updated: new Date().toISOString(),
            status: "delayed",
        },
    ],
    "stop-4": [
        {
            stop_id: "stop-4",
            vehicle_id: "vehicle-2",
            eta_minutes: 1,
            last_updated: new Date().toISOString(),
            status: "delayed",
        },
    ],
    "stop-5": [
        {
            stop_id: "stop-5",
            vehicle_id: "vehicle-1",
            eta_minutes: 6,
            last_updated: new Date().toISOString(),
            status: "fresh",
        },
    ],
};

// Helper to get ETAs for a specific stop
export function getMockEtasForStop(stopId: string): Eta[] {
    return mockEtas[stopId] ?? [];
}
