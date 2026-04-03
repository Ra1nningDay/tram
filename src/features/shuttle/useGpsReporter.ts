"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Vehicle } from "./api";

// GPS position reported to the server every REPORT_INTERVAL_MS while on duty
const REPORT_INTERVAL_MS = 5_000;

type GpsReporterOptions = {
  /** Whether to actively watch & report GPS. Set to true when driver is on duty. */
  enabled: boolean;
  vehicleId: string;
  vehicleLabel?: string;
  direction?: "outbound" | "inbound";
  crowding?: Vehicle["crowding"];
};

type ReportResult =
  | { ok: true }
  | { ok: false; reason: "no-position" | "fetch-error" | "server-error" };

async function stopReporting(vehicleId: string): Promise<void> {
  try {
    const res = await fetch("/api/gps/ingest", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicle_id: vehicleId }),
      credentials: "include",
    });

    if (!res.ok) {
      console.warn("[useGpsReporter] stop failed:", res.status);
    }
  } catch {
    console.warn("[useGpsReporter] stop failed: fetch-error");
  }
}

async function reportPosition(
  position: GeolocationPosition,
  opts: GpsReporterOptions,
): Promise<ReportResult> {
  const { vehicleId, vehicleLabel, direction } = opts;

  try {
    const res = await fetch("/api/gps/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // No Bearer token — auth is handled by the better-auth session cookie
      body: JSON.stringify({
        vehicle_id: vehicleId,
        label: vehicleLabel ?? vehicleId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading ?? undefined,
        speed: position.coords.speed ?? undefined,
        direction: direction ?? "outbound",
        crowding: opts.crowding ?? "normal",
      }),
      credentials: "include", // send session cookie
    });

    if (!res.ok) return { ok: false, reason: "server-error" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "fetch-error" };
  }
}

/**
 * useGpsReporter
 *
 * Starts watching the device's GPS position and POSTs it to /api/gps/ingest
 * every REPORT_INTERVAL_MS while `enabled` is true.
 *
 * Auth happens automatically via the better-auth session cookie — no extra
 * tokens needed in the driver app.
 *
 * Usage:
 * ```tsx
 * useGpsReporter({
 *   enabled: mode !== "off",   // true when driver taps "เริ่มทำงาน"
 *   vehicleId: selectedVehicle,
 *   direction: "outbound",
 * });
 * ```
 */
export function useGpsReporter(opts: GpsReporterOptions) {
  const latestPositionRef = useRef<GeolocationPosition | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSentInitialFixRef = useRef(false);
  const isReportingRef = useRef(false);
  const activeVehicleIdRef = useRef<string | null>(null);
  const activeCrowdingRef = useRef<Vehicle["crowding"]>("normal");
  const optsRef = useRef(opts);

  // Keep opts ref current without re-triggering the effect
  useEffect(() => {
    optsRef.current = opts;
  });

  const sendLatestPosition = useCallback(() => {
    const pos = latestPositionRef.current;
    if (!pos || isReportingRef.current) return;

    isReportingRef.current = true;
    void reportPosition(pos, optsRef.current)
      .then((result) => {
        if (!result.ok) {
          console.warn("[useGpsReporter] report failed:", result.reason);
        }
      })
      .finally(() => {
        isReportingRef.current = false;
      });
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    latestPositionRef.current = null;
    hasSentInitialFixRef.current = false;
    isReportingRef.current = false;
  }, []);

  const startWatching = useCallback(() => {
    if (!("geolocation" in navigator)) {
      console.warn("[useGpsReporter] Geolocation not supported");
      return;
    }

    if (watchIdRef.current !== null) {
      return;
    }

    // Continuously update the cached position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        latestPositionRef.current = position;

        if (!hasSentInitialFixRef.current) {
          hasSentInitialFixRef.current = true;
          sendLatestPosition();
        }
      },
      (err) => {
        console.warn("[useGpsReporter] watchPosition error:", err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 4_000,
        timeout: 10_000,
      },
    );

    // Send the latest cached position to the server on a fixed interval
    intervalRef.current = setInterval(() => {
      sendLatestPosition();
    }, REPORT_INTERVAL_MS);
  }, [sendLatestPosition]);

  useEffect(() => {
    const previousVehicleId = activeVehicleIdRef.current;
    const previousCrowding = activeCrowdingRef.current;

    if (!opts.enabled) {
      stopWatching();
      activeVehicleIdRef.current = null;
      activeCrowdingRef.current = "normal";
      if (previousVehicleId) {
        void stopReporting(previousVehicleId);
      }
      return;
    }

    activeVehicleIdRef.current = opts.vehicleId;
    activeCrowdingRef.current = opts.crowding ?? "normal";
    startWatching();

    if (previousVehicleId && previousVehicleId !== opts.vehicleId) {
      void stopReporting(previousVehicleId);
      hasSentInitialFixRef.current = false;
    }

    const crowdingChanged = previousCrowding !== (opts.crowding ?? "normal");

    if (
      latestPositionRef.current &&
      (!hasSentInitialFixRef.current || crowdingChanged)
    ) {
      hasSentInitialFixRef.current = true;
      sendLatestPosition();
    }
  }, [
    opts.enabled,
    opts.vehicleId,
    opts.crowding,
    sendLatestPosition,
    startWatching,
    stopWatching,
  ]);

  useEffect(() => {
    return () => {
      const activeVehicleId = activeVehicleIdRef.current;

      stopWatching();
      activeVehicleIdRef.current = null;
      activeCrowdingRef.current = "normal";

      if (activeVehicleId) {
        void stopReporting(activeVehicleId);
      }
    };
  }, [stopWatching]);
}
