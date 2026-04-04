"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Vehicle } from "./api";
import {
  BALANCED_BACKGROUND_INTERVAL_MS,
  BALANCED_IDLE_INTERVAL_MS,
  BALANCED_MOVING_INTERVAL_MS,
  BALANCED_MOVING_SPEED_THRESHOLD_MPS,
  getBalancedTrackingIntervalMs,
} from "@/lib/vehicles/balanced-profile";

export const GPS_REPORT_INTERVAL_MOVING_MS = BALANCED_MOVING_INTERVAL_MS;
export const GPS_REPORT_INTERVAL_IDLE_MS = BALANCED_IDLE_INTERVAL_MS;
export const GPS_REPORT_INTERVAL_BACKGROUND_MS = BALANCED_BACKGROUND_INTERVAL_MS;
export const GPS_MOVING_SPEED_THRESHOLD_MPS = BALANCED_MOVING_SPEED_THRESHOLD_MPS;
export const GPS_HEADING_CHANGE_THRESHOLD_DEG = 15;

const FOREGROUND_WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 4_000,
  timeout: 10_000,
};

const BACKGROUND_WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 10_000,
  timeout: 20_000,
};

export type GpsReporterTrackingMode = "foreground" | "background";

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
  | { ok: false; reason: "fetch-error" | "server-error" };

type SendLatestPositionOptions = {
  force?: boolean;
};

type ImmediateGpsReportStateChange = {
  previousVehicleId: string | null;
  nextVehicleId: string;
  previousCrowding: Vehicle["crowding"];
  nextCrowding: Vehicle["crowding"];
  previousDirection: "outbound" | "inbound";
  nextDirection: "outbound" | "inbound";
  hasLatestPosition: boolean;
  hasSentInitialFix: boolean;
};

export function getGpsReporterTrackingMode(
  visibilityState?: DocumentVisibilityState,
): GpsReporterTrackingMode {
  return visibilityState === "hidden" ? "background" : "foreground";
}

export function getGpsReporterIntervalMs(
  speedMps?: number | null,
  trackingMode: GpsReporterTrackingMode = "foreground",
): number {
  return getBalancedTrackingIntervalMs(speedMps, trackingMode);
}

export function getGpsReporterWatchOptions(
  trackingMode: GpsReporterTrackingMode,
): PositionOptions {
  return trackingMode === "background"
    ? BACKGROUND_WATCH_OPTIONS
    : FOREGROUND_WATCH_OPTIONS;
}

