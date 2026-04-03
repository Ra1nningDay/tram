import { describe, expect, it } from "vitest";

import { computeTelemetry } from "../../src/hooks/useGpsReplay";

describe("vehicle telemetry", () => {
  it("preserves driver-reported crowding when computing panel telemetry", () => {
    const telemetry = computeTelemetry("TRAM-8", "TRAM-8", 100, 12, "full");

    expect(telemetry.crowding).toBe("full");
    expect(telemetry.status).toBe("normal");
  });
});
