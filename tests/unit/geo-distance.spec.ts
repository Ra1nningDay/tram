import { describe, it, expect } from "vitest";
import { haversineM, distanceMeters } from "../../src/lib/geo/distance";

describe("geo/distance", () => {
  // Two BU campus stops (approximate coords from shuttle-data)
  const stopA: [number, number] = [100.4942, 13.9124]; // [lng, lat]
  const stopB: [number, number] = [100.4968, 13.9141]; // ~300m away

  describe("haversineM", () => {
    it("returns 0 for the same point", () => {
      expect(haversineM(stopA, stopA)).toBe(0);
    });

    it("returns a positive distance for different points", () => {
      const d = haversineM(stopA, stopB);
      expect(d).toBeGreaterThan(200);
      expect(d).toBeLessThan(500);
    });

    it("is symmetric (a→b equals b→a)", () => {
      const ab = haversineM(stopA, stopB);
      const ba = haversineM(stopB, stopA);
      expect(ab).toBeCloseTo(ba, 6);
    });

    it("matches known distance (Bangkok ↔ Chiang Mai ≈ 585 km)", () => {
      const bkk: [number, number] = [100.5018, 13.7563];
      const cnx: [number, number] = [98.9817, 18.7883];
      const d = haversineM(bkk, cnx);
      expect(d / 1000).toBeGreaterThan(560);
      expect(d / 1000).toBeLessThan(610);
    });
  });

  describe("distanceMeters", () => {
    it("returns 0 for the same point", () => {
      expect(distanceMeters(stopA, stopA)).toBe(0);
    });

    it("is close to haversineM for short distances", () => {
      const h = haversineM(stopA, stopB);
      const d = distanceMeters(stopA, stopB);
      // Equirectangular approximation should be within 1% for campus scale
      expect(Math.abs(h - d) / h).toBeLessThan(0.01);
    });
  });
});
