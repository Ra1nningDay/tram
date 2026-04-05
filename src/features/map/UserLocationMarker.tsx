import { useEffect, useRef, useState } from "react";

import { MapMarker, MarkerContent } from "@/components/ui/map";
import type { UserLocation } from "@/hooks/useUserLocation";

import {
  resolveUserLocationCursorDisplay,
  syncUserLocationCursor,
  type UserLocationCursor,
  type VisibleUserLocation,
} from "./user-location-cursor";
import "./user-location.css";

type UserLocationMarkerProps = {
  location: UserLocation;
  onDisplayLocationChange?: (location: VisibleUserLocation) => void;
};

function toVisibleLocation(location: UserLocation): VisibleUserLocation {
  return {
    ...location,
    displayLatitude: location.latitude,
    displayLongitude: location.longitude,
    motionState: "interpolating",
    isMotionDelayed: false,
  };
}

function isSameVisibleLocation(
  current: VisibleUserLocation,
  next: VisibleUserLocation,
): boolean {
  return (
    current.displayLatitude === next.displayLatitude &&
    current.displayLongitude === next.displayLongitude &&
    current.motionState === next.motionState &&
    current.timestamp === next.timestamp &&
    current.accuracy === next.accuracy &&
    current.heading === next.heading
  );
}

export function UserLocationMarker({
  location,
  onDisplayLocationChange,
}: UserLocationMarkerProps) {
  const cursorRef = useRef<UserLocationCursor | null>(null);
  const callbackRef = useRef(onDisplayLocationChange);
  const animationFrameRef = useRef<number | null>(null);
  const [displayLocation, setDisplayLocation] = useState<VisibleUserLocation>(
    () => toVisibleLocation(location),
  );
  callbackRef.current = onDisplayLocationChange;

  useEffect(() => {
    const nowMs = Date.now();
    cursorRef.current = syncUserLocationCursor(cursorRef.current, location, nowMs);
    const nextDisplay = resolveUserLocationCursorDisplay(cursorRef.current, nowMs);

    setDisplayLocation((current) =>
      isSameVisibleLocation(current, nextDisplay) ? current : nextDisplay,
    );
    callbackRef.current?.(nextDisplay);
  }, [location]);

  useEffect(() => {
    const tick = () => {
      if (cursorRef.current) {
        const nextDisplay = resolveUserLocationCursorDisplay(
          cursorRef.current,
          Date.now(),
        );

        setDisplayLocation((current) =>
          isSameVisibleLocation(current, nextDisplay) ? current : nextDisplay,
        );
        callbackRef.current?.(nextDisplay);
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <MapMarker
      longitude={displayLocation.displayLongitude}
      latitude={displayLocation.displayLatitude}
    >
      <MarkerContent>
        <div className="user-location-marker">
          <div className="user-location-ring" />
          <div className="user-location-center" />
        </div>
      </MarkerContent>
    </MapMarker>
  );
}
