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

export async function finalizeGpsReporterStop(
  pendingReport: Promise<unknown> | null,
  stop: () => Promise<void>,
): Promise<void> {
  try {
    await pendingReport;
  } catch {
    // Best effort: still attempt to delete the session on the server.
  }

  await stop();
}

function createReporterSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `gps-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function stopReporting(vehicleId: string, sessionId?: string | null): Promise<void> {
  try {
    const res = await fetch("/api/gps/ingest", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicle_id: vehicleId,
        session_id: sessionId ?? undefined,
      }),
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
  sessionId: string,
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
        session_id: sessionId,
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
  const reportPromiseRef = useRef<Promise<ReportResult> | null>(null);
  const reportSequenceRef = useRef(0);
  const activeVehicleIdRef = useRef<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const activeCrowdingRef = useRef<Vehicle["crowding"]>("normal");
  const optsRef = useRef(opts);

  // Keep opts ref current without re-triggering the effect
  useEffect(() => {
    optsRef.current = opts;
  });

  const sendLatestPosition = useCallback(() => {
    const pos = latestPositionRef.current;
    const sessionId = activeSessionIdRef.current;
    if (!pos || isReportingRef.current || !sessionId) return;

    isReportingRef.current = true;
    const reportSequence = ++reportSequenceRef.current;
    const pendingReport = reportPosition(pos, optsRef.current, sessionId);
    reportPromiseRef.current = pendingReport;

    void pendingReport
      .then((result) => {
        if (!result.ok) {
          console.warn("[useGpsReporter] report failed:", result.reason);
        }
      })
      .finally(() => {
        if (reportPromiseRef.current === pendingReport) {
          reportPromiseRef.current = null;
        }
        if (reportSequenceRef.current === reportSequence) {
          isReportingRef.current = false;
        }
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
    isReportingRef.current = reportPromiseRef.current !== null;
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

  const stopVehicleSession = useCallback((
    vehicleId: string | null,
    sessionId: string | null,
    pendingReport: Promise<ReportResult> | null,
  ) => {
    if (!vehicleId) {
      return;
    }

    void finalizeGpsReporterStop(
      pendingReport,
      () => stopReporting(vehicleId, sessionId),
    );
  }, []);

  useEffect(() => {
    const previousVehicleId = activeVehicleIdRef.current;
    const previousSessionId = activeSessionIdRef.current;
    const previousCrowding = activeCrowdingRef.current;
    const pendingReport = reportPromiseRef.current;

    if (!opts.enabled) {
      stopWatching();
      activeVehicleIdRef.current = null;
      activeSessionIdRef.current = null;
      activeCrowdingRef.current = "normal";
      stopVehicleSession(previousVehicleId, previousSessionId, pendingReport);
      return;
    }

    if (!previousSessionId || previousVehicleId !== opts.vehicleId) {
      activeSessionIdRef.current = createReporterSessionId();
    }

    activeVehicleIdRef.current = opts.vehicleId;
    activeCrowdingRef.current = opts.crowding ?? "normal";
    startWatching();

    if (previousVehicleId && previousVehicleId !== opts.vehicleId) {
      stopVehicleSession(previousVehicleId, previousSessionId, pendingReport);
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
    stopVehicleSession,
    stopWatching,
  ]);

  useEffect(() => {
    return () => {
      const activeVehicleId = activeVehicleIdRef.current;
      const activeSessionId = activeSessionIdRef.current;
      const pendingReport = reportPromiseRef.current;

      stopWatching();
      activeVehicleIdRef.current = null;
      activeSessionIdRef.current = null;
      activeCrowdingRef.current = "normal";
      stopVehicleSession(activeVehicleId, activeSessionId, pendingReport);
    };
  }, [stopVehicleSession, stopWatching]);
}
