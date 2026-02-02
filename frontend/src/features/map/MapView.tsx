import { useEffect, useRef } from "react";
import { Scan, Plus, Minus } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { config } from "../../lib/config";
import { routeLayer, stopsLayer, vehiclesLayer } from "./layers";
import { routeToGeoJson, stopsToGeoJson, vehiclesToGeoJson } from "./sources";
import { loadMapIcons, loadVehicleIcon } from "./map-utils";

import type { Route, Stop, Vehicle } from "../shuttle/api";
import type { FillLayerSpecification } from "maplibre-gl";
import campusConfig from "../../data/campus-config.json";

type MapViewProps = {
  route?: Route;
  stops?: Stop[];
  vehicles?: Vehicle[];
  onSelectStop: (stopId: string) => void;
  onSelectVehicle: (vehicleId: string) => void;
};

// BU Campus polygon mask (from JSON config)
const CAMPUS_POLYGON: [number, number][] = campusConfig.polygon as [number, number][];

// Create inverted polygon that covers entire world EXCEPT campus
function createMaskPolygon() {
  // Outer ring - covers whole world
  const outer = [
    [-180, -90],
    [180, -90],
    [180, 90],
    [-180, 90],
    [-180, -90],
  ];

  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [outer, CAMPUS_POLYGON],
    },
    properties: {},
  };
}

// Mask layer - white fill outside campus
const maskLayer: FillLayerSpecification = {
  id: "campus-mask",
  type: "fill",
  source: "campus-mask",
  paint: {
    "fill-color": campusConfig.maskColor,
    "fill-opacity": campusConfig.maskOpacity,
  },
};

export function MapView({ route, stops, vehicles, onSelectStop, onSelectVehicle }: MapViewProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapLoadedRef = useRef(false);

  const isMobile = window.innerWidth < 768;

  // Calculate bounds from polygon
  const lngs = CAMPUS_POLYGON.map(p => p[0]);
  const lats = CAMPUS_POLYGON.map(p => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lngSpan = maxLng - minLng;
  const latSpan = maxLat - minLat;
  const boundsPaddingRatio = isMobile ? 0.5 : 0.1;
  const lngPad = lngSpan * boundsPaddingRatio;
  const latPad = latSpan * boundsPaddingRatio;
  const campusBounds: maplibregl.LngLatBoundsLike = [
    [minLng - lngPad, minLat - latPad],
    [maxLng + lngPad, maxLat + latPad],
  ];
  const campusCenter: [number, number] = [
    (minLng + maxLng) / 2,
    (minLat + maxLat) / 2,
  ];

  // Stable callback refs
  const onSelectStopRef = useRef(onSelectStop);
  const onSelectVehicleRef = useRef(onSelectVehicle);
  onSelectStopRef.current = onSelectStop;
  onSelectVehicleRef.current = onSelectVehicle;

  // Initialize map ONCE
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Using OpenFreeMap - free, no API key required
    const styleUrl = "https://tiles.openfreemap.org/styles/liberty";

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

    map.on("load", () => {
      // Add mask source and layer FIRST (bottom layer)
      map.addSource("campus-mask", {
        type: "geojson",
        data: createMaskPolygon(),
      });
      map.addLayer(maskLayer);

      // Add data sources
      map.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("stops", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("vehicles", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      map.addLayer(routeLayer);
      map.addLayer(stopsLayer);
      map.addLayer(vehiclesLayer);

      loadMapIcons(map);
      loadVehicleIcon(map);

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

      mapLoadedRef.current = true;
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
    };
  }, []);

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

  // Update vehicles source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    const source = map.getSource("vehicles") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(vehiclesToGeoJson(vehicles) ?? { type: "FeatureCollection", features: [] });
    }
  }, [vehicles]);

  // Initial data load
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleLoad = () => {
      const routeSource = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
      const stopsSource = map.getSource("stops") as maplibregl.GeoJSONSource | undefined;
      const vehiclesSource = map.getSource("vehicles") as maplibregl.GeoJSONSource | undefined;

      if (routeSource && route) {
        routeSource.setData(routeToGeoJson(route) ?? { type: "FeatureCollection", features: [] });
      }
      if (stopsSource && stops) {
        stopsSource.setData(stopsToGeoJson(stops) ?? { type: "FeatureCollection", features: [] });
      }
      if (vehiclesSource && vehicles) {
        vehiclesSource.setData(vehiclesToGeoJson(vehicles) ?? { type: "FeatureCollection", features: [] });
      }
    };

    if (mapLoadedRef.current) {
      handleLoad();
    } else {
      map.on("load", handleLoad);
    }
  }, [route, stops, vehicles]);

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
      <div ref={containerRef} className="h-full w-full" />

      {/* Custom Navigation Controls (Bottom-Left) */}
      <div className="absolute bottom-6 left-4 z-10 flex flex-col gap-2">
        <div className="flex flex-col bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
          <button
            onClick={handleFitBounds}
            className="p-2 hover:bg-gray-50 focus:outline-none focus:bg-gray-100 text-gray-700 border-b border-gray-100"
            title="Fit to Campus"
          >
            <Scan size={20} />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-50 focus:outline-none focus:bg-gray-100 text-gray-700 border-b border-gray-100"
            title="Zoom In"
          >
            <Plus size={20} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-50 focus:outline-none focus:bg-gray-100 text-gray-700"
            title="Zoom Out"
          >
            <Minus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
