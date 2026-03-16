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
  /** High-accuracy mode while the tab is hidden (default: false) */
  backgroundEnableHighAccuracy?: boolean;
  /** Maximum age while the tab is hidden (default: 60 000) */
  backgroundMaximumAge?: number;
  /** Timeout while the tab is hidden (default: 30 000) */
  backgroundTimeout?: number;
};

const DEFAULT_OPTIONS: Required<UseUserLocationOptions> = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 15_000,
  backgroundEnableHighAccuracy: false,
  backgroundMaximumAge: 60_000,
  backgroundTimeout: 30_000,
};

export type UserLocationTrackingMode = "foreground" | "background";

export function getUserLocationTrackingMode(
  visibilityState?: DocumentVisibilityState,
): UserLocationTrackingMode {
  return visibilityState === "hidden" ? "background" : "foreground";
}

export function getUserLocationWatchOptions(
  options: Required<UseUserLocationOptions>,
  mode: UserLocationTrackingMode,
): PositionOptions {
  if (mode === "background") {
    return {
      enableHighAccuracy: options.backgroundEnableHighAccuracy,
      maximumAge: Math.max(options.maximumAge, options.backgroundMaximumAge),
      timeout: Math.max(options.timeout, options.backgroundTimeout),
    };
  }

  return {
    enableHighAccuracy: options.enableHighAccuracy,
    maximumAge: options.maximumAge,
    timeout: options.timeout,
  };
}

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
  const isTrackingRef = useRef(false);
  const optionsRef = useRef({ ...DEFAULT_OPTIONS, ...options });
  optionsRef.current = { ...DEFAULT_OPTIONS, ...options };

  const clearActiveWatch = useCallback(() => {
    if (watchIdRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const stopTracking = useCallback(() => {
    isTrackingRef.current = false;
    clearActiveWatch();
    setIsTracking(false);
  }, [clearActiveWatch]);

  const beginWatch = useCallback((resetState: boolean) => {
    if (!("geolocation" in navigator)) {
      setError({
        code: 2, // POSITION_UNAVAILABLE
        message: "Geolocation is not supported by this browser.",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
      return false;
    }

    clearActiveWatch();

    if (resetState) {
      setError(null);
      setIsPermissionDenied(false);
    }

    const trackingMode = getUserLocationTrackingMode(
      typeof document === "undefined" ? "visible" : document.visibilityState,
    );
    const watchOptions = getUserLocationWatchOptions(optionsRef.current, trackingMode);

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
      watchOptions,
    );

    watchIdRef.current = id;
    return true;
  }, [clearActiveWatch, stopTracking]);

  const startTracking = useCallback(() => {
    const didStart = beginWatch(true);
    if (!didStart) {
      isTrackingRef.current = false;
      setIsTracking(false);
      return;
    }

    isTrackingRef.current = true;
    setIsTracking(true);
  }, [beginWatch]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      if (!isTrackingRef.current) return;
      beginWatch(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [beginWatch]);

  useEffect(() => {
    if (!isTrackingRef.current) return;
    beginWatch(false);
  }, [
    beginWatch,
    options?.enableHighAccuracy,
    options?.maximumAge,
    options?.timeout,
    options?.backgroundEnableHighAccuracy,
    options?.backgroundMaximumAge,
    options?.backgroundTimeout,
  ]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isTrackingRef.current = false;
      clearActiveWatch();
    };
  }, [clearActiveWatch]);

  return {
    location,
    error,
    isTracking,
    isPermissionDenied,
    startTracking,
    stopTracking,
  };
}
