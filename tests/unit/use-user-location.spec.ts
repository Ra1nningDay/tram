import { describe, expect, it } from "vitest";

import {
  getUserLocationTrackingMode,
  getUserLocationWatchOptions,
} from "../../src/hooks/useUserLocation";

describe("useUserLocation helpers", () => {
  it("maps hidden tabs to background mode", () => {
    expect(getUserLocationTrackingMode("hidden")).toBe("background");
    expect(getUserLocationTrackingMode("visible")).toBe("foreground");
    expect(getUserLocationTrackingMode(undefined)).toBe("foreground");
  });

  it("uses less aggressive geolocation options in the background", () => {
    const options = {
      enableHighAccuracy: true,
      maximumAge: 10_000,
      timeout: 15_000,
      backgroundEnableHighAccuracy: false,
      backgroundMaximumAge: 60_000,
      backgroundTimeout: 30_000,
    };

    expect(getUserLocationWatchOptions(options, "foreground")).toEqual({
      enableHighAccuracy: true,
      maximumAge: 10_000,
      timeout: 15_000,
    });

    expect(getUserLocationWatchOptions(options, "background")).toEqual({
      enableHighAccuracy: false,
      maximumAge: 60_000,
      timeout: 30_000,
    });
  });

  it("never makes background caching stricter than the foreground config", () => {
    const options = {
      enableHighAccuracy: true,
      maximumAge: 20_000,
      timeout: 18_000,
      backgroundEnableHighAccuracy: false,
      backgroundMaximumAge: 5_000,
      backgroundTimeout: 10_000,
    };

    expect(getUserLocationWatchOptions(options, "background")).toEqual({
      enableHighAccuracy: false,
      maximumAge: 20_000,
      timeout: 18_000,
    });
  });
});
