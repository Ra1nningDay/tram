import type { Eta, VehicleTelemetry } from "@/features/shuttle/api";
import {
  ETA_AT_STOP_DISTANCE_M,
  ETA_MIN_SPEED_MPS,
  getTelemetryRouteContext,
  isEtaEligible,
  type TelemetryRouteContext,
  type LiveVehicleTelemetryState,
} from "@/lib/vehicles/telemetry";
import { forwardDistanceM } from "@/lib/geo/route-measure";

export type StopEtaDetails = Eta & {
  distance_meters?: number;
  speed_kph?: number;
  eta_confidence?: number;
};

export type VehicleEtaSnapshot = {
  etasByStopId: Record<string, StopEtaDetails[]>;
  telemetryByVehicleId: Record<string, VehicleTelemetry>;
};

function buildUnknownEta(
  telemetry: LiveVehicleTelemetryState,
  stopId: string,
  distanceMeters: number,
): StopEtaDetails {
  return {
    stop_id: stopId,
    vehicle_id: telemetry.snapshot.id,
    vehicle_label: telemetry.snapshot.label,
    line_name: telemetry.snapshot.label,
    eta_minutes: -1,
    last_updated: telemetry.snapshot.last_updated,
    status: telemetry.snapshot.status,
    distance_meters: Math.round(distanceMeters),
    speed_kph: telemetry.speedEmaKph,
    eta_confidence: telemetry.snapshot.etaConfidence,
  };
}

