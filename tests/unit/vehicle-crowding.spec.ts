import { describe, expect, it } from "vitest";

import { getCrowdingDisplay } from "../../src/lib/vehicles/crowding";

describe("getCrowdingDisplay", () => {
  it("returns full when the driver marks the vehicle as full", () => {
    expect(getCrowdingDisplay("full")).toEqual({
      label: "คนเต็ม",
      level: 3,
      color: "#EF4444",
    });
  });

  it("stays normal when no crowding status is provided", () => {
    expect(getCrowdingDisplay()).toEqual({
      label: "ปกติ",
      level: 1,
      color: "#22C55E",
    });
  });

  it("stays normal when the driver marks the vehicle as normal", () => {
    expect(getCrowdingDisplay("normal")).toEqual({
      label: "ปกติ",
      level: 1,
      color: "#22C55E",
    });
  });
});
