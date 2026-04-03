import { describe, expect, it, vi } from "vitest";

import { finalizeGpsReporterStop } from "../../src/features/shuttle/useGpsReporter";

describe("gps reporter stop sequencing", () => {
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