export async function buildVehicleEtaSnapshot(
  telemetryStates: LiveVehicleTelemetryState[],
  now: Date = new Date(),
  routeContextOverride?: TelemetryRouteContext,
): Promise<VehicleEtaSnapshot> {
  const routeContext = routeContextOverride ?? (await getTelemetryRouteContext());
  const etasByStopId: Record<string, StopEtaDetails[]> = {};
  const telemetryByVehicleId: Record<string, VehicleTelemetry> = {};

  for (const telemetry of telemetryStates) {
    const directionContext = routeContext[telemetry.direction];
    if (!directionContext || typeof telemetry.routeDistanceM !== "number") {
      telemetryByVehicleId[telemetry.snapshot.id] = {
        vehicleId: telemetry.snapshot.id,
        label: telemetry.snapshot.label ?? telemetry.snapshot.id,
        speedKmh: telemetry.speedEmaKph,
        distanceToNextStopM: 0,
        progressPercent: 0,
        prevStopName: "--",
        status: "warning",
        crowding: telemetry.snapshot.crowding,
        etaConfidence: telemetry.snapshot.etaConfidence,
      };
      continue;
    }

    const vehicleAlong =
      ((telemetry.routeDistanceM % directionContext.measure.totalLengthM) +
        directionContext.measure.totalLengthM) %
      directionContext.measure.totalLengthM;
    const etaAllowed = isEtaEligible(telemetry.snapshot.status, telemetry);

    let nextStopIndex = -1;
    let nextStopDistanceM = Number.POSITIVE_INFINITY;

    for (let index = 0; index < directionContext.stops.length; index += 1) {
      const stop = directionContext.stops[index];
      const distanceToStopM = forwardDistanceM(
        directionContext.measure.totalLengthM,
        vehicleAlong,
        stop.alongM,
      );

      if (distanceToStopM < nextStopDistanceM) {
        nextStopDistanceM = distanceToStopM;
        nextStopIndex = index;
      }
    }

    const nextStop =
      nextStopIndex >= 0 ? directionContext.stops[nextStopIndex] : undefined;
    const prevStop =
      nextStopIndex >= 0
        ? directionContext.stops[
            (nextStopIndex - 1 + directionContext.stops.length) %
              directionContext.stops.length
          ]
        : undefined;

    let progressPercent = 0;
    if (nextStop && prevStop) {
      const segmentLengthM = forwardDistanceM(
        directionContext.measure.totalLengthM,
        prevStop.alongM,
        nextStop.alongM,
      );
      const traveledM = forwardDistanceM(
        directionContext.measure.totalLengthM,
        prevStop.alongM,
        vehicleAlong,
      );
      progressPercent =
        segmentLengthM > 0
          ? Math.round((Math.min(traveledM, segmentLengthM) / segmentLengthM) * 100)
          : 0;
    }

    let nextStopTelemetry: VehicleTelemetry | undefined;

    for (const stop of directionContext.stops) {
      const distanceToStopM = forwardDistanceM(
        directionContext.measure.totalLengthM,
        vehicleAlong,
        stop.alongM,
      );
      const stopProximityM = Math.min(
        distanceToStopM,
        directionContext.measure.totalLengthM - distanceToStopM,
      );
      const atStop = stopProximityM <= ETA_AT_STOP_DISTANCE_M;
      const effectiveDistanceToStopM = atStop ? 0 : distanceToStopM;
      const etaSeconds =
        atStop
          ? 0
          : etaAllowed
            ? effectiveDistanceToStopM / (telemetry.speedEmaKph / 3.6)
            : undefined;

      const row =
        typeof etaSeconds === "number"
          ? {
              stop_id: stop.id,
              vehicle_id: telemetry.snapshot.id,
              vehicle_label: telemetry.snapshot.label,
              line_name: telemetry.snapshot.label,
              eta_minutes: Math.max(0, Math.ceil(etaSeconds / 60)),
              arrival_time: new Date(now.getTime() + etaSeconds * 1000).toISOString(),
              last_updated: telemetry.snapshot.last_updated,
              status: telemetry.snapshot.status,
              distance_meters: Math.round(effectiveDistanceToStopM),
              speed_kph: telemetry.speedEmaKph,
              eta_confidence: telemetry.snapshot.etaConfidence,
            }
          : buildUnknownEta(telemetry, stop.id, effectiveDistanceToStopM);

      (etasByStopId[stop.id] ??= []).push(row);

      if (nextStop && stop.id === nextStop.id) {
        nextStopTelemetry = {
          vehicleId: telemetry.snapshot.id,
          label: telemetry.snapshot.label ?? telemetry.snapshot.id,
          speedKmh: telemetry.speedEmaKph,
          nextStopId: stop.id,
          nextStopName: stop.nameTh,
          nextStopNameEn: stop.nameEn,
          distanceToNextStopM: Math.round(effectiveDistanceToStopM),
          etaToNextStopS: etaSeconds,
          arrivalTime:
            typeof etaSeconds === "number"
              ? new Date(now.getTime() + etaSeconds * 1000).toISOString()
              : undefined,
          progressPercent: Math.max(0, Math.min(100, progressPercent)),
          prevStopName: prevStop?.nameTh ?? "--",
          status:
            telemetry.speedEmaKph / 3.6 > ETA_MIN_SPEED_MPS &&
            (telemetry.snapshot.etaConfidence ?? 0) > 0.35
              ? "normal"
              : "warning",
          crowding: telemetry.snapshot.crowding,
          etaConfidence: telemetry.snapshot.etaConfidence,
        };
      }
    }

    telemetryByVehicleId[telemetry.snapshot.id] =
      nextStopTelemetry ?? {
        vehicleId: telemetry.snapshot.id,
        label: telemetry.snapshot.label ?? telemetry.snapshot.id,
        speedKmh: telemetry.speedEmaKph,
        distanceToNextStopM: 0,
        progressPercent: 0,
        prevStopName: prevStop?.nameTh ?? "--",
        status: "warning",
        crowding: telemetry.snapshot.crowding,
        etaConfidence: telemetry.snapshot.etaConfidence,
      };
  }

  for (const stopId of Object.keys(etasByStopId)) {
    etasByStopId[stopId].sort((left, right) => {
      const leftKnown = left.status === "fresh" && left.eta_minutes >= 0;
      const rightKnown = right.status === "fresh" && right.eta_minutes >= 0;

      if (leftKnown !== rightKnown) {
        return leftKnown ? -1 : 1;
      }

      if (leftKnown && rightKnown) {
        if (left.eta_minutes !== right.eta_minutes) {
          return left.eta_minutes - right.eta_minutes;
        }
      }

      const leftDistance =
        typeof left.distance_meters === "number" ? left.distance_meters : Number.POSITIVE_INFINITY;
      const rightDistance =
        typeof right.distance_meters === "number" ? right.distance_meters : Number.POSITIVE_INFINITY;

      return leftDistance - rightDistance;
    });

    etasByStopId[stopId] = etasByStopId[stopId].slice(0, 3);
  }

  return { etasByStopId, telemetryByVehicleId };
}
