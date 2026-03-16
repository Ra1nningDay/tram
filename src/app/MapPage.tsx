"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import type { MapRef } from "@/components/ui/map";
import { Header } from "@/components/Header";

import { VehiclePanel } from "../components/VehiclePanel";
import campusConfig from "../data/campus-config.json";
import { getCampusViewport } from "../features/map/campus-viewport";
import { useRoute, useStops } from "../features/shuttle/hooks";
import { useSimulatedInsights } from "../features/shuttle/useSimulatedInsights";
import { useArrivalAlert } from "../hooks/useArrivalAlert";
import { useGpsReplay } from "../hooks/useGpsReplay";
import { useNearestStop } from "../hooks/useNearestStop";
import { useUserLocation } from "../hooks/useUserLocation";
import { haversineM } from "../lib/geo/distance";

const ALERT_STORAGE_KEY = "map-arrival-alerts-enabled";
const STOP_PROXIMITY_VIBRATION_DISTANCE_M = 20;

const MapView = dynamic(
  () => import("../features/map/MapView").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => <div className="h-full w-full" />,
  }
);

export function MapPage() {
  const { data: routeData } = useRoute();
  const { data: stopsData } = useStops();
  const allStops = stopsData?.stops;
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  const initialBearing = isMobile ? (campusConfig.initialBearing ?? 0) : 0;
  const { vehicles, telemetry, loading, setMapUpdater } = useGpsReplay(initialBearing);
  const {
    location: userLocation,
    isTracking: isTrackingLocation,
    startTracking,
    stopTracking,
  } = useUserLocation();
  const { nearestStop } = useNearestStop(userLocation, allStops);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [isAlertEnabled, setIsAlertEnabled] = useState(false);
  const mapRef = useRef<MapRef | null>(null);
  const selectedVehicleIdRef = useRef<string | null>(null);
  const selectedVehicleCoordsRef = useRef<[number, number] | null>(null);
  const followRafRef = useRef<number | null>(null);
  const followLastTsRef = useRef<number | null>(null);
  const isFlyingRef = useRef(false);
  const hasFlownToUserRef = useRef(false);
  const userManuallySelectedRef = useRef(false);
  const proximityStopIdRef = useRef<string | null>(null);
  const hasEnteredProximityRef = useRef(false);
  selectedVehicleIdRef.current = selectedVehicleId;

  const selectedStop = selectedStopId
    ? allStops?.find((stop) => stop.id === selectedStopId) ?? null
    : null;
  const { etasByStopId } = useSimulatedInsights({
    vehicles,
    route: routeData?.route,
    stops: allStops,
  });
  const selectedStopEtas = selectedStopId ? etasByStopId[selectedStopId] ?? [] : [];
  const activeStopId = selectedStopId ?? nearestStop?.id ?? null;
  const selectedStopDistanceM =
    userLocation && selectedStop
      ? haversineM(
          [userLocation.longitude, userLocation.latitude],
          [selectedStop.longitude, selectedStop.latitude]
        )
      : undefined;
  const proximityStop = selectedStop ?? nearestStop;
  const proximityStopDistanceM =
    userLocation && proximityStop
      ? haversineM(
          [userLocation.longitude, userLocation.latitude],
          [proximityStop.longitude, proximityStop.latitude]
        )
      : undefined;
  const selectedStopName = selectedStop?.name_th ?? selectedStop?.name_en;
  const selectedStopKind = selectedStop
    ? userManuallySelectedRef.current
      ? "selected"
      : "nearest"
    : null;
  const isAlertSupported =
    typeof window !== "undefined" && typeof Notification !== "undefined";

  const handleMapReady = useCallback(
    (map: MapRef) => {
      mapRef.current = map;
      setMapUpdater((geojson) => {
        const currentMap = mapRef.current;
        if (!currentMap || typeof currentMap.getSource !== "function") return;

        const selectedId = selectedVehicleIdRef.current;
        if (selectedId && geojson && "features" in geojson) {
          const featureCollection = geojson as GeoJSON.FeatureCollection;
          let matchedSelectedVehicle = false;

          for (const feature of featureCollection.features) {
            if (feature.properties?.id === selectedId) {
              matchedSelectedVehicle = true;
              feature.properties.status = "selected";
              selectedVehicleCoordsRef.current =
                feature.geometry?.type === "Point"
                  ? (feature.geometry.coordinates as [number, number])
                  : null;
            }
          }

          if (!matchedSelectedVehicle) {
            selectedVehicleCoordsRef.current = null;
          }
        } else if (!selectedId) {
          selectedVehicleCoordsRef.current = null;
        }

        try {
          const source = currentMap.getSource("vehicles") as
            | import("maplibre-gl").GeoJSONSource
            | undefined;

          source?.setData(geojson as GeoJSON.GeoJSON);
        } catch {
          // The map can be torn down and recreated during theme switches.
        }
      });
    },
    [setMapUpdater]
  );

  useEffect(() => {
    return () => {
      if (followRafRef.current !== null) {
        cancelAnimationFrame(followRafRef.current);
      }
      mapRef.current = null;
      setMapUpdater(null);
    };
  }, [setMapUpdater]);

  useEffect(() => {
    if (!selectedVehicleId) {
      selectedVehicleCoordsRef.current = null;
      followLastTsRef.current = null;
      if (followRafRef.current !== null) {
        cancelAnimationFrame(followRafRef.current);
        followRafRef.current = null;
      }
      return;
    }

    const followSelectedVehicle = (timestamp: number) => {
      const map = mapRef.current;
      const target = selectedVehicleCoordsRef.current;

      if (!map || !selectedVehicleIdRef.current) {
        followRafRef.current = null;
        followLastTsRef.current = null;
        return;
      }

      if (!isFlyingRef.current && target) {
        const center = map.getCenter();
        const previousTimestamp = followLastTsRef.current ?? timestamp;
        const deltaMs = Math.min(timestamp - previousTimestamp, 64);
        const smoothing = 1 - Math.exp(-deltaMs / 140);

        followLastTsRef.current = timestamp;
        map.jumpTo({
          center: [
            center.lng + (target[0] - center.lng) * smoothing,
            center.lat + (target[1] - center.lat) * smoothing,
          ],
        });
      } else {
        followLastTsRef.current = timestamp;
      }

      followRafRef.current = requestAnimationFrame(followSelectedVehicle);
    };

    if (followRafRef.current !== null) {
      cancelAnimationFrame(followRafRef.current);
    }

    followLastTsRef.current = null;
    followRafRef.current = requestAnimationFrame(followSelectedVehicle);

    return () => {
      if (followRafRef.current !== null) {
        cancelAnimationFrame(followRafRef.current);
        followRafRef.current = null;
      }
      followLastTsRef.current = null;
    };
  }, [selectedVehicleId]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ALERT_STORAGE_KEY);
      if (stored !== "true") return;
      if (typeof window === "undefined" || typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;
      setIsAlertEnabled(true);
    } catch {
      // Ignore unavailable storage.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ALERT_STORAGE_KEY, String(isAlertEnabled));
    } catch {
      // Ignore unavailable storage.
    }
  }, [isAlertEnabled]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedVehicleId) {
      const vehicle = vehicles.find((item) => item.id === selectedVehicleId);
      const targetCenter =
        selectedVehicleCoordsRef.current ??
        (vehicle ? ([vehicle.longitude, vehicle.latitude] as [number, number]) : null);

      if (targetCenter) {
        isFlyingRef.current = true;
        map.flyTo({
          center: targetCenter,
          zoom: 17,
          duration: 800,
        });
        map.once("moveend", () => {
          isFlyingRef.current = false;
        });
      }
      return;
    }

    if (selectedStopId) {
      return;
    }

    isFlyingRef.current = true;
    const { campusCenter } = getCampusViewport(
      campusConfig.polygon as [number, number][],
      { isMobile }
    );
    map.flyTo({
      center: campusCenter,
      zoom: campusConfig.initialZoom,
      duration: 800,
    });
    map.once("moveend", () => {
      isFlyingRef.current = false;
    });
  }, [isMobile, selectedStopId, selectedVehicleId]);

  const handleSelectVehicle = useCallback((id: string | null) => {
    setSelectedVehicleId((prev) => {
      if (id === null) return null;
      return prev === id ? null : id;
    });
  }, []);

  const handleSelectStop = useCallback(
    (stopId: string) => {
      setSelectedStopId((prev) => (prev === stopId ? null : stopId));
      setSelectedVehicleId(null);
      userManuallySelectedRef.current = true;

      const stop = allStops?.find((item) => item.id === stopId);
      if (stop && mapRef.current) {
        isFlyingRef.current = true;
        mapRef.current.flyTo({
          center: [stop.longitude, stop.latitude],
          zoom: 17,
          duration: 800,
        });
        mapRef.current.once("moveend", () => {
          isFlyingRef.current = false;
        });
      }
    },
    [allStops]
  );

  const handleClearStopSelection = useCallback(() => {
    setSelectedStopId(null);
    userManuallySelectedRef.current = true;
  }, []);

  const handleToggleTracking = useCallback(() => {
    if (isTrackingLocation) {
      stopTracking();
      hasFlownToUserRef.current = false;
      userManuallySelectedRef.current = false;
      return;
    }

    startTracking();
    userManuallySelectedRef.current = false;
  }, [isTrackingLocation, startTracking, stopTracking]);

  useEffect(() => {
    if (!isTrackingLocation || !nearestStop || userManuallySelectedRef.current) return;
    setSelectedStopId(nearestStop.id);
  }, [isTrackingLocation, nearestStop]);

  useEffect(() => {
    if (!userLocation || hasFlownToUserRef.current || !mapRef.current) return;

    hasFlownToUserRef.current = true;
    mapRef.current.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 17,
      duration: 1200,
    });
  }, [userLocation]);

  const handleToggleAlert = useCallback(async () => {
    if (isAlertEnabled) {
      setIsAlertEnabled(false);
      return;
    }

    if (typeof window === "undefined") return;

    if (typeof Notification === "undefined") {
      window.alert("เบราว์เซอร์นี้ยังไม่รองรับการแจ้งเตือน");
      return;
    }

    if (Notification.permission === "denied") {
      window.alert("การแจ้งเตือนถูกบล็อกไว้ในเบราว์เซอร์นี้");
      return;
    }

    if (Notification.permission === "default") {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          window.alert("ยังไม่ได้รับสิทธิ์สำหรับการแจ้งเตือน");
          return;
        }
      } catch {
        window.alert("ไม่สามารถเปิดคำขอสิทธิ์การแจ้งเตือนได้");
        return;
      }
    }

    setIsAlertEnabled(true);
  }, [isAlertEnabled]);

  useEffect(() => {
    const stopId = proximityStop?.id ?? null;
    if (stopId !== proximityStopIdRef.current) {
      proximityStopIdRef.current = stopId;
      hasEnteredProximityRef.current = false;
    }

    if (typeof proximityStopDistanceM !== "number") {
      hasEnteredProximityRef.current = false;
      return;
    }

    if (proximityStopDistanceM < STOP_PROXIMITY_VIBRATION_DISTANCE_M) {
      if (
        !hasEnteredProximityRef.current &&
        typeof navigator !== "undefined" &&
        "vibrate" in navigator
      ) {
        navigator.vibrate([100, 50, 100]);
      }
      hasEnteredProximityRef.current = true;
      return;
    }

    hasEnteredProximityRef.current = false;
  }, [proximityStop?.id, proximityStopDistanceM]);

  useArrivalAlert({
    etas: selectedStopEtas,
    stopName: selectedStopName,
    enabled: isAlertEnabled,
  });

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-surface-dark">
      <div className="h-full w-full">
        <MapView
          route={routeData?.route}
          stops={stopsData?.stops}
          vehicles={vehicles}
          onSelectStop={handleSelectStop}
          onSelectVehicle={handleSelectVehicle}
          onMapReady={handleMapReady}
          userLocation={userLocation}
          isTrackingLocation={isTrackingLocation}
          onToggleTracking={handleToggleTracking}
          activeStopId={activeStopId}
        />
      </div>

      <Header
        isAlertEnabled={isAlertEnabled}
        isAlertSupported={isAlertSupported}
        onToggleAlert={handleToggleAlert}
      />

      {loading && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          style={{ background: "var(--overlay)" }}
        >
          <div className="glass-card-dark rounded-2xl px-8 py-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm font-medium text-muted">
                Loading GPS data...
              </span>
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <VehiclePanel
          vehicles={vehicles}
          telemetry={telemetry}
          onSelectVehicle={handleSelectVehicle}
          selectedVehicleId={selectedVehicleId}
          stop={selectedStop}
          stopEtas={selectedStopEtas}
          stopDistanceM={selectedStopDistanceM}
          stopKind={selectedStopKind}
          onClearStop={selectedStop ? handleClearStopSelection : undefined}
          isAlertEnabled={isAlertEnabled}
          isAlertSupported={isAlertSupported}
          onToggleAlert={handleToggleAlert}
        />
      )}
    </div>
  );
}
