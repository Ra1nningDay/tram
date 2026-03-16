import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_ARRIVAL_ALERT_THROTTLE_MS,
  buildArrivalAlertCopy,
  getArrivalAlertCandidates,
  triggerArrivalAlerts,
} from "../../src/hooks/useArrivalAlert";
import { formatWalkingTime, getWalkingTimeMin } from "../../src/lib/format-distance";

describe("walking time helpers", () => {
  it("rounds walking minutes up using 84 meters per minute", () => {
    expect(getWalkingTimeMin(1)).toBe(1);
    expect(getWalkingTimeMin(84)).toBe(1);
    expect(getWalkingTimeMin(85)).toBe(2);
    expect(getWalkingTimeMin(420)).toBe(5);
  });

  it("formats long walking times in hours", () => {
    expect(formatWalkingTime(85)).toBe("2 นาที");
    expect(formatWalkingTime(84 * 60)).toBe("1 ชม.");
    expect(formatWalkingTime(84 * 75)).toBe("1.3 ชม.");
  });
});

describe("arrival alerts", () => {
  it("picks only fresh ETAs inside the configured threshold", () => {
    expect(
      getArrivalAlertCandidates([
        { vehicle_id: "tram-1", eta_minutes: 2, status: "fresh" },
        { vehicle_id: "tram-2", eta_minutes: 4, status: "fresh" },
        { vehicle_id: "tram-3", eta_minutes: 1, status: "delayed" },
      ], 3),
    ).toEqual([{ vehicle_id: "tram-1", eta_minutes: 2, status: "fresh" }]);
  });

  it("builds Thai notification copy with the best available line label", () => {
    expect(
      buildArrivalAlertCopy(
        { vehicle_id: "tram-1", vehicle_label: "BUS_1", eta_minutes: 3, status: "fresh" },
        "อาคาร A",
      ),
    ).toEqual({
      title: "สาย BUS_1",
      body: "กำลังจะถึง อาคาร A ในอีก 3 นาที",
    });
  });

  it("triggers notifications once per vehicle within the throttle window", () => {
    const notify = vi.fn();
    const sentAtByKey = new Map<string, number>();
    const etas = [
      { vehicle_id: "tram-1", vehicle_label: "BUS_1", eta_minutes: 2, status: "fresh" as const },
      { vehicle_id: "tram-2", vehicle_label: "BUS_2", eta_minutes: 1, status: "fresh" as const },
    ];

    expect(
      triggerArrivalAlerts({
        etas,
        stopName: "อาคาร A",
        permission: "granted",
        nowMs: 10_000,
        sentAtByKey,
        notify,
      }),
    ).toBe(2);

    expect(notify).toHaveBeenCalledTimes(2);

    expect(
      triggerArrivalAlerts({
        etas,
        stopName: "อาคาร A",
        permission: "granted",
        nowMs: 10_000 + DEFAULT_ARRIVAL_ALERT_THROTTLE_MS - 1,
        sentAtByKey,
        notify,
      }),
    ).toBe(0);

    expect(notify).toHaveBeenCalledTimes(2);

    expect(
      triggerArrivalAlerts({
        etas,
        stopName: "อาคาร A",
        permission: "granted",
        nowMs: 10_000 + DEFAULT_ARRIVAL_ALERT_THROTTLE_MS,
        sentAtByKey,
        notify,
      }),
    ).toBe(2);

    expect(notify).toHaveBeenCalledTimes(4);
  });

  it("does not notify when permission is not granted", () => {
    const notify = vi.fn();

    expect(
      triggerArrivalAlerts({
        etas: [{ vehicle_id: "tram-1", eta_minutes: 1, status: "fresh" }],
        stopName: "อาคาร A",
        permission: "denied",
        sentAtByKey: new Map(),
        notify,
      }),
    ).toBe(0);

    expect(notify).not.toHaveBeenCalled();
  });
});
