import { useEffect, useMemo, useRef } from "react";
import { Scan, Plus, Minus } from "lucide-react";
import maplibregl from "maplibre-gl";
import { useTheme } from "next-themes";
import { routeLayer, stopsLayer, vehiclesLayer } from "./layers";
import { routeToGeoJson, stopsToGeoJson } from "./sources";
import { loadMapIcons, loadVehicleIcon } from "./map-utils";
import { getCampusViewport } from "./campus-viewport";
import { ThemeToggle } from "../../components/ThemeToggle";

import type { Route, Stop, Vehicle } from "../shuttle/api";
import type { LineLayerSpecification } from "maplibre-gl";
import campusConfig from "../../data/campus-config.json";

type MapViewProps = {
  route?: Route;
  stops?: Stop[];
  vehicles?: Vehicle[];
  onSelectStop: (stopId: string) => void;
  onSelectVehicle: (vehicleId: string | null) => void;
  onMapReady?: (map: maplibregl.Map) => void;
};

// BU Campus polygon mask (from JSON config)
const CAMPUS_POLYGON: [number, number][] = campusConfig.polygon as [number, number][];

// Create a closed LineString around the campus boundary
function createBoundaryLine() {
  // Ensure the ring is closed
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

export function MapView({ route, stops, vehicles, onSelectStop, onSelectVehicle, onMapReady }: MapViewProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapLoadedRef = useRef(false);
  const { resolvedTheme } = useTheme();

  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  // EXPERIMENTAL: Always use "liberty" style (detailed) and invert colors in CSS for dark mode
  const styleUrl = "https://tiles.openfreemap.org/styles/liberty";

  const { campusCenter } = useMemo(
    () => getCampusViewport(CAMPUS_POLYGON, { isMobile }),
    [isMobile]
  );

  // Stable callback refs
  const onSelectStopRef = useRef(onSelectStop);
  const onSelectVehicleRef = useRef(onSelectVehicle);
  const onMapReadyRef = useRef(onMapReady);
  onSelectStopRef.current = onSelectStop;
  onSelectVehicleRef.current = onSelectVehicle;
  onMapReadyRef.current = onMapReady;

  // Keep track of latest data for map re-initialization (e.g. on theme switch)
  const routeRef = useRef(route);
  const stopsRef = useRef(stops);
  routeRef.current = route;
  stopsRef.current = stops;

  // Initialize map ONCE
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialBearing = isMobile ? (campusConfig.initialBearing ?? 0) : 0;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: campusCenter,
      zoom: campusConfig.initialZoom,
      minZoom: campusConfig.minZoom,
      maxZoom: campusConfig.maxZoom,
      bearing: initialBearing,
    });

    map.on("load", async () => {
      // Add campus boundary outline
      map.addSource("campus-boundary", {
        type: "geojson",
        data: createBoundaryLine(),
      });
      map.addLayer(boundaryLayer);

      // Add data sources
      // FIX: Use refs to populate with current data immediately
      map.addSource("route", {
        type: "geojson",
        data: routeToGeoJson(routeRef.current) ?? { type: "FeatureCollection", features: [] }
      });
      map.addSource("stops", {
        type: "geojson",
        data: stopsToGeoJson(stopsRef.current) ?? { type: "FeatureCollection", features: [] }
      });
      map.addSource("vehicles", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      map.addLayer(routeLayer);
      map.addLayer(stopsLayer);
      map.addLayer(vehiclesLayer);

      // Wait for all icons to load before marking map as ready
      await Promise.all([loadMapIcons(map), loadVehicleIcon(map)]);

      // Hide default one-way arrows from the style
      if (map.getLayer("road_oneway")) map.setLayoutProperty("road_oneway", "visibility", "none");
      if (map.getLayer("road_oneway_opposite")) map.setLayoutProperty("road_oneway_opposite", "visibility", "none");

      map.on("click", "stops", (event) => {
        const feature = event.features?.[0];
        const stopId = feature?.properties?.id as string | undefined;
        if (stopId) onSelectStopRef.current(stopId);
      });

      map.on("click", "vehicles", (event) => {
        const feature = event.features?.[0];
        const vehicleId = feature?.properties?.id as string | undefined;
        if (vehicleId) onSelectVehicleRef.current(vehicleId);
      });

      map.on("click", (e) => {
        // If they click on the map background (not a feature), deselect
        const features = map.queryRenderedFeatures(e.point, { layers: ["vehicles", "stops"] });
        if (features.length === 0) {
          onSelectVehicleRef.current(null);
        }
      });

      mapLoadedRef.current = true;
      onMapReadyRef.current?.(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
    };
  }, [campusCenter, isMobile]); // Removed mapTheme/styleUrl to prevent re-init on theme switch

  // Update route source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    const source = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(routeToGeoJson(route) ?? { type: "FeatureCollection", features: [] });
    }
  }, [route]);

  // Update stops source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    const source = map.getSource("stops") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(stopsToGeoJson(stops) ?? { type: "FeatureCollection", features: [] });
    }
  }, [stops]);

  // Vehicle rendering is handled by the animation callback (setMapUpdater in MapPage).
  // We only need to ensure vehicle icons are loaded after HMR.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    loadVehicleIcon(map);
  }, [vehicles]);

  const handleFitBounds = () => {
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      center: campusCenter,
      zoom: campusConfig.initialZoom,
      bearing: isMobile ? (campusConfig.initialBearing ?? 0) : 0,
    });
  };

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full transition-[filter] duration-300"
        style={{
          filter: resolvedTheme === "dark" ? "invert(1) hue-rotate(180deg) brightness(0.95)" : "none"
        }}
      />

      {/* Custom Navigation Controls (Mobile: Top-Right, Desktop: Bottom-Left) */}
      <div className="absolute top-5 right-4 md:top-auto md:right-auto md:bottom-6 md:left-4 z-10 flex flex-col gap-2">
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
            onClick={handleZoomIn}
            className="border-b p-2 text-[var(--color-text)] focus:outline-none hover:bg-[var(--map-control-hover)]"
            style={{ borderColor: "var(--map-control-border)" }}
            title="Zoom In"
          >
            <Plus size={20} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 text-[var(--color-text)] focus:outline-none hover:bg-[var(--map-control-hover)]"
            title="Zoom Out"
          >
            <Minus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
