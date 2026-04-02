"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

import type { MapRef } from "@/components/ui/map";
import { Header, type HeaderSearchResult } from "@/components/Header";

import { VehiclePanel } from "../components/VehiclePanel";
import campusConfig from "../data/campus-config.json";
import { getCampusViewport } from "../features/map/campus-viewport";
import { useRoute, useStops } from "../features/shuttle/hooks";
import { useSimulatedInsights } from "../features/shuttle/useSimulatedInsights";
import { useArrivalAlert } from "../hooks/useArrivalAlert";
import { useLiveOrSimVehicles } from "../hooks/useLiveOrSimVehicles";
import { useNearestStop } from "../hooks/useNearestStop";
import { useUserLocation } from "../hooks/useUserLocation";
import { haversineM } from "../lib/geo/distance";

const ALERT_STORAGE_KEY = "map-arrival-alerts-enabled";
const STOP_PROXIMITY_VIBRATION_DISTANCE_M = 20;

type PanelSnapLevel = 0 | 1 | 2;
type MapSearchResult = HeaderSearchResult & { rank: number };

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function compactSearchText(value: string): string {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function getSearchRank(query: string, candidates: string[]): number | null {
  if (!query) return null;

  const compactQuery = compactSearchText(query);
  let bestRank: number | null = null;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeSearchText(candidate);
    if (!normalizedCandidate) continue;

    const compactCandidate = compactSearchText(candidate);
    const rank =
      normalizedCandidate === query || compactCandidate === compactQuery
        ? 0
        : normalizedCandidate.startsWith(query) || compactCandidate.startsWith(compactQuery)
          ? 1
          : normalizedCandidate.includes(query) || compactCandidate.includes(compactQuery)
            ? 2
            : null;

    if (rank !== null && (bestRank === null || rank < bestRank)) {
      bestRank = rank;
    }
  }

  return bestRank;
}

const MapView = dynamic(
  () => import("../features/map/MapView").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => <div className="h-full w-full" />,
  }
);

function MapLoadingOverlay() {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      style={{ background: "var(--overlay)" }}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="glass-card-dark flex h-20 w-20 items-center justify-center rounded-full border border-white/10 shadow-2xl">
        <span className="sr-only">กำลังโหลดข้อมูลตำแหน่งรถ</span>
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/12 border-t-primary shadow-[0_0_24px_rgba(254,80,80,0.18)]" />
      </div>
    </div>
  );
}

