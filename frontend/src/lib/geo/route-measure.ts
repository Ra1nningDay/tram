import { distanceMeters } from "./distance";
import type { PolylineProjection } from "./polyline";

type LngLat = [number, number];

export type ClosedRouteMeasure = {
  segmentLengthsM: number[]; // length = coords.length (includes last->first)
  cumulativeM: number[]; // length = coords.length; at start of segment i
  totalLengthM: number;
};

export function buildClosedRouteMeasure(coords: LngLat[]): ClosedRouteMeasure {
  const n = coords.length;
  const segmentLengthsM = new Array<number>(n);
  const cumulativeM = new Array<number>(n);

  let total = 0;
  for (let i = 0; i < n; i++) {
    cumulativeM[i] = total;
    const a = coords[i];
    const b = coords[(i + 1) % n];
    const len = distanceMeters(a, b);
    segmentLengthsM[i] = len;
    total += len;
  }

  return { segmentLengthsM, cumulativeM, totalLengthM: total };
}

export function alongM(measure: ClosedRouteMeasure, proj: PolylineProjection): number {
  const seg = proj.segmentIndex;
  const base = measure.cumulativeM[seg] ?? 0;
  const segLen = measure.segmentLengthsM[seg] ?? 0;
  return base + proj.t * segLen;
}

export function forwardDistanceM(total: number, fromAlong: number, toAlong: number): number {
  if (total <= 0) return 0;
  const raw = (toAlong - fromAlong) % total;
  return raw < 0 ? raw + total : raw;
}

