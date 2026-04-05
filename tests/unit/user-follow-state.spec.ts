import { describe, expect, it } from "vitest";

import {
  getUserTrackingToggleAction,
  shouldDriveUserFollowFrame,
  shouldPauseUserFollowOnViewportChange,
} from "../../src/features/map/user-follow-state";

describe("user follow state", () => {
  it("resolves the locate button action for start, resume, and stop", () => {
    expect(getUserTrackingToggleAction(false, false)).toBe("start");
    expect(getUserTrackingToggleAction(true, false)).toBe("resume");
    expect(getUserTrackingToggleAction(true, true)).toBe("stop");
  });

  it("pauses follow only for manual viewport changes", () => {
    expect(
      shouldPauseUserFollowOnViewportChange({
        isTrackingLocation: true,
        isUserFollowActive: true,
        isProgrammaticViewportChange: false,
      }),
    ).toBe(true);

    expect(
      shouldPauseUserFollowOnViewportChange({
        isTrackingLocation: true,
        isUserFollowActive: true,
        isProgrammaticViewportChange: true,
      }),
    ).toBe(false);

    expect(
      shouldPauseUserFollowOnViewportChange({
        isTrackingLocation: false,
        isUserFollowActive: true,
        isProgrammaticViewportChange: false,
      }),
    ).toBe(false);
  });

  it("only drives follow frames when tracking, follow, and a target are all present", () => {
    expect(
      shouldDriveUserFollowFrame({
        isTrackingLocation: true,
        isUserFollowActive: true,
        hasDisplayLocation: true,
      }),
    ).toBe(true);

    expect(
      shouldDriveUserFollowFrame({
        isTrackingLocation: true,
        isUserFollowActive: false,
        hasDisplayLocation: true,
      }),
    ).toBe(false);

    expect(
      shouldDriveUserFollowFrame({
        isTrackingLocation: true,
        isUserFollowActive: true,
        hasDisplayLocation: false,
      }),
    ).toBe(false);
  });
});
