import { useState, useEffect, useCallback, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type UserLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  timestamp: number;
};

export type UseUserLocationReturn = {
  /** Current user position, or null if not yet acquired */
  location: UserLocation | null;
  /** Last geolocation error, if any */
  error: GeolocationPositionError | null;
  /** Whether watchPosition is currently active */
  isTracking: boolean;
  /** Whether the user has denied location permission */
  isPermissionDenied: boolean;
  /** Begin continuous GPS tracking (requests permission if needed) */
  startTracking: () => void;
  /** Stop continuous GPS tracking */
  stopTracking: () => void;
};

/* ------------------------------------------------------------------ */
/*  Options                                                            */
/* ------------------------------------------------------------------ */

export type UseUserLocationOptions = {
  /** Use high-accuracy GPS (default: true) */
  enableHighAccuracy?: boolean;
  /** Maximum age of a cached position in ms (default: 10 000) */
  maximumAge?: number;
  /** Timeout for each position request in ms (default: 15 000) */
  timeout?: number;
};

const DEFAULT_OPTIONS: Required<UseUserLocationOptions> = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 15_000,
};

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useUserLocation(
  options?: UseUserLocationOptions,
): UseUserLocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const optionsRef = useRef({ ...DEFAULT_OPTIONS, ...options });
  optionsRef.current = { ...DEFAULT_OPTIONS, ...options };

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(() => {
    // Guard: Geolocation API not available
    if (!("geolocation" in navigator)) {
      setError({
        code: 2, // POSITION_UNAVAILABLE
        message: "Geolocation is not supported by this browser.",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
      return;
    }

    // Clear previous watch if any
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setError(null);
    setIsPermissionDenied(false);
    setIsTracking(true);

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        });
        setError(null);
      },
      (err) => {
        setError(err);
        if (err.code === err.PERMISSION_DENIED) {
          setIsPermissionDenied(true);
          // Auto-stop tracking when permission is denied
          stopTracking();
        }
      },
      {
        enableHighAccuracy: optionsRef.current.enableHighAccuracy,
        maximumAge: optionsRef.current.maximumAge,
        timeout: optionsRef.current.timeout,
      },
    );

    watchIdRef.current = id;
  }, [stopTracking]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return {
    location,
    error,
    isTracking,
    isPermissionDenied,
    startTracking,
    stopTracking,
  };
}
