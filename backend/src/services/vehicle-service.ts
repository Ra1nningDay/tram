import type { Status } from "./status.js";
import { deriveStatus } from "./status.js";

type VehicleSeed = {
  id: string;
  label: string;
  baseLat: number;
  baseLng: number;
  direction: "outbound" | "inbound";
  phase: number;
  staleOffsetSeconds: number;
};

export type Vehicle = {
  id: string;
  label?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  direction: "outbound" | "inbound";
  last_updated: string;
  status: Status;
};

const vehicleSeeds: VehicleSeed[] = [
  {
    id: "bus-1",
    label: "Shuttle 1",
    baseLat: 13.7367,
    baseLng: 100.5231,
    direction: "outbound",
    phase: 0,
    staleOffsetSeconds: 5,
  },
  {
    id: "bus-2",
    label: "Shuttle 2",
    baseLat: 13.7375,
    baseLng: 100.5245,
    direction: "outbound",
    phase: 1.2,
    staleOffsetSeconds: 25,
  },
  {
    id: "bus-3",
    label: "Shuttle 3",
    baseLat: 13.7372,
    baseLng: 100.5224,
    direction: "inbound",
    phase: 2.6,
    staleOffsetSeconds: 80,
  },
];

function move(seed: VehicleSeed, serverTime: Date): Pick<Vehicle, "latitude" | "longitude" | "heading"> {
  const t = serverTime.getTime() / 1000;
  const radius = 0.0008;
  const lat = seed.baseLat + Math.sin(t / 10 + seed.phase) * radius;
  const lng = seed.baseLng + Math.cos(t / 10 + seed.phase) * radius;
  const heading = ((t * 10 + seed.phase * 100) % 360 + 360) % 360;
  return { latitude: lat, longitude: lng, heading };
}

export function listVehicles(serverTime = new Date()): Vehicle[] {
  const vehicles = vehicleSeeds.map((seed) => {
    const movement = move(seed, serverTime);
    const lastUpdated = new Date(serverTime.getTime() - seed.staleOffsetSeconds * 1000).toISOString();
    return {
      id: seed.id,
      label: seed.label,
      direction: seed.direction,
      last_updated: lastUpdated,
      status: deriveStatus(lastUpdated, serverTime),
      ...movement,
    };
  });
  return vehicles.filter((v) => v.status !== "hidden");
}
