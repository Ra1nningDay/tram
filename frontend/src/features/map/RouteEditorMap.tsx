import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { config } from "../../lib/config";
import type { LineLayerSpecification, CircleLayerSpecification, FillLayerSpecification } from "maplibre-gl";

type RouteEditorMapProps = {
    isDrawingRoute: boolean;
    isDrawingBounds: boolean;
    isDrawingPolygon: boolean;
    routePoints: [number, number][];
    boundsCorners: [number, number][];
    polygonPoints: [number, number][];
    onMapClick: (lngLat: [number, number]) => void;
};

const drawnRouteLayer: LineLayerSpecification = {
    id: "drawn-route",
    type: "line",
    source: "drawn-route",
    paint: {
        "line-color": "#dc2626",
        "line-width": 4,
        "line-opacity": 0.9,
    },
};

const drawnPointsLayer: CircleLayerSpecification = {
    id: "drawn-points",
    type: "circle",
    source: "drawn-points",
    paint: {
        "circle-color": "#1e293b",
        "circle-radius": 6,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
    },
};

const boundsRectLayer: FillLayerSpecification = {
    id: "bounds-rect",
    type: "fill",
    source: "bounds-rect",
    paint: {
        "fill-color": "#3b82f6",
        "fill-opacity": 0.2,
    },
};

const boundsOutlineLayer: LineLayerSpecification = {
    id: "bounds-outline",
    type: "line",
    source: "bounds-rect",
    paint: {
        "line-color": "#3b82f6",
        "line-width": 3,
        "line-dasharray": [2, 2],
    },
};

const boundsPointsLayer: CircleLayerSpecification = {
    id: "bounds-points",
    type: "circle",
    source: "bounds-points",
    paint: {
        "circle-color": "#3b82f6",
        "circle-radius": 8,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
    },
};

// Polygon mask layers
const polygonFillLayer: FillLayerSpecification = {
    id: "polygon-fill",
    type: "fill",
    source: "polygon-mask",
    paint: {
        "fill-color": "#a855f7",
        "fill-opacity": 0.2,
    },
};

const polygonOutlineLayer: LineLayerSpecification = {
    id: "polygon-outline",
    type: "line",
    source: "polygon-mask",
    paint: {
        "line-color": "#a855f7",
        "line-width": 3,
    },
};

const polygonPointsLayer: CircleLayerSpecification = {
    id: "polygon-points",
    type: "circle",
    source: "polygon-points",
    paint: {
        "circle-color": "#a855f7",
        "circle-radius": 8,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
    },
};