function normalizeHeading(heading?: number | null): number | null {
  if (typeof heading !== "number" || !Number.isFinite(heading)) {
    return null;
  }

  const normalized = heading % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function getHeadingDeltaDeg(
  previousHeading?: number | null,
  nextHeading?: number | null,
): number {
  const previous = normalizeHeading(previousHeading);
  const next = normalizeHeading(nextHeading);

  if (previous === null || next === null) {
    return 0;
  }

  const delta = Math.abs(next - previous);
  return Math.min(delta, 360 - delta);
}

export function hasSignificantHeadingChange(
  previousHeading?: number | null,
  nextHeading?: number | null,
  thresholdDeg: number = GPS_HEADING_CHANGE_THRESHOLD_DEG,
): boolean {
  return getHeadingDeltaDeg(previousHeading, nextHeading) > thresholdDeg;
}

export function shouldForceGpsReportOnStateChange(
  change: ImmediateGpsReportStateChange,
): boolean {
  if (!change.hasLatestPosition) {
    return false;
  }

  if (!change.hasSentInitialFix) {
    return true;
  }

  const isSameVehicle = change.previousVehicleId === change.nextVehicleId;
  if (!isSameVehicle) {
    return false;
  }

  return (
    change.previousCrowding !== change.nextCrowding ||
    change.previousDirection !== change.nextDirection
  );
}

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
      credentials: "include",
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
 * using the Balanced cadence profile while `enabled` is true:
 *
 * - moving (`speed >= 2 m/s`): every 2s
 * - slow / stopped: every 5s
 * - background: every 10s best-effort
 * - immediate flush on duty start/stop, route change, crowding change,
 *   and heading changes greater than 15 degrees
 */
export function useGpsReporter(opts: GpsReporterOptions) {
  const latestPositionRef = useRef<GeolocationPosition | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSentInitialFixRef = useRef(false);
  const isReportingRef = useRef(false);
  const reportPromiseRef = useRef<Promise<ReportResult> | null>(null);
  const reportSequenceRef = useRef(0);
  const lastReportAtMsRef = useRef<number | null>(null);
  const lastReportedPositionTimestampRef = useRef<number | null>(null);
  const lastReportedHeadingRef = useRef<number | null>(null);
  const queuedImmediateReportRef = useRef(false);
  const activeVehicleIdRef = useRef<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const activeCrowdingRef = useRef<Vehicle["crowding"]>("normal");
  const activeDirectionRef = useRef<"outbound" | "inbound">("outbound");
  const optsRef = useRef(opts);
  const scheduleNextReportRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  const getCurrentTrackingMode = useCallback((): GpsReporterTrackingMode => {
    return getGpsReporterTrackingMode(
      typeof document === "undefined" ? "visible" : document.visibilityState,
    );
  }, []);

  const clearScheduledReport = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetCadenceState = useCallback(() => {
    clearScheduledReport();
    hasSentInitialFixRef.current = false;
    lastReportAtMsRef.current = null;
    lastReportedPositionTimestampRef.current = null;
    lastReportedHeadingRef.current = null;
    queuedImmediateReportRef.current = false;
  }, [clearScheduledReport]);

  const sendLatestPosition = useCallback((options?: SendLatestPositionOptions) => {
    clearScheduledReport();

    const pos = latestPositionRef.current;
    const sessionId = activeSessionIdRef.current;
    if (!pos || !sessionId) {
      return;
    }

    if (isReportingRef.current) {
      if (options?.force) {
        queuedImmediateReportRef.current = true;
      }
      return;
    }

    const isForced = options?.force === true;
    if (!isForced) {
      const intervalMs = getGpsReporterIntervalMs(
        pos.coords.speed,
        getCurrentTrackingMode(),
      );
      const lastReportAtMs = lastReportAtMsRef.current;
      const hasNewPosition =
        pos.timestamp !== lastReportedPositionTimestampRef.current;

      if (!hasNewPosition) {
        scheduleNextReportRef.current();
        return;
      }

      if (
        typeof lastReportAtMs === "number" &&
        Date.now() - lastReportAtMs < intervalMs
      ) {
        scheduleNextReportRef.current();
        return;
      }
    }

    isReportingRef.current = true;
    lastReportAtMsRef.current = Date.now();
    lastReportedPositionTimestampRef.current = pos.timestamp;
    lastReportedHeadingRef.current = normalizeHeading(pos.coords.heading);

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

        if (queuedImmediateReportRef.current) {
          queuedImmediateReportRef.current = false;
          sendLatestPosition({ force: true });
          return;
        }

        scheduleNextReportRef.current();
      });
  }, [clearScheduledReport, getCurrentTrackingMode]);

  const beginWatch = useCallback(() => {
    if (!("geolocation" in navigator)) {
      console.warn("[useGpsReporter] Geolocation not supported");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        latestPositionRef.current = position;

        if (!hasSentInitialFixRef.current) {
          hasSentInitialFixRef.current = true;
          sendLatestPosition({ force: true });
          return;
        }

        if (
          hasSignificantHeadingChange(
            lastReportedHeadingRef.current,
            position.coords.heading,
          )
        ) {
          sendLatestPosition({ force: true });
          return;
        }

        scheduleNextReportRef.current();
      },
      (err) => {
        console.warn("[useGpsReporter] watchPosition error:", err.message);
      },
      getGpsReporterWatchOptions(getCurrentTrackingMode()),
    );
  }, [getCurrentTrackingMode, sendLatestPosition]);

  const scheduleNextReport = useCallback(() => {
    clearScheduledReport();

    if (!optsRef.current.enabled || isReportingRef.current) {
      return;
    }

    const pos = latestPositionRef.current;
    const sessionId = activeSessionIdRef.current;
    if (!pos || !sessionId) {
      return;
    }

    const intervalMs = getGpsReporterIntervalMs(
      pos.coords.speed,
      getCurrentTrackingMode(),
    );
    const lastReportAtMs = lastReportAtMsRef.current;
    const elapsedMs =
      typeof lastReportAtMs === "number" ? Date.now() - lastReportAtMs : intervalMs;
    const delayMs = Math.max(0, intervalMs - elapsedMs);

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      sendLatestPosition();
    }, delayMs);
  }, [clearScheduledReport, getCurrentTrackingMode, sendLatestPosition]);

  scheduleNextReportRef.current = scheduleNextReport;

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    latestPositionRef.current = null;
    resetCadenceState();
    isReportingRef.current = reportPromiseRef.current !== null;
  }, [resetCadenceState]);

  const startWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      return;
    }

    beginWatch();
    scheduleNextReportRef.current();
  }, [beginWatch]);

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
    if (typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = () => {
      if (!optsRef.current.enabled) {
        return;
      }

      beginWatch();
      scheduleNextReportRef.current();
      sendLatestPosition();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [beginWatch, sendLatestPosition]);

  useEffect(() => {
    const previousVehicleId = activeVehicleIdRef.current;
    const previousSessionId = activeSessionIdRef.current;
    const previousCrowding = activeCrowdingRef.current;
    const previousDirection = activeDirectionRef.current;
    const pendingReport = reportPromiseRef.current;
    const nextCrowding = opts.crowding ?? "normal";
    const nextDirection = opts.direction ?? "outbound";

    if (!opts.enabled) {
      stopWatching();
      activeVehicleIdRef.current = null;
      activeSessionIdRef.current = null;
      activeCrowdingRef.current = "normal";
      activeDirectionRef.current = "outbound";
      stopVehicleSession(previousVehicleId, previousSessionId, pendingReport);
      return;
    }

    if (!previousSessionId || previousVehicleId !== opts.vehicleId) {
      activeSessionIdRef.current = createReporterSessionId();
      resetCadenceState();
    }

    activeVehicleIdRef.current = opts.vehicleId;
    activeCrowdingRef.current = nextCrowding;
    activeDirectionRef.current = nextDirection;
    startWatching();

    if (previousVehicleId && previousVehicleId !== opts.vehicleId) {
      stopVehicleSession(previousVehicleId, previousSessionId, pendingReport);
    }

    const crowdingChanged =
      previousVehicleId === opts.vehicleId && previousCrowding !== nextCrowding;
    const directionChanged =
      previousVehicleId === opts.vehicleId && previousDirection !== nextDirection;

    if (
      shouldForceGpsReportOnStateChange({
        previousVehicleId,
        nextVehicleId: opts.vehicleId,
        previousCrowding,
        nextCrowding,
        previousDirection,
        nextDirection,
        hasLatestPosition: latestPositionRef.current !== null,
        hasSentInitialFix: hasSentInitialFixRef.current,
      })
    ) {
      hasSentInitialFixRef.current = true;
      sendLatestPosition({ force: true });
      return;
    }

    scheduleNextReportRef.current();
  }, [
    opts.enabled,
    opts.vehicleId,
    opts.crowding,
    opts.direction,
    resetCadenceState,
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
      activeDirectionRef.current = "outbound";
      stopVehicleSession(activeVehicleId, activeSessionId, pendingReport);
    };
  }, [stopVehicleSession, stopWatching]);
}
