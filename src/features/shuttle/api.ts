import { config } from "../../lib/config";

export type Status = "fresh" | "delayed" | "offline" | "hidden";

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

export type Stop = {
  id: string;
  name_th: string;
  name_en?: string;
  latitude: number;
  longitude: number;
  sequence: number;
  direction: "outbound" | "inbound";
  icon?: string; // Lucide icon name
};

export type Route = {
  id: string;
  name: string;
  directions: Array<{
    direction: "outbound" | "inbound";
    geometry: { type: "LineString"; coordinates: [number, number][] };
    stops: Array<{ id: string; sequence: number }>;
  }>;
};

export type Eta = {
  stop_id: string;
  vehicle_id?: string;
  eta_minutes: number;
  arrival_time?: string;
  last_updated: string;
  status: Status;
};

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${config.apiBaseUrl}${path}`);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export const api = {
  getRoute: () => request<{ server_time: string; route: Route }>("/api/route"),
  getStops: () => request<{ server_time: string; stops: Stop[] }>("/api/stops"),
  getVehicles: () => request<{ server_time: string; vehicles: Vehicle[] }>("/api/vehicles"),
  getStopEtas: (stopId: string) =>
    request<{ server_time: string; stop_id: string; etas: Eta[] }>(`/api/stops/${stopId}/etas`),
};