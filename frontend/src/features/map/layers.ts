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
    // Scale stop icons with zoom so they stay readable when zooming in.
    // Base assets are 80x80 @ pixelRatio=2 (so ~40px at icon-size=1).
    "icon-size": ["interpolate", ["linear"], ["zoom"], 13.5, 0.75, 15, 0.9, 16.5, 1.05, 18, 1.25],
    "icon-allow-overlap": true,
  },
};

export const vehiclesLayer: SymbolLayerSpecification = {
  id: "vehicles",
  type: "symbol",
  source: "vehicles",
  layout: {
    // Select Bus icon color based on vehicle status
    "icon-image": [
      "match", ["get", "status"],
      "fresh", "Vehicle-fresh",
      "delayed", "Vehicle-delayed",
      "offline", "Vehicle-offline",
      "selected", "Vehicle-selected",
      "Vehicle"
    ],
    // Selected vehicle is bigger to stand out
    "icon-size": [
      "interpolate", ["linear"], ["zoom"],
      13, ["match", ["get", "status"], "selected", 0.95, 0.7],
      15, ["match", ["get", "status"], "selected", 1.15, 0.9],
      17, ["match", ["get", "status"], "selected", 1.4, 1.15],
      19, ["match", ["get", "status"], "selected", 1.75, 1.5],
      21, ["match", ["get", "status"], "selected", 2.15, 1.9],
    ],
    "icon-allow-overlap": true,
    "icon-rotation-alignment": "viewport",
    "icon-ignore-placement": true,
  },
  paint: {},
};
