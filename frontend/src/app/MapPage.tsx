"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type maplibregl from "maplibre-gl";

import { useRoute, useStops } from "../features/shuttle/hooks";
import { useGpsReplay } from "../hooks/useGpsReplay";
import { VehiclePanel } from "../components/VehiclePanel";
import { Header } from "../components/Header";
import campusConfig from "../data/campus-config.json";

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
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  const initialBearing = isMobile ? (campusConfig.initialBearing ?? 0) : 0;
  const { vehicles, telemetry, loading, setMapUpdater } = useGpsReplay(initialBearing);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const handleMapReady = useCallback(
    (map: maplibregl.Map) => {
      mapRef.current = map;
      setMapUpdater((geojson) => {
        const source = map.getSource("vehicles") as maplibregl.GeoJSONSource | undefined;
        if (source) {
          source.setData(geojson as GeoJSON.GeoJSON);
        }
      });
    },
    [setMapUpdater]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedVehicleId) {
      const v = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
      if (v) {
        map.flyTo({ center: [v.longitude, v.latitude], zoom: 17, duration: 800 });
      }
    } else {
      map.flyTo({
        center: [campusConfig.polygon[0][0], campusConfig.polygon[0][1]],
        zoom: campusConfig.initialZoom,
        duration: 800,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId]);

  const handleSelectVehicle = useCallback((id: string) => {
    setSelectedVehicleId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-surface-dark">
      <div className="h-full w-full">
        <MapView
          route={routeData?.route}
          stops={stopsData?.stops}
          vehicles={vehicles}
          onSelectStop={() => {}}
          onSelectVehicle={handleSelectVehicle}
          onMapReady={handleMapReady}
        />
      </div>

      <Header />

      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl px-8 py-6 shadow-xl" style={{ background: "rgba(41,45,50,0.95)" }}>
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
    </div>
  );
}
