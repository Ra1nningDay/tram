export type UserTrackingToggleAction = "start" | "resume" | "stop";

export function getUserTrackingToggleAction(
  isTrackingLocation: boolean,
  isUserFollowActive: boolean,
): UserTrackingToggleAction {
  if (!isTrackingLocation) {
    return "start";
  }

  return isUserFollowActive ? "stop" : "resume";
}

export function shouldPauseUserFollowOnViewportChange({
  isTrackingLocation,
  isUserFollowActive,
  isProgrammaticViewportChange,
}: {
  isTrackingLocation: boolean;
  isUserFollowActive: boolean;
  isProgrammaticViewportChange: boolean;
}): boolean {
  return (
    isTrackingLocation &&
    isUserFollowActive &&
    !isProgrammaticViewportChange
  );
}

export function shouldDriveUserFollowFrame({
  isTrackingLocation,
  isUserFollowActive,
  hasDisplayLocation,
}: {
  isTrackingLocation: boolean;
  isUserFollowActive: boolean;
  hasDisplayLocation: boolean;
}): boolean {
  return isTrackingLocation && isUserFollowActive && hasDisplayLocation;
}
