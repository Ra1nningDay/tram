import { useQuery } from "@tanstack/react-query";
import type { Route, Stop, Vehicle, Eta } from "./api";

const REFRESH_MS = 3000;

async function request<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

export function useRoute() {
  return useQuery({
    queryKey: ["route"],
    queryFn: () => request<{ server_time: string; route: Route }>("/api/route"),
    staleTime: Infinity,
  });
}

export function useStops() {
  return useQuery({
    queryKey: ["stops"],
    queryFn: () => request<{ server_time: string; stops: Stop[] }>("/api/stops"),
    staleTime: Infinity,
  });
}

export function useVehicles() {
  return useQuery({
    queryKey: ["vehicles"],
    queryFn: () => request<{ server_time: string; vehicles: Vehicle[] }>("/api/vehicles"),
    staleTime: 0,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
}

export function useStopEtas(stopId?: string) {
  return useQuery({
    queryKey: ["etas", stopId],
    queryFn: () =>
      request<{ server_time: string; stop_id: string; etas: Eta[] }>(
        `/api/stops/${stopId}/etas`
      ),
    enabled: Boolean(stopId),
    staleTime: 0,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
}
