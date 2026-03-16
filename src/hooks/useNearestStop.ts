import { useMemo } from "react";
import type { Stop } from "@/features/shuttle/api";
import type { UserLocation } from "@/hooks/useUserLocation";
import { haversineM } from "@/lib/geo/distance";

export type StopWithDistance = Stop & { distanceM: number };

export type UseNearestStopReturn = {
  /** The closest stop to the user, or null if no data */
  nearestStop: StopWithDistance | null;
};

/**
 * Finds the nearest stop to the user's current location.
 * Returns null if either userLocation or stops is unavailable.
 */
export function useNearestStop(
  userLocation: UserLocation | null | undefined,
  stops: Stop[] | undefined,
): UseNearestStopReturn {
  const nearestStop = useMemo(() => {
    if (!userLocation || !stops || stops.length === 0) return null;

    const userLngLat: [number, number] = [userLocation.longitude, userLocation.latitude];

    let best: StopWithDistance | null = null;
    let bestDist = Infinity;

    for (const stop of stops) {
      const d = haversineM(userLngLat, [stop.longitude, stop.latitude]);
      if (d < bestDist) {
        bestDist = d;
        best = { ...stop, distanceM: d };
      }
    }

    return best;
  }, [userLocation?.latitude, userLocation?.longitude, stops]);

  return { nearestStop };
}
