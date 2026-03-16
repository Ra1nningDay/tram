"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { MapRef } from "@/components/ui/map";
import { Header } from "@/components/Header";

import { useRoute, useStops, useStopEtas } from "../features/shuttle/hooks";
import { StopPopup } from "../components/StopPopup";
import { useGpsReplay } from "../hooks/useGpsReplay";
import { useArrivalAlert } from "../hooks/useArrivalAlert";
import { useUserLocation } from "../hooks/useUserLocation";
import { useNearestStop } from "../hooks/useNearestStop";
import { haversineM } from "../lib/geo/distance";
import { VehiclePanel } from "../components/VehiclePanel";
import { getCampusViewport } from "../features/map/campus-viewport";
import campusConfig from "../data/campus-config.json";

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
  const { data: etaData } = useStopEtas(selectedStopId ?? undefined);
  const mapRef = useRef<MapRef | null>(null);
  const selectedVehicleIdRef = useRef<string | null>(null);
  const isFlyingRef = useRef(false);
  const hasFlownToUserRef = useRef(false);
  const userManuallySelectedRef = useRef(false);
  const proximityStopIdRef = useRef<string | null>(null);
  const hasEnteredProximityRef = useRef(false);
  selectedVehicleIdRef.current = selectedVehicleId;

  const selectedStop = selectedStopId
    ? allStops?.find((stop) => stop.id === selectedStopId) ?? null
    : null;
  const selectedStopDistanceM =
    userLocation && selectedStop
      ? haversineM(
          [userLocation.longitude, userLocation.latitude],
          [selectedStop.longitude, selectedStop.latitude],
        )
      : undefined;
  const proximityStop = selectedStop ?? nearestStop;
  const proximityStopDistanceM =
    userLocation && proximityStop
      ? haversineM(
          [userLocation.longitude, userLocation.latitude],
          [proximityStop.longitude, proximityStop.latitude],
        )
      : undefined;
  const selectedStopName = selectedStop?.name_th ?? selectedStop?.name_en;
  const isAlertSupported = typeof window !== "undefined" && "Notification" in window;

  const handleMapReady = useCallback(
    (map: MapRef) => {
      mapRef.current = map;
      setMapUpdater((geojson) => {
        const currentMap = mapRef.current;
        if (!currentMap || typeof currentMap.getSource !== "function") return;

        // Mark the selected vehicle so the layer renders a gold icon
        const selectedId = selectedVehicleIdRef.current;
        if (selectedId && geojson && "features" in geojson) {
          const fc = geojson as GeoJSON.FeatureCollection;
          for (const f of fc.features) {
            if (f.properties?.id === selectedId) {
              f.properties!.status = "selected";

              // Autofocus: follow the selected vehicle if not currently flying
              if (!isFlyingRef.current && f.geometry?.type === "Point") {
                const coords = f.geometry.coordinates as [number, number];
                currentMap.jumpTo({ center: coords });
              }
            }
          }
        }

        try {
          const source = currentMap.getSource("vehicles") as import("maplibre-gl").GeoJSONSource | undefined;
          if (source) {
            source.setData(geojson as GeoJSON.GeoJSON);
          }
        } catch {
          // The map can be torn down/recreated during theme switches; skip this frame safely.
        }
      });
    },
    [setMapUpdater]
  );

  useEffect(() => {
    return () => {
      mapRef.current = null;
      setMapUpdater(null);
    };
  }, [setMapUpdater]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ALERT_STORAGE_KEY);
      if (stored !== "true") return;
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (window.Notification.permission !== "granted") return;
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
      const v = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
      if (v) {
        isFlyingRef.current = true;
        map.flyTo({ center: [v.longitude, v.latitude], zoom: 17, duration: 800 });
        map.once("moveend", () => {
          isFlyingRef.current = false;
        });
      }
    } else {
      isFlyingRef.current = true;
      const { campusCenter } = getCampusViewport(campusConfig.polygon as [number, number][], { isMobile });
      map.flyTo({
        center: campusCenter,
        zoom: campusConfig.initialZoom,
        duration: 800,
      });
      map.once("moveend", () => {
        isFlyingRef.current = false;
      });
    }
  }, [selectedVehicleId]);

  const handleSelectVehicle = useCallback((id: string | null) => {
    setSelectedVehicleId((prev) => {
      if (id === null) return null;
      return prev === id ? null : id;
    });
    setSelectedStopId(null);
  }, []);

  const handleSelectStop = useCallback((stopId: string) => {
    setSelectedStopId((prev) => (prev === stopId ? null : stopId));
    setSelectedVehicleId(null);
    userManuallySelectedRef.current = true; // User tapped a stop manually

    const stop = allStops?.find((s) => s.id === stopId);
    if (stop && mapRef.current) {
      isFlyingRef.current = true;
      mapRef.current.flyTo({ center: [stop.longitude, stop.latitude], zoom: 17, duration: 800 });
      mapRef.current.once("moveend", () => { isFlyingRef.current = false; });
    }
  }, [allStops]);

  // Toggle user location tracking
  const handleToggleTracking = useCallback(() => {
    if (isTrackingLocation) {
      stopTracking();
      hasFlownToUserRef.current = false;
      userManuallySelectedRef.current = false;
    } else {
      startTracking();
      userManuallySelectedRef.current = false;
    }
  }, [isTrackingLocation, startTracking, stopTracking]);

  // Auto-select nearest stop when tracking and user hasn't manually picked one
  useEffect(() => {
    if (!isTrackingLocation || !nearestStop || userManuallySelectedRef.current) return;
    setSelectedStopId(nearestStop.id);
  }, [isTrackingLocation, nearestStop]);

  // Fly to user position on first location acquisition
  useEffect(() => {
    if (userLocation && !hasFlownToUserRef.current && mapRef.current) {
      hasFlownToUserRef.current = true;
      mapRef.current.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 17,
        duration: 1200,
      });
    }
  }, [userLocation]);

  const handleToggleAlert = useCallback(async () => {
    if (isAlertEnabled) {
      setIsAlertEnabled(false);
      return;
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      window.alert("เบราว์เซอร์นี้ยังไม่รองรับการแจ้งเตือน");
      return;
    }

    if (window.Notification.permission === "denied") {
      window.alert("การแจ้งเตือนถูกบล็อกไว้ในเบราว์เซอร์นี้");
      return;
    }

    if (window.Notification.permission === "default") {
      try {
        const permission = await window.Notification.requestPermission();
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
      if (!hasEnteredProximityRef.current && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      hasEnteredProximityRef.current = true;
      return;
    }

    hasEnteredProximityRef.current = false;
  }, [proximityStop?.id, proximityStopDistanceM]);

  useArrivalAlert({
    etas: etaData?.etas,
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
              <span className="text-sm font-medium text-muted">Loading GPS data...</span>
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
        />
      )}

      {/* Stop ETA popup */}
      {selectedStop && (
        <div className="absolute bottom-4 left-1/2 z-30 w-[90vw] max-w-sm -translate-x-1/2 md:bottom-6">
          <div className="relative">
            <button
              onClick={() => setSelectedStopId(null)}
              className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-light)] text-[var(--color-text-muted)] shadow-md transition-colors hover:text-[var(--color-text)]"
              title="Close"
            >
              ✕
            </button>
            <StopPopup
              stop={selectedStop}
              etas={etaData?.etas ?? []}
              distanceM={selectedStopDistanceM}
            />
          </div>
        </div>
      )}
    </div>
  );
}
