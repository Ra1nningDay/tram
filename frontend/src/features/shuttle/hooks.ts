import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { mockRoute, mockStops, mockVehicles, getMockEtasForStop } from "./mock-data";

const REFRESH_MS = 3000;
// Use mock data in development OR if explicitly enabled via NEXT_PUBLIC_USE_MOCK.
const USE_MOCK =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_USE_MOCK === "true";

export function useRoute() {
  return useQuery({
    queryKey: ["route"],
    queryFn: async () => {
      if (USE_MOCK) {
        return { server_time: new Date().toISOString(), route: mockRoute };
      }
      return api.getRoute();
    },
    staleTime: Infinity,
  });
}

export function useStops() {
  return useQuery({
    queryKey: ["stops"],
    queryFn: async () => {
      if (USE_MOCK) {
        return { server_time: new Date().toISOString(), stops: mockStops };
      }
      return api.getStops();
    },
    staleTime: Infinity,
  });
}

export function useVehicles() {
  return useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      if (USE_MOCK) {
        // Return static mock vehicles (no randomization to prevent flickering)
        return { server_time: new Date().toISOString(), vehicles: mockVehicles };
      }
      return api.getVehicles();
    },
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
    queryFn: async () => {
      if (USE_MOCK && stopId) {
        return {
          server_time: new Date().toISOString(),
          stop_id: stopId,
          etas: getMockEtasForStop(stopId),
        };
      }
      return api.getStopEtas(stopId ?? "");
    },
    enabled: Boolean(stopId),
    staleTime: 0,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
}
