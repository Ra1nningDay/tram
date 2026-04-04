import { resolveApiUrl } from "../../lib/config";

export type Status = "fresh" | "delayed" | "offline" | "hidden";
export type VehicleCrowding = "normal" | "full";
export type MatchedPosition = { lng: number; lat: number };

export type Vehicle = {
  id: string;
  label?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  direction: "outbound" | "inbound";
  last_updated: string;
  status: Status;
  crowding?: VehicleCrowding;
  speedKph?: number;
  routeDistanceM?: number;
  matchedPosition?: MatchedPosition;
  etaConfidence?: number;
};

export type VehicleTelemetry = {
  vehicleId: string;
  label: string;
  speedKmh: number;
  nextStopId?: string;
  nextStopName?: string;
  nextStopNameEn?: string;
  distanceToNextStopM: number;
  etaToNextStopS?: number;
  arrivalTime?: string;
  progressPercent: number;
  prevStopName: string;
  status: "normal" | "warning";
  crowding?: VehicleCrowding;
  etaConfidence?: number;
};

export type VehicleFeedSnapshot = {
  server_time: string;
  vehicles: Vehicle[];
  telemetryByVehicleId: Record<string, VehicleTelemetry>;
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
  vehicle_label?: string;
  line_name?: string;
  eta_minutes: number;
  arrival_time?: string;
  last_updated: string;
  status: Status;
};

async function request<T>(path: string): Promise<T> {
  const res = await fetch(resolveApiUrl(path));
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export const api = {
  getRoute: () => request<{ server_time: string; route: Route }>("/api/route"),
  getStops: () => request<{ server_time: string; stops: Stop[] }>("/api/stops"),
  getVehicles: () => request<VehicleFeedSnapshot>("/api/vehicles"),
  getStopEtas: (stopId: string) =>
    request<{ server_time: string; stop_id: string; etas: Eta[] }>(`/api/stops/${stopId}/etas`),
};