export function RouteEditorMap({
    isDrawingRoute,
    isDrawingBounds,
    isDrawingPolygon,
    routePoints,
    boundsCorners,
    polygonPoints,
    onMapClick,
}: RouteEditorMapProps) {
    const mapRef = useRef<maplibregl.Map | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapLoadedRef = useRef(false);

    const campusBounds: maplibregl.LngLatBoundsLike = [
        [100.580, 14.020],
        [100.650, 14.060],
    ];
    const campusCenter: [number, number] = [100.610, 14.039];

    const onMapClickRef = useRef(onMapClick);
    onMapClickRef.current = onMapClick;
    const isDrawingRef = useRef(isDrawingRoute || isDrawingBounds || isDrawingPolygon);
    isDrawingRef.current = isDrawingRoute || isDrawingBounds || isDrawingPolygon;

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        // Using OpenFreeMap - free, no API key required
        const styleUrl = "https://tiles.openfreemap.org/styles/liberty";
        const map = new maplibregl.Map({
            container: containerRef.current,
            style: styleUrl,
            center: campusCenter,
            zoom: 15,
            minZoom: 12,
            maxBounds: campusBounds,
        });

        map.addControl(new maplibregl.NavigationControl({ showZoom: true }));

        map.on("load", () => {
            // Route sources
            map.addSource("drawn-route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
            map.addSource("drawn-points", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

            // Bounds sources
            map.addSource("bounds-rect", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
            map.addSource("bounds-points", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

            // Polygon sources
            map.addSource("polygon-mask", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
            map.addSource("polygon-points", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

            map.addLayer(boundsRectLayer);
            map.addLayer(boundsOutlineLayer);
            map.addLayer(boundsPointsLayer);
            map.addLayer(polygonFillLayer);
            map.addLayer(polygonOutlineLayer);
            map.addLayer(polygonPointsLayer);
            map.addLayer(drawnRouteLayer);
            map.addLayer(drawnPointsLayer);

            mapLoadedRef.current = true;
        });

        map.on("click", (e) => {
            if (isDrawingRef.current) {
                const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
                onMapClickRef.current(lngLat);
            }
        });

        map.on("mousemove", () => {
            map.getCanvas().style.cursor = isDrawingRef.current ? "crosshair" : "";
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
            mapLoadedRef.current = false;
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (map) {
            map.getCanvas().style.cursor = isDrawingRoute || isDrawingBounds || isDrawingPolygon ? "crosshair" : "";
        }
    }, [isDrawingRoute, isDrawingBounds, isDrawingPolygon]);

    // Route visualization
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapLoadedRef.current) return;

        const routeSource = map.getSource("drawn-route") as maplibregl.GeoJSONSource | undefined;
        if (routeSource) {
            if (routePoints.length >= 2) {
                routeSource.setData({
                    type: "Feature",
                    geometry: { type: "LineString", coordinates: routePoints },
                    properties: {},
                });
            } else {
                routeSource.setData({ type: "FeatureCollection", features: [] });
            }
        }

        const pointsSource = map.getSource("drawn-points") as maplibregl.GeoJSONSource | undefined;
        if (pointsSource) {
            pointsSource.setData({
                type: "FeatureCollection",
                features: routePoints.map((point, index) => ({
                    type: "Feature" as const,
                    geometry: { type: "Point" as const, coordinates: point },
                    properties: { index },
                })),
            });
        }
    }, [routePoints]);

    // Bounds visualization
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapLoadedRef.current) return;

        const boundsSource = map.getSource("bounds-rect") as maplibregl.GeoJSONSource | undefined;
        const boundsPointsSource = map.getSource("bounds-points") as maplibregl.GeoJSONSource | undefined;

        if (boundsCorners.length === 2) {
            const [sw, ne] = [
                [Math.min(boundsCorners[0][0], boundsCorners[1][0]), Math.min(boundsCorners[0][1], boundsCorners[1][1])],
                [Math.max(boundsCorners[0][0], boundsCorners[1][0]), Math.max(boundsCorners[0][1], boundsCorners[1][1])],
            ];
            const polygon = [
                [sw[0], sw[1]], [ne[0], sw[1]], [ne[0], ne[1]], [sw[0], ne[1]], [sw[0], sw[1]],
            ];

            if (boundsSource) {
                boundsSource.setData({
                    type: "Feature",
                    geometry: { type: "Polygon", coordinates: [polygon] },
                    properties: {},
                });
            }
        } else {
            if (boundsSource) {
                boundsSource.setData({ type: "FeatureCollection", features: [] });
            }
        }

        if (boundsPointsSource) {
            boundsPointsSource.setData({
                type: "FeatureCollection",
                features: boundsCorners.map((point, index) => ({
                    type: "Feature" as const,
                    geometry: { type: "Point" as const, coordinates: point },
                    properties: { label: index === 0 ? "SW" : "NE" },
                })),
            });
        }
    }, [boundsCorners]);

    // Polygon visualization
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapLoadedRef.current) return;

        const polygonSource = map.getSource("polygon-mask") as maplibregl.GeoJSONSource | undefined;
        const polygonPointsSource = map.getSource("polygon-points") as maplibregl.GeoJSONSource | undefined;

        if (polygonPoints.length >= 3) {
            // Close the polygon
            const closedPolygon = [...polygonPoints, polygonPoints[0]];
            if (polygonSource) {
                polygonSource.setData({
                    type: "Feature",
                    geometry: { type: "Polygon", coordinates: [closedPolygon] },
                    properties: {},
                });
            }
        } else if (polygonPoints.length >= 2) {
            // Show as line while drawing
            if (polygonSource) {
                polygonSource.setData({
                    type: "Feature",
                    geometry: { type: "LineString", coordinates: polygonPoints },
                    properties: {},
                });
            }
        } else {
            if (polygonSource) {
                polygonSource.setData({ type: "FeatureCollection", features: [] });
            }
        }

        if (polygonPointsSource) {
            polygonPointsSource.setData({
                type: "FeatureCollection",
                features: polygonPoints.map((point, index) => ({
                    type: "Feature" as const,
                    geometry: { type: "Point" as const, coordinates: point },
                    properties: { index },
                })),
            });
        }
    }, [polygonPoints]);

    return <div ref={containerRef} className="h-full w-full" />;
}
