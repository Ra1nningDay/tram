import type {
  CircleLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";

/** Darker casing behind the route line for depth / outline effect */
export const routeCasingLayer: LineLayerSpecification = {
  id: "route-casing",
  type: "line",
  source: "route",
  paint: {
    "line-color": [
      "match", ["get", "direction"],
      "outbound", "#0c4a6e",  // dark sky-blue
      "inbound",  "#7c2d12",  // dark orange-brown
      "#334155",
    ] as unknown as string,
    "line-width": 7,
    "line-opacity": 0.45,
  },
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
};

export const routeLayer: LineLayerSpecification = {
  id: "route-line",
  type: "line",
  source: "route",
  paint: {
    "line-color": [
      "match", ["get", "direction"],
      "outbound", "#38bdf8",  // sky-400  — cyan-blue
      "inbound",  "#fb923c",  // orange-400
      "#94a3b8",
    ] as unknown as string,
    "line-width": 4,
    "line-opacity": 0.85,
  },
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
};

export const activeStopHaloLayer: CircleLayerSpecification = {
  id: "stops-active-halo",
  type: "circle",
  source: "stops",
  filter: ["==", ["get", "is_active"], 1],
  paint: {
    "circle-color": "#fb923c",
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      13,
      12,
      15,
      18,
      17,
      24,
      19,
      30,
    ],
    "circle-blur": 0.55,
    "circle-opacity": 0.34,
    "circle-stroke-color": "#fdba74",
    "circle-stroke-width": 1.5,
    "circle-stroke-opacity": 0.75,
  },
};

export const stopsLayer: SymbolLayerSpecification = {
  id: "stops",
  type: "symbol",
  source: "stops",
  layout: {
    "icon-image": [
      "case",
      ["==", ["get", "is_active"], 1],
      ["get", "active_icon"],
      ["get", "icon"],
    ],
    // Scale stop icons with zoom so they stay readable when zooming in.
    // Base assets are 80x80 @ pixelRatio=2 (so ~40px at icon-size=1).
    "icon-size": [
      "interpolate",
      ["linear"],
      ["zoom"],
      13.5,
      ["case", ["==", ["get", "is_active"], 1], 0.95, 0.75],
      15,
      ["case", ["==", ["get", "is_active"], 1], 1.1, 0.9],
      16.5,
      ["case", ["==", ["get", "is_active"], 1], 1.28, 1.05],
      18,
      ["case", ["==", ["get", "is_active"], 1], 1.5, 1.25],
    ],
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
  paint: {
    "icon-opacity": [
      "case",
      ["==", ["get", "is_active"], 1],
      1,
      0.92,
    ],
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
