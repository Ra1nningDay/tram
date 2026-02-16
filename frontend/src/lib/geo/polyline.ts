type LngLat = [number, number];

export type SegmentProjection = {
  t: number; // 0-1
  point: LngLat;
  dist2: number; // degrees^2 (for nearest checks only)
};

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function projectPointToSegment(p: LngLat, a: LngLat, b: LngLat): SegmentProjection {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const apx = p[0] - a[0];
  const apy = p[1] - a[1];
  const denom = abx * abx + aby * aby;
  const t = denom <= 1e-18 ? 0 : clamp01((apx * abx + apy * aby) / denom);
  const point: LngLat = [a[0] + abx * t, a[1] + aby * t];
  const dx = p[0] - point[0];
  const dy = p[1] - point[1];
  return { t, point, dist2: dx * dx + dy * dy };
}

export type PolylineProjection = {
  segmentIndex: number; // segment from i -> i+1 (wrapping)
  t: number; // 0-1 on that segment
  point: LngLat;
  dist2: number;
};

// Uses wraparound segments (i -> (i+1)%len) to match the simulation behavior.
export function projectPointToPolyline(coords: LngLat[], p: LngLat): PolylineProjection {
  let best: PolylineProjection = {
    segmentIndex: 0,
    t: 0,
    point: coords[0],
    dist2: Number.POSITIVE_INFINITY,
  };
  const len = coords.length;
  for (let i = 0; i < len; i++) {
    const j = (i + 1) % len;
    const a = coords[i];
    const b = coords[j];
    const proj = projectPointToSegment(p, a, b);
    if (proj.dist2 < best.dist2) {
      best = { segmentIndex: i, t: proj.t, point: proj.point, dist2: proj.dist2 };
    }
  }
  return best;
}

