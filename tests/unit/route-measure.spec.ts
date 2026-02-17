import { describe, it, expect } from "vitest";
import { buildClosedRouteMeasure, forwardDistanceM } from "../../src/lib/geo/route-measure";

describe("route-measure", () => {
  it("computes forward distance with wraparound", () => {
    const total = 100;
    expect(forwardDistanceM(total, 10, 40)).toBe(30);
    expect(forwardDistanceM(total, 90, 10)).toBe(20);
    expect(forwardDistanceM(total, 0, 0)).toBe(0);
  });

  it("buildClosedRouteMeasure produces positive total length", () => {
    const coords: [number, number][] = [
      [0, 0],
      [0.001, 0],
      [0.001, 0.001],
      [0, 0.001],
    ];
    const m = buildClosedRouteMeasure(coords);
    expect(m.totalLengthM).toBeGreaterThan(0);
    expect(m.segmentLengthsM.length).toBe(coords.length);
    expect(m.cumulativeM.length).toBe(coords.length);
  });
});

