import { useEffect, useRef } from "react";

import type { Eta, Status } from "@/features/shuttle/api";

export const DEFAULT_ARRIVAL_ALERT_THRESHOLD_MIN = 3;
export const DEFAULT_ARRIVAL_ALERT_THROTTLE_MS = 90_000;

export type ArrivalAlertEta = Pick<Eta, "eta_minutes" | "status" | "vehicle_id"> & {
  vehicle_label?: string;
  line_name?: string;
};

type ArrivalAlertCopy = {
  title: string;
  body: string;
};

type TriggerArrivalAlertsParams = {
  etas?: ReadonlyArray<ArrivalAlertEta>;
  stopName?: string;
  thresholdMin?: number;
  throttleMs?: number;
  nowMs?: number;
  permission: NotificationPermission;
  sentAtByKey: Map<string, number>;
  notify: (title: string, options?: NotificationOptions) => void;
};

type UseArrivalAlertParams = {
  etas?: ReadonlyArray<ArrivalAlertEta>;
  stopName?: string;
  thresholdMin?: number;
  throttleMs?: number;
  enabled?: boolean;
};

function isEtaEligibleForArrivalAlert(status: Status, etaMinutes: number, thresholdMin: number): boolean {
  return status === "fresh" && etaMinutes >= 0 && etaMinutes <= thresholdMin;
}

export function getArrivalAlertCandidates(
  etas: ReadonlyArray<ArrivalAlertEta>,
  thresholdMin: number = DEFAULT_ARRIVAL_ALERT_THRESHOLD_MIN,
): ArrivalAlertEta[] {
  return etas.filter((eta) => isEtaEligibleForArrivalAlert(eta.status, eta.eta_minutes, thresholdMin));
}

export function getArrivalAlertLineLabel(eta: ArrivalAlertEta): string {
  return eta.line_name ?? eta.vehicle_label ?? eta.vehicle_id ?? "รถรับส่ง";
}

export function getArrivalAlertThrottleKey(eta: ArrivalAlertEta, stopName: string): string {
  return `${stopName}::${eta.vehicle_id ?? eta.vehicle_label ?? eta.line_name ?? "unknown"}`;
}

export function shouldThrottleArrivalAlert(
  lastSentAt: number | undefined,
  nowMs: number,
  throttleMs: number = DEFAULT_ARRIVAL_ALERT_THROTTLE_MS,
): boolean {
  return typeof lastSentAt === "number" && nowMs - lastSentAt < throttleMs;
}

export function buildArrivalAlertCopy(eta: ArrivalAlertEta, stopName: string): ArrivalAlertCopy {
  return {
    title: `สาย ${getArrivalAlertLineLabel(eta)}`,
    body: `กำลังจะถึง ${stopName} ในอีก ${eta.eta_minutes} นาที`,
  };
}

export function triggerArrivalAlerts({
  etas = [],
  stopName,
  thresholdMin = DEFAULT_ARRIVAL_ALERT_THRESHOLD_MIN,
  throttleMs = DEFAULT_ARRIVAL_ALERT_THROTTLE_MS,
  nowMs = Date.now(),
  permission,
  sentAtByKey,
  notify,
}: TriggerArrivalAlertsParams): number {
  if (permission !== "granted" || !stopName || etas.length === 0) {
    return 0;
  }

  let alertCount = 0;

  for (const eta of getArrivalAlertCandidates(etas, thresholdMin)) {
    const key = getArrivalAlertThrottleKey(eta, stopName);
    const lastSentAt = sentAtByKey.get(key);

    if (shouldThrottleArrivalAlert(lastSentAt, nowMs, throttleMs)) {
      continue;
    }

    const copy = buildArrivalAlertCopy(eta, stopName);
    notify(copy.title, { body: copy.body });
    sentAtByKey.set(key, nowMs);
    alertCount += 1;
  }

  return alertCount;
}

export function useArrivalAlert({
  etas,
  stopName,
  thresholdMin = DEFAULT_ARRIVAL_ALERT_THRESHOLD_MIN,
  throttleMs = DEFAULT_ARRIVAL_ALERT_THROTTLE_MS,
  enabled = true,
}: UseArrivalAlertParams) {
  const sentAtByKeyRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    const permission = window.Notification.permission;
    if (permission !== "granted") {
      return;
    }

    triggerArrivalAlerts({
      etas,
      stopName,
      thresholdMin,
      throttleMs,
      permission,
      sentAtByKey: sentAtByKeyRef.current,
      notify: (title, options) => {
        try {
          new window.Notification(title, options);
        } catch {
          // Ignore browsers that reject notification creation at runtime.
        }
      },
    });
  }, [enabled, etas, stopName, thresholdMin, throttleMs]);
}
