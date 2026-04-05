import { OFF_ROUTE_CORRIDOR_M, type LiveVehicleTelemetryState } from "@/lib/vehicles/telemetry";
import {
  type SourceVehicleState,
  type VehicleSource,
  type VehicleSourceResolutionState,
} from "@/lib/vehicles/source-state";
import { deriveVehicleStatus, getVehicleAgeMs } from "@/lib/vehicles/status";

const WINNER_SCORE_FLOOR = 0.35;
const SWITCH_SCORE_DELTA = 0.15;
const REQUIRED_CHALLENGER_STREAK = 2;

type SourceVehicleCandidate = {
  state: SourceVehicleState;
  status: ReturnType<typeof deriveVehicleStatus>;
  score: number;
};

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getFreshnessScore(ageMs: number) {
  if (ageMs <= 6_000) return 1;
  if (ageMs <= 15_000) return 0.6;
  if (ageMs <= 60_000) return 0.2;
  return 0;
}

function getRouteFitScore(offRouteDistanceM?: number) {
  if (typeof offRouteDistanceM !== "number") return 0;
  if (offRouteDistanceM <= 8) return 1;
  if (offRouteDistanceM <= OFF_ROUTE_CORRIDOR_M) return 0.6;
  return 0;
}

function getAccuracyScore(accuracyM?: number) {
  if (typeof accuracyM !== "number") return 0.3;
  if (accuracyM <= 5) return 1;
  if (accuracyM <= 15) return 0.6;
  return 0;
}

function getContinuityScore(state: SourceVehicleState) {
  const instantaneousSpeedKph = state.telemetry.instantaneousAlongRouteSpeedKph;
  if (typeof instantaneousSpeedKph !== "number") return 1;
  if (instantaneousSpeedKph <= 45) return 1;
  if (instantaneousSpeedKph <= 80) return 0.4;
  return 0;
}

function getCadenceScore(ageMs: number, source: VehicleSource) {
  const expectedIntervalMs = source === "hardware" ? 3_000 : 5_000;
  if (ageMs <= expectedIntervalMs * 1.5) return 1;
  if (ageMs <= expectedIntervalMs * 3) return 0.5;
  return 0;
}

function computeSourceScore(state: SourceVehicleState, nowMs: number) {
  const ageMs = getVehicleAgeMs(state.telemetry.snapshot.last_updated, nowMs);
  const freshness = getFreshnessScore(ageMs);
  const routeFit = getRouteFitScore(state.telemetry.offRouteDistanceM);
  const accuracy = getAccuracyScore(state.accuracyM);
  const continuity = getContinuityScore(state);
  const cadence = getCadenceScore(ageMs, state.source);

  return roundTo(
    freshness * 0.35 +
      routeFit * 0.25 +
      accuracy * 0.15 +
      continuity * 0.15 +
      cadence * 0.1,
    2,
  );
}

function preferSource(left: SourceVehicleCandidate, right: SourceVehicleCandidate) {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  if (left.state.source === right.state.source) {
    return 0;
  }

  return left.state.source === "hardware" ? -1 : 1;
}

function buildCandidate(
  state: SourceVehicleState,
  nowMs: number,
): SourceVehicleCandidate {
  const status = deriveVehicleStatus(state.telemetry.snapshot.last_updated, nowMs);
  return {
    state,
    status,
    score: computeSourceScore(state, nowMs),
  };
}

function buildMergedTelemetryState(
  selected: SourceVehicleCandidate,
  driverCandidate: SourceVehicleCandidate | undefined,
): LiveVehicleTelemetryState {
  const driverCrowding =
    driverCandidate?.status === "fresh"
      ? driverCandidate.state.crowding ?? driverCandidate.state.telemetry.snapshot.crowding
      : undefined;
  const crowding =
    driverCrowding ??
    selected.state.crowding ??
    selected.state.telemetry.snapshot.crowding;

  return {
    ...selected.state.telemetry,
    snapshot: {
      ...selected.state.telemetry.snapshot,
      status: selected.status,
      crowding,
      telemetrySource: selected.state.source,
      sourceConfidence: selected.score,
    },
  };
}

export function mergeVehicleSourceStates(params: {
  vehicleId: string;
  states: SourceVehicleState[];
  previousResolution?: VehicleSourceResolutionState;
  nowMs?: number;
}): {
  telemetryState: LiveVehicleTelemetryState | null;
  resolutionState: VehicleSourceResolutionState | null;
} {
  const nowMs = params.nowMs ?? Date.now();
  const candidates = params.states
    .map((state) => buildCandidate(state, nowMs))
    .filter((candidate) => candidate.status !== "hidden")
    .sort(preferSource);

  if (candidates.length === 0) {
    return {
      telemetryState: null,
      resolutionState: null,
    };
  }

  const bestCandidate = candidates[0];
  const previousWinner = params.previousResolution
    ? candidates.find(
        (candidate) => candidate.state.source === params.previousResolution?.winnerSource,
      )
    : undefined;

  let selectedCandidate = bestCandidate;
  let nextResolutionState: VehicleSourceResolutionState = {
    vehicleId: params.vehicleId,
    winnerSource: bestCandidate.state.source,
    challengerSource: undefined,
    challengerStreak: 0,
    winnerScore: bestCandidate.score,
    lastResolvedAt: new Date(nowMs).toISOString(),
  };

  if (previousWinner) {
    if (
      previousWinner.score >= WINNER_SCORE_FLOOR &&
      bestCandidate.state.source !== previousWinner.state.source
    ) {
      const scoreDelta = roundTo(bestCandidate.score - previousWinner.score, 2);
      if (scoreDelta > SWITCH_SCORE_DELTA) {
        const challengerStreak =
          params.previousResolution?.challengerSource === bestCandidate.state.source
            ? params.previousResolution.challengerStreak + 1
            : 1;

        if (challengerStreak < REQUIRED_CHALLENGER_STREAK) {
          selectedCandidate = previousWinner;
          nextResolutionState = {
            vehicleId: params.vehicleId,
            winnerSource: previousWinner.state.source,
            challengerSource: bestCandidate.state.source,
            challengerStreak,
            winnerScore: previousWinner.score,
            lastResolvedAt: new Date(nowMs).toISOString(),
          };
        }
      }
    } else if (bestCandidate.state.source === previousWinner.state.source) {
      selectedCandidate = previousWinner;
      nextResolutionState = {
        vehicleId: params.vehicleId,
        winnerSource: previousWinner.state.source,
        challengerSource: undefined,
        challengerStreak: 0,
        winnerScore: previousWinner.score,
        lastResolvedAt: new Date(nowMs).toISOString(),
      };
    }

    if (previousWinner.score < WINNER_SCORE_FLOOR) {
      selectedCandidate = bestCandidate;
      nextResolutionState = {
        vehicleId: params.vehicleId,
        winnerSource: bestCandidate.state.source,
        challengerSource: undefined,
        challengerStreak: 0,
        winnerScore: bestCandidate.score,
        lastResolvedAt: new Date(nowMs).toISOString(),
      };
    }
  }

  const driverCandidate = candidates.find(
    (candidate) => candidate.state.source === "driver",
  );

  return {
    telemetryState: buildMergedTelemetryState(selectedCandidate, driverCandidate),
    resolutionState: nextResolutionState,
  };
}
