import { describe, it, expect } from "vitest";
import { deriveStatus } from "../../src/services/status";

const now = new Date("2026-02-01T00:00:30.000Z");

describe("status thresholds", () => {
  it("marks fresh <= 15s", () => {
    const status = deriveStatus("2026-02-01T00:00:20.000Z", now);
    expect(status).toBe("fresh");
  });

  it("marks delayed > 15s", () => {
    const status = deriveStatus("2026-02-01T00:00:00.000Z", now);
    expect(status).toBe("delayed");
  });
});