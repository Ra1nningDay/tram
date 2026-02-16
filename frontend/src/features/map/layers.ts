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
    // Use precomputed properties from `vehiclesToGeoJson` to avoid complex expressions.
    "icon-image": ["coalesce", ["get", "icon_image"], "Vehicle"],
    // Scale vehicle icon with zoom so it's readable when zoomed in, but not huge when zoomed out.
    "icon-size": ["interpolate", ["linear"], ["zoom"], 13, 0.7, 15, 0.9, 17, 1.15, 19, 1.5, 21, 1.9],
    "icon-allow-overlap": true,
    "icon-keep-upright": true,
    "icon-rotate": 0, // icon-rotate is managed by source (always 0 now, just flipping)
    "icon-rotation-alignment": "viewport",
    "icon-ignore-placement": true,
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
