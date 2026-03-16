import { describe, it, expect } from "vitest";
import { formatDistance } from "../../src/lib/format-distance";

describe("formatDistance", () => {
  it("formats short distances in meters", () => {
    expect(formatDistance(0)).toBe("0 ม.");
    expect(formatDistance(85)).toBe("85 ม.");
    expect(formatDistance(999)).toBe("999 ม.");
  });

  it("formats long distances in kilometers", () => {
    expect(formatDistance(1000)).toBe("1.0 กม.");
    expect(formatDistance(1234)).toBe("1.2 กม.");
    expect(formatDistance(5678)).toBe("5.7 กม.");
  });

  it("rounds meters to whole numbers", () => {
    expect(formatDistance(85.7)).toBe("86 ม.");
    expect(formatDistance(0.4)).toBe("0 ม.");
  });
});
