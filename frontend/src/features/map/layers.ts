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
      "Vehicle"
    ],
    // Scale vehicle icon with zoom so it's readable when zoomed in, but not huge when zoomed out.
    "icon-size": ["interpolate", ["linear"], ["zoom"], 13, 0.7, 15, 0.9, 17, 1.15, 19, 1.5, 21, 1.9],
    "icon-allow-overlap": true,
    "icon-rotation-alignment": "viewport",
    "icon-ignore-placement": true,
  },
  paint: {},
};
