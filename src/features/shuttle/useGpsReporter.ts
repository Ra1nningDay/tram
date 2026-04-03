"use client";

import { useCallback, useEffect, useRef } from "react";

// GPS position reported to the server every REPORT_INTERVAL_MS while on duty
const REPORT_INTERVAL_MS = 5_000;

type GpsReporterOptions = {
  /** Whether to actively watch & report GPS. Set to true when driver is on duty. */
  enabled: boolean;
  vehicleId: string;
  vehicleLabel?: string;
  direction?: "outbound" | "inbound";
};

type ReportResult =
  | { ok: true }
  | { ok: false; reason: "no-position" | "fetch-error" | "server-error" };

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
    if (opts.enabled) {
      startWatching();
    } else {
      stopWatching();
    }

    return stopWatching;
  }, [opts.enabled, startWatching, stopWatching]);
}
