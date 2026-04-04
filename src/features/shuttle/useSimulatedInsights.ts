import { useEffect, useMemo, useRef, useState } from "react";
import type { Route, Stop, Vehicle } from "./api";
import { buildSimulatedInsights } from "./simulated-insights";

type PrevTelemetry = { lngLat: [number, number]; atMs: number; speedMpsEma?: number };

export function useSimulatedInsights({
  vehicles,
  route,
  stops,
  enabled = true,
  updateIntervalMs = 3000,
}: {
  vehicles: Vehicle[];
  route?: Route;
  stops?: Stop[];
  enabled?: boolean;
  updateIntervalMs?: number;
}) {
  const prevByVehicleIdRef = useRef<Map<string, PrevTelemetry>>(new Map());
  const vehiclesRef = useRef<Vehicle[]>(vehicles);
  const [tick, setTick] = useState(0);
  const emptyInsights = useMemo<ReturnType<typeof buildSimulatedInsights>>(
    () => ({ etasByStopId: {}, telemetryByVehicleId: {} }),
    [],
  );

  // Keep the latest simulated vehicles without forcing re-compute/render.
  vehiclesRef.current = vehicles;

  // Recompute insights periodically instead of every animation frame.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const id = window.setInterval(() => setTick((t) => (t + 1) % 1_000_000), updateIntervalMs);
    return () => window.clearInterval(id);
  }, [enabled, updateIntervalMs]);

  return useMemo(() => {
    if (!enabled) {
      return emptyInsights;
    }

    return buildSimulatedInsights({
      vehicles: vehiclesRef.current,
      route,
      stops,
      nowMs: Date.now(),
      prevByVehicleId: prevByVehicleIdRef.current,
    });
  }, [emptyInsights, enabled, tick, route, stops]);
}