export function MapPage() {
  const { data: routeData } = useRoute();
  const { data: stopsData } = useStops();
  const allStops = stopsData?.stops;
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  const initialBearing = isMobile ? (campusConfig.initialBearing ?? 0) : 0;
  const [dataMode, setDataMode] = useState<"live" | "simulate">("simulate");
  const { vehicles, telemetry, loading, setMapUpdater } = useLiveOrSimVehicles(initialBearing, dataMode);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [panelSnapLevel, setPanelSnapLevel] = useState<PanelSnapLevel>(1);
  const [autoExpandVehicleRequest, setAutoExpandVehicleRequest] = useState<string | null>(null);
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
  const telemetryByVehicleId = useMemo(() => {
    const map = new Map<string, (typeof telemetry)[number]>();

    for (const item of telemetry) {
      map.set(item.vehicleId, item);
    }

    return map;
  }, [telemetry]);

  const normalizedSearchQuery = useMemo(
    () => normalizeSearchText(searchQuery),
    [searchQuery]
  );

  const searchResults = useMemo<MapSearchResult[]>(() => {
    if (!normalizedSearchQuery) return [];

    const results: MapSearchResult[] = [];

    for (const vehicle of vehicles) {
      const tele = telemetryByVehicleId.get(vehicle.id);
      const title = tele?.label ?? vehicle.label ?? vehicle.id;
      const subtitle = tele?.nextStopName
        ? `รหัส ${vehicle.id} • ไป ${tele.nextStopName}`
        : `รหัส ${vehicle.id}`;
      const rank = getSearchRank(normalizedSearchQuery, [
        title,
        vehicle.label ?? "",
        vehicle.id,
        title.replace(/_/g, " "),
        subtitle,
      ]);

      if (rank === null) continue;

      results.push({
        id: vehicle.id,
        type: "vehicle",
        title,
        subtitle,
        rank,
      });
    }

    for (const stop of allStops ?? []) {
      const subtitle = stop.name_en?.trim()
        ? `ป้าย ${stop.sequence} • ${stop.name_en}`
        : `ป้าย ${stop.sequence}`;
      const rank = getSearchRank(normalizedSearchQuery, [
        stop.name_th,
        stop.name_en ?? "",
        stop.id,
        `ป้าย ${stop.sequence}`,
        `stop ${stop.sequence}`,
      ]);

      if (rank === null) continue;

      results.push({
        id: stop.id,
        type: "stop",
        title: stop.name_th,
        subtitle,
        rank,
      });
    }

    return results.sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank;
      if (left.type !== right.type) return left.type === "vehicle" ? -1 : 1;
      return left.title.localeCompare(right.title, "th");
    });
  }, [allStops, normalizedSearchQuery, telemetryByVehicleId, vehicles]);

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

  const handleSelectVehicle = useCallback((
    id: string | null,
    options?: { panelSnapLevel?: PanelSnapLevel }
  ) => {
    setAutoExpandVehicleRequest(null);

    const nextVehicleId =
      id === null ? null : selectedVehicleId === id ? null : id;

    if (nextVehicleId !== null) {
      userManuallySelectedRef.current = true;
      setSelectedStopId(null);
      if (options?.panelSnapLevel !== undefined) {
        setPanelSnapLevel(options.panelSnapLevel);
      }
    }

    setSelectedVehicleId(nextVehicleId);
  }, [selectedVehicleId]);

  const handleSelectVehicleFromMap = useCallback((id: string | null) => {
    handleSelectVehicle(id, { panelSnapLevel: 2 });
  }, [handleSelectVehicle]);

  const handleSelectVehicleFromPanel = useCallback((id: string | null) => {
    handleSelectVehicle(id);
  }, [handleSelectVehicle]);

  const flyToStop = useCallback((stopId: string) => {
    const stop = allStops?.find((item) => item.id === stopId);
    if (!stop || !mapRef.current) return;

    isFlyingRef.current = true;
    mapRef.current.flyTo({
      center: [stop.longitude, stop.latitude],
      zoom: 17,
      duration: 800,
    });
    mapRef.current.once("moveend", () => {
      isFlyingRef.current = false;
    });
  }, [allStops]);

  const handleSelectStop = useCallback(
    (stopId: string) => {
      setSelectedStopId((prev) => (prev === stopId ? null : stopId));
      setSelectedVehicleId(null);
      setAutoExpandVehicleRequest(null);
      userManuallySelectedRef.current = true;
      flyToStop(stopId);
    },
    [flyToStop]
  );

  const focusStopFromSearch = useCallback((stopId: string) => {
    userManuallySelectedRef.current = true;
    setSelectedVehicleId(null);
    setAutoExpandVehicleRequest(null);
    setSelectedStopId(stopId);
    setPanelSnapLevel(1);
    flyToStop(stopId);
  }, [flyToStop]);

  const focusVehicleFromSearch = useCallback((vehicleId: string) => {
    userManuallySelectedRef.current = true;
    setSelectedStopId(null);
    setSelectedVehicleId(vehicleId);
    setAutoExpandVehicleRequest(`${vehicleId}:${Date.now()}`);
    setPanelSnapLevel(1);
  }, []);

  const handleClearStopSelection = useCallback(() => {
    setSelectedStopId(null);
    userManuallySelectedRef.current = true;
  }, []);

  const handleSearchValueChange = useCallback((value: string) => {
    setSearchQuery(value);
    setIsSearchOpen(Boolean(value.trim()));
  }, []);

  const handleSearchOpenChange = useCallback((open: boolean) => {
    setIsSearchOpen(open && Boolean(searchQuery.trim()));
  }, [searchQuery]);

  const handleSearchSelect = useCallback((result: HeaderSearchResult) => {
    setSearchQuery("");
    setIsSearchOpen(false);

    if (result.type === "vehicle") {
      focusVehicleFromSearch(result.id);
      return;
    }

    focusStopFromSearch(result.id);
  }, [focusStopFromSearch, focusVehicleFromSearch]);

  const handleToggleDataMode = useCallback(() => {
    setDataMode((prev) => (prev === "simulate" ? "live" : "simulate"));
  }, []);

  const headerSearch = useMemo(() => ({
    value: searchQuery,
    results: searchResults.map((result) => ({
      id: result.id,
      type: result.type,
      title: result.title,
      subtitle: result.subtitle,
    })),
    isOpen: isSearchOpen,
    onValueChange: handleSearchValueChange,
    onOpenChange: handleSearchOpenChange,
    onSelect: handleSearchSelect,
  }), [
    handleSearchOpenChange,
    handleSearchSelect,
    handleSearchValueChange,
    isSearchOpen,
    searchQuery,
    searchResults,
  ]);

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
          onSelectVehicle={handleSelectVehicleFromMap}
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
        dataMode={dataMode}
        onToggleDataMode={handleToggleDataMode}
        search={headerSearch}
      />

      {loading && <MapLoadingOverlay />}

      {!loading && (
        <VehiclePanel
          vehicles={vehicles}
          telemetry={telemetry}
          onSelectVehicle={handleSelectVehicleFromPanel}
          selectedVehicleId={selectedVehicleId}
          snapLevel={panelSnapLevel}
          onSnapLevelChange={setPanelSnapLevel}
          autoExpandVehicleRequest={autoExpandVehicleRequest}
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
