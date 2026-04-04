import { describe, expect, it, vi } from "vitest";

import {
  finalizeGpsReporterStop,
  getGpsReporterIntervalMs,
  getGpsReporterTrackingMode,
  getGpsReporterWatchOptions,
  hasSignificantHeadingChange,
  GPS_REPORT_INTERVAL_BACKGROUND_MS,
  GPS_REPORT_INTERVAL_IDLE_MS,
  GPS_REPORT_INTERVAL_MOVING_MS,
  shouldForceGpsReportOnStateChange,
} from "../../src/features/shuttle/useGpsReporter";

describe("gps reporter stop sequencing", () => {
  it("uses balanced cadence intervals for foreground and background reporting", () => {
    expect(getGpsReporterIntervalMs(2, "foreground")).toBe(
      GPS_REPORT_INTERVAL_MOVING_MS,
    );
    expect(getGpsReporterIntervalMs(3.4, "foreground")).toBe(
      GPS_REPORT_INTERVAL_MOVING_MS,
    );
    expect(getGpsReporterIntervalMs(1.9, "foreground")).toBe(
      GPS_REPORT_INTERVAL_IDLE_MS,
    );
    expect(getGpsReporterIntervalMs(undefined, "foreground")).toBe(
      GPS_REPORT_INTERVAL_IDLE_MS,
    );
    expect(getGpsReporterIntervalMs(4.5, "background")).toBe(
      GPS_REPORT_INTERVAL_BACKGROUND_MS,
    );
  });

  it("derives tracking mode and watch options from page visibility", () => {
    expect(getGpsReporterTrackingMode("visible")).toBe("foreground");
    expect(getGpsReporterTrackingMode("hidden")).toBe("background");
    expect(getGpsReporterWatchOptions("foreground")).toEqual({
      enableHighAccuracy: true,
      maximumAge: 4_000,
      timeout: 10_000,
    });
    expect(getGpsReporterWatchOptions("background")).toEqual({
      enableHighAccuracy: false,
      maximumAge: 10_000,
      timeout: 20_000,
    });
  });

  it("treats heading changes strictly above 15 degrees as immediate flushes", () => {
    expect(hasSignificantHeadingChange(90, 105)).toBe(false);
    expect(hasSignificantHeadingChange(90, 106)).toBe(true);
    expect(hasSignificantHeadingChange(350, 5)).toBe(false);
    expect(hasSignificantHeadingChange(350, 10)).toBe(true);
    expect(hasSignificantHeadingChange(undefined, 180)).toBe(false);
  });

  it("forces immediate reports on first fix, crowding change, and route change", () => {
    expect(
      shouldForceGpsReportOnStateChange({
        previousVehicleId: null,
        nextVehicleId: "TRAM-8",
        previousCrowding: "normal",
        nextCrowding: "normal",
        previousDirection: "outbound",
        nextDirection: "outbound",
        hasLatestPosition: true,
        hasSentInitialFix: false,
      }),
    ).toBe(true);

    expect(
      shouldForceGpsReportOnStateChange({
        previousVehicleId: "TRAM-8",
        nextVehicleId: "TRAM-8",
        previousCrowding: "normal",
        nextCrowding: "full",
        previousDirection: "outbound",
        nextDirection: "outbound",
        hasLatestPosition: true,
        hasSentInitialFix: true,
      }),
    ).toBe(true);

    expect(
      shouldForceGpsReportOnStateChange({
        previousVehicleId: "TRAM-8",
        nextVehicleId: "TRAM-8",
        previousCrowding: "full",
        nextCrowding: "full",
        previousDirection: "outbound",
        nextDirection: "inbound",
        hasLatestPosition: true,
        hasSentInitialFix: true,
      }),
    ).toBe(true);

    expect(
      shouldForceGpsReportOnStateChange({
        previousVehicleId: "TRAM-8",
        nextVehicleId: "TRAM-9",
        previousCrowding: "normal",
        nextCrowding: "full",
        previousDirection: "outbound",
        nextDirection: "inbound",
        hasLatestPosition: true,
        hasSentInitialFix: true,
      }),
    ).toBe(false);
  });

  it("waits for the pending GPS report before stopping the session", async () => {
    const steps: string[] = [];
    let resolvePendingReport!: () => void;
    const pendingReport = new Promise<void>((resolve) => {
      resolvePendingReport = () => {
        steps.push("report");
        resolve();
      };
    });
    const stop = vi.fn(async () => {
      steps.push("stop");
    });

    const stopPromise = finalizeGpsReporterStop(pendingReport, stop);
    steps.push("queued");

    expect(stop).not.toHaveBeenCalled();

    resolvePendingReport();
    await stopPromise;

    expect(stop).toHaveBeenCalledTimes(1);
    expect(steps).toEqual(["queued", "report", "stop"]);
  });

  it("still stops even when the pending GPS report fails", async () => {
    const stop = vi.fn(async () => undefined);

    await finalizeGpsReporterStop(Promise.reject(new Error("network error")), stop);

    expect(stop).toHaveBeenCalledTimes(1);
  });
});
