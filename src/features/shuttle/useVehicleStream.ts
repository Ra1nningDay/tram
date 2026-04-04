"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Vehicle, VehicleFeedSnapshot, VehicleTelemetry } from "@/features/shuttle/api";

type StreamState = {
  vehicles: Vehicle[];
  telemetryByVehicleId: Record<string, VehicleTelemetry>;
  serverTime: string | null;
  connected: boolean;
  hasReceivedSnapshot: boolean;
};

type SSEPayload = VehicleFeedSnapshot;

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const STREAM_PATH = "/api/vehicles/stream";

/**
 * useVehicleStream — connects to the SSE endpoint and returns live vehicle data.
 *
 * Features:
 * - Sends initial snapshot immediately on connect
 * - Auto-reconnects with exponential backoff on error / close
 * - Pauses when tab is hidden (browser EventSource continues by default)
 */
export function useVehicleStream(enabled = true): StreamState {
  const [state, setState] = useState<StreamState>({
    vehicles: [],
    telemetryByVehicleId: {},
    serverTime: null,
    connected: false,
    hasReceivedSnapshot: false,
  });

  const esRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (typeof EventSource === "undefined") return; // SSR guard

    // Close any previous connection
    esRef.current?.close();

    const es = new EventSource(STREAM_PATH);
    esRef.current = es;

    es.onopen = () => {
      retryCountRef.current = 0;
      setState((prev) => ({ ...prev, connected: true }));
    };

    es.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as SSEPayload;
        setState({
          vehicles: payload.vehicles,
          telemetryByVehicleId: payload.telemetryByVehicleId ?? {},
          serverTime: payload.server_time,
          connected: true,
          hasReceivedSnapshot: true,
        });
      } catch {
        // malformed frame — ignore
      }
    };

    es.onerror = () => {
      es.close();
      setState((prev) => ({ ...prev, connected: false }));

      // Exponential backoff
      const delay = Math.min(
        RECONNECT_BASE_MS * 2 ** retryCountRef.current,
        RECONNECT_MAX_MS,
      );
      retryCountRef.current += 1;

      retryTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [enabled]);

  useEffect(() => {
    connect();

    return () => {
      esRef.current?.close();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      setState({
        vehicles: [],
        telemetryByVehicleId: {},
        serverTime: null,
        connected: false,
        hasReceivedSnapshot: false,
      });
    };
  }, [connect]);

  return state;
}
