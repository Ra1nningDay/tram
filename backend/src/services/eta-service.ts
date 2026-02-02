import type { Status } from "./status.js";
import { deriveStatus } from "./status.js";

export type Eta = {
  stop_id: string;
  vehicle_id?: string;
  eta_minutes: number;
  arrival_time?: string;
  last_updated: string;
  status: Status;
};

const mockEtas: Eta[] = [
  {
    stop_id: "stop-1",
    vehicle_id: "bus-1",
    eta_minutes: 5,
    arrival_time: new Date(Date.now() + 5 * 60_000).toISOString(),
    last_updated: new Date().toISOString(),
    status: "fresh",
  },
];

export function listEtasForStop(stopId: string, serverTime = new Date()): Eta[] {
  return mockEtas
    .filter((eta) => eta.stop_id === stopId)
    .map((eta) => ({
      ...eta,
      status: deriveStatus(eta.last_updated, serverTime),
    }));
}