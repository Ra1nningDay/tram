import { useEffect, useMemo, useRef } from "react";
import { Locate, Scan } from "lucide-react";
import type { LineLayerSpecification } from "maplibre-gl";

import { Map, useMap, type MapRef } from "@/components/ui/map";
import { routeCasingLayer, routeLayer, stopsLayer, vehiclesLayer } from "./layers";
import { routeToGeoJson, stopsToGeoJson } from "./sources";
import { loadMapIcons, loadVehicleIcon } from "./map-utils";
import { getCampusViewport } from "./campus-viewport";
import { ThemeToggle } from "../../components/ThemeToggle";
import { UserLocationMarker } from "./UserLocationMarker";
import type { UserLocation } from "@/hooks/useUserLocation";

import type { Route, Stop, Vehicle } from "../shuttle/api";
import campusConfig from "../../data/campus-config.json";

type MapViewProps = {
  route?: Route;
  stops?: Stop[];
  vehicles?: Vehicle[];
  onSelectStop: (stopId: string) => void;
  onSelectVehicle: (vehicleId: string | null) => void;
  onMapReady?: (map: MapRef) => void;
  userLocation?: UserLocation | null;
  isTrackingLocation?: boolean;
  onToggleTracking?: () => void;
};

// BU Campus polygon mask (from JSON config)
const CAMPUS_POLYGON: [number, number][] = campusConfig.polygon as [number, number][];

// Map tile styles — liberty for both; dark mode handled via CSS filter
const MAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/liberty",
};

// Create a closed LineString around the campus boundary
function createBoundaryLine() {
  const coords = [...CAMPUS_POLYGON];
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords.push(first);
  }

  return {
    type: "Feature" as const,
    geometry: {
      type: "LineString" as const,
      coordinates: coords,
    },
    properties: {},
  };
}

// Campus boundary outline layer
const boundaryLayer: LineLayerSpecification = {
  id: "campus-boundary",
  type: "line",
  source: "campus-boundary",
  paint: {
    "line-color": "#FE5050",
    "line-width": 2,
    "line-opacity": 0.5,
    "line-dasharray": [4, 3],
  },
};

// ─── Child component: sets up all custom GeoJSON sources & layers after map loads ───

type MapLayersProps = {
  route?: Route;
  stops?: Stop[];
  vehicles?: Vehicle[];
  onSelectStop: (stopId: string) => void;
  onSelectVehicle: (vehicleId: string | null) => void;
  onMapReady?: (map: MapRef) => void;
};

function MapLayers({ route, stops, vehicles, onSelectStop, onSelectVehicle, onMapReady }: MapLayersProps) {
  const { map, isLoaded } = useMap();
  const layersAddedRef = useRef(false);

  // Stable callback refs
  const onSelectStopRef = useRef(onSelectStop);
  const onSelectVehicleRef = useRef(onSelectVehicle);
  const onMapReadyRef = useRef(onMapReady);
  onSelectStopRef.current = onSelectStop;
  onSelectVehicleRef.current = onSelectVehicle;
  onMapReadyRef.current = onMapReady;

  // Keep latest data in refs for re-initialization after style changes
  const routeRef = useRef(route);
  const stopsRef = useRef(stops);
  routeRef.current = route;
  stopsRef.current = stops;

  // Add sources, layers & event handlers once the style finishes loading
  useEffect(() => {
    if (!map || !isLoaded) return;

    // mapcn fires isLoaded on every style change (theme switch).
    // We need to re-add sources/layers each time.
    const hasSource = !!map.getSource("route");
    if (hasSource) {
      // Sources already exist from a previous load — skip adding but update data
      const routeSource = map.getSource("route") as import("maplibre-gl").GeoJSONSource | undefined;
      const stopsSource = map.getSource("stops") as import("maplibre-gl").GeoJSONSource | undefined;

      routeSource?.setData(routeToGeoJson(routeRef.current) ?? { type: "FeatureCollection", features: [] });
      stopsSource?.setData(stopsToGeoJson(stopsRef.current) ?? { type: "FeatureCollection", features: [] });

      // Reload icons (they get cleared on style change)
      void Promise.all([loadMapIcons(map), loadVehicleIcon(map)]);
      return;
    }

    // ── First-time setup ──

    // Campus boundary
    map.addSource("campus-boundary", {
      type: "geojson",
      data: createBoundaryLine(),
    });
    map.addLayer(boundaryLayer);

    // Data sources
    map.addSource("route", {
      type: "geojson",
      data: routeToGeoJson(routeRef.current) ?? { type: "FeatureCollection", features: [] },
    });
    map.addSource("stops", {
      type: "geojson",
      data: stopsToGeoJson(stopsRef.current) ?? { type: "FeatureCollection", features: [] },
    });
    map.addSource("vehicles", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.addLayer(routeCasingLayer);
    map.addLayer(routeLayer);
    map.addLayer(stopsLayer);
    map.addLayer(vehiclesLayer);

    // Load icons
    void Promise.all([loadMapIcons(map), loadVehicleIcon(map)]);

    // Hide default one-way arrows from the tile style
    if (map.getLayer("road_oneway")) map.setLayoutProperty("road_oneway", "visibility", "none");
    if (map.getLayer("road_oneway_opposite")) map.setLayoutProperty("road_oneway_opposite", "visibility", "none");

    // Click handlers
    map.on("click", "stops", (event) => {
      const stopId = event.features?.[0]?.properties?.id as string | undefined;
      if (stopId) onSelectStopRef.current(stopId);
    });

    map.on("click", "vehicles", (event) => {
      const vehicleId = event.features?.[0]?.properties?.id as string | undefined;
      if (vehicleId) onSelectVehicleRef.current(vehicleId);
    });

    map.on("click", (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["vehicles", "stops"] });
      if (features.length === 0) {
        onSelectVehicleRef.current(null);
      }
    });

    layersAddedRef.current = true;
    onMapReadyRef.current?.(map);
  }, [map, isLoaded]);

  // Update route source when data changes
  useEffect(() => {
    if (!map || !isLoaded) return;
    const source = map.getSource("route") as import("maplibre-gl").GeoJSONSource | undefined;
    source?.setData(routeToGeoJson(route) ?? { type: "FeatureCollection", features: [] });
  }, [map, isLoaded, route]);

  // Update stops source when data changes
  useEffect(() => {
    if (!map || !isLoaded) return;
    const source = map.getSource("stops") as import("maplibre-gl").GeoJSONSource | undefined;
    source?.setData(stopsToGeoJson(stops) ?? { type: "FeatureCollection", features: [] });
  }, [map, isLoaded, stops]);

  // Ensure vehicle icons are loaded after data or style changes
  useEffect(() => {
    if (!map || !isLoaded) return;
    void loadVehicleIcon(map);
  }, [map, isLoaded, vehicles]);

  return null; // This component only manages map state imperatively
}

// ─── Main MapView component ───

export function MapView({
  route,
  stops,
  vehicles,
  onSelectStop,
  onSelectVehicle,
  onMapReady,
  userLocation,
  isTrackingLocation,
  onToggleTracking,
}: MapViewProps) {
  const mapRef = useRef<MapRef | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  const initialBearing = isMobile ? (campusConfig.initialBearing ?? 0) : 0;

  const { campusCenter } = useMemo(
    () => getCampusViewport(CAMPUS_POLYGON, { isMobile }),
    [isMobile]
  );

  const handleFitBounds = () => {
    mapRef.current?.flyTo({
      center: campusCenter,
      zoom: campusConfig.initialZoom,
      bearing: isMobile ? (campusConfig.initialBearing ?? 0) : 0,
    });
  };

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <Map
        ref={mapRef}
        center={campusCenter}
        zoom={campusConfig.initialZoom}
        minZoom={campusConfig.minZoom}
        maxZoom={campusConfig.maxZoom}
        bearing={initialBearing}
        styles={MAP_STYLES}
      >
        {/* Custom GeoJSON layers (campus boundary, route, stops, vehicles) */}
        <MapLayers
          route={route}
          stops={stops}
          vehicles={vehicles}
          onSelectStop={onSelectStop}
          onSelectVehicle={onSelectVehicle}
          onMapReady={onMapReady}
        />

        {/* User position blue dot */}
        {userLocation && <UserLocationMarker location={userLocation} />}
      </Map>

      {/* Custom Navigation Controls (Mobile: Below Header Right, Desktop: Bottom-Left) */}
      <div className="absolute top-[180px] right-4 md:top-auto md:right-auto md:bottom-6 md:left-4 z-10 flex flex-col gap-2 shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-none">
        <ThemeToggle menuAlign={isMobile ? "right" : "left"} />
        <div
          className="flex flex-col overflow-hidden rounded-lg border shadow-lg"
          style={{
            background: "var(--map-control-bg)",
            borderColor: "var(--map-control-border)",
          }}
        >
          <button
            onClick={handleFitBounds}
            className="border-b p-2 text-[var(--color-text)] focus:outline-none hover:bg-[var(--map-control-hover)]"
            style={{ borderColor: "var(--map-control-border)" }}
            title="Fit to Campus"
          >
            <Scan size={20} />
          </button>
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="border-b p-2 text-[var(--color-text)] focus:outline-none hover:bg-[var(--map-control-hover)]"
            style={{ borderColor: "var(--map-control-border)" }}
            title="Zoom In"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="border-b p-2 text-[var(--color-text)] focus:outline-none hover:bg-[var(--map-control-hover)]"
            style={{ borderColor: "var(--map-control-border)" }}
            title="Zoom Out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          {onToggleTracking && (
            <button
              onClick={onToggleTracking}
              className={`p-2 focus:outline-none hover:bg-[var(--map-control-hover)] ${
                isTrackingLocation
                  ? "text-blue-500"
                  : "text-[var(--color-text)]"
              }`}
              title={isTrackingLocation ? "Stop tracking" : "Find my location"}
            >
              <Locate size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
