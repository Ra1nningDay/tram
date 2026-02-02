import type { LineLayerSpecification, CircleLayerSpecification, SymbolLayerSpecification } from "maplibre-gl";

export const routeLayer: LineLayerSpecification = {
  id: "route-line",
  type: "line",
  source: "route",
  paint: {
    "line-color": "#94a3b8", // Subtle gray (hidden)
    "line-width": 2,
    "line-opacity": 0, // Hidden - route is invisible, vehicles move on it
  },
};

export const stopsLayer: SymbolLayerSpecification = {
  id: "stops",
  type: "symbol",
  source: "stops",
  layout: {
    "icon-image": ["get", "icon"],
    "icon-size": 1.0, // 80x80 origin @ 2x pixelRatio = 40px logical size
    "icon-allow-overlap": true,
  },
};

export const vehiclesLayer: SymbolLayerSpecification = {
  id: "vehicles",
  type: "symbol",
  source: "vehicles",
  layout: {
    "icon-image": "Vehicle",
    "icon-size": 1.0,
    "icon-allow-overlap": true,
    // Icon seems to be facing the opposite way of what we expected. 
    // Previous: -90 (Backwards). New: +90 (Should be Forwards).
    "icon-rotate": ["+", ["get", "heading"], 270],
    "icon-rotation-alignment": "map",
  },
  paint: {
    "icon-color": [
      "match",
      ["get", "status"],
      "fresh",
      "#16a34a", // Green-600 (Darker for better contrast)
      "delayed",
      "#ea580c", // Orange-600
      "offline",
      "#dc2626", // Red-600
      "#64748b", // Slate-500
    ],
    "icon-halo-color": "#ffffff",
    "icon-halo-width": 2,
    "icon-halo-blur": 0.5,
  },
};