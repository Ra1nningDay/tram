import { describe, expect, it } from "vitest";

import { normalizeHardwareFeed } from "../../src/lib/vehicles/hardware";

describe("hardware feed normalizer", () => {
  it("parses mixed schemas, filters null entries, and converts km/h to m/s", () => {
    const payload = [
      null,
      {
        "tram-geo-info": {
          direction: "S",
          heading_degrees: 192.92,
          latitude: 14.040725033,
          longitude: 100.610724183,
          speed_kmh: 6.6672,
          updatedAt: 1775019083210,
        },
        "tram-status": {
          "tram-id": 1,
          "tram-state": "in_use",
        },
      },
      {
        Tram_GEO_Info: {
          accuracy: 1.8,
          direction: "E",
          heading: 103,
          latitude: 14.03974,
          longitude: 100.6031283,
          speed: 14.53,
        },
        Tram_Info: {
          hardware_id: "HWID-2",
          id: "TRAM-02",
          status: "Active",
        },
        application_update: "2026-02-23T18:59:13.615075",
      },
    ];

    const records = normalizeHardwareFeed(payload, new Date("2026-04-04T10:00:00.000Z"));

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      hardwareVehicleId: "1",
      heading: 192.92,
      operationalStatus: "active",
      observedAt: "2026-04-01T04:51:23.210Z",
    });
    expect(records[0]?.speedMps).toBeCloseTo(1.852, 3);
    expect(records[1]).toMatchObject({
      hardwareVehicleId: "TRAM-02",
      hardwareId: "HWID-2",
      accuracyM: 1.8,
      observedAt: "2026-02-23T18:59:13.615Z",
      operationalStatus: "active",
    });
    expect(records[1]?.speedMps).toBeCloseTo(4.036, 3);
  });
});
