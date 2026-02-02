import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { config } from "../../lib/config";
import type { LineLayerSpecification, CircleLayerSpecification, FillLayerSpecification } from "maplibre-gl";
import campusConfig from "../../data/campus-config.json";

type DrawMode = "route" | "polygon";

type DrawingEditorMapProps = {
    mode: DrawMode;
    isDrawing: boolean;
    points: [number, number][];
    onMapClick: (lngLat: [number, number]) => void;
    onPointMove: (index: number, lngLat: [number, number]) => void;
    onPointInsert: (index: number, lngLat: [number, number]) => void;
};

const drawnLineLayer: LineLayerSpecification = {
    id: "drawn-line",
    type: "line",
    source: "drawn-shape",
    paint: {
        "line-color": ["case", ["==", ["get", "mode"], "polygon"], "#a855f7", "#dc2626"],
        "line-width": 4,
        "line-opacity": 0.9,
    },
};

const drawnFillLayer: FillLayerSpecification = {
    id: "drawn-fill",
    type: "fill",
    source: "drawn-shape",
    paint: {
        "fill-color": "#a855f7",
        "fill-opacity": 0.2,
    },
    filter: ["==", ["get", "mode"], "polygon"],
};

const drawnPointsLayer: CircleLayerSpecification = {
    id: "drawn-points",
    type: "circle",
    source: "drawn-points",
    paint: {
        "circle-color": ["case", ["==", ["get", "mode"], "polygon"], "#a855f7", "#1e293b"],
        "circle-radius": 8,
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
    },
};

const midpointsLayer: CircleLayerSpecification = {
    id: "mid-points",
    type: "circle",
    source: "mid-points",
    paint: {
        "circle-color": "#a855f7",
        "circle-radius": 5,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.6,
    },
};

export function DrawingEditorMap({ mode, isDrawing, points, onMapClick, onPointMove, onPointInsert }: DrawingEditorMapProps) {
    const mapRef = useRef<maplibregl.Map | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const draggingPointRef = useRef<number | null>(null);

    // Calculate bounds like in StopEditorMap
    const lngs = (campusConfig.polygon as [number, number][]).map((p) => p[0]);
    const lats = (campusConfig.polygon as [number, number][]).map((p) => p[1]);
    const campusBounds: maplibregl.LngLatBoundsLike = [
        [Math.min(...lngs) - 0.005, Math.min(...lats) - 0.005],
        [Math.max(...lngs) + 0.005, Math.max(...lats) + 0.005],
    ];
    const campusCenter: [number, number] = [
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
        (Math.min(...lats) + Math.max(...lats)) / 2,
    ];

    const onMapClickRef = useRef(onMapClick);
    const onPointMoveRef = useRef(onPointMove);
    const onPointInsertRef = useRef(onPointInsert);
    const isDrawingRef = useRef(isDrawing);

    useEffect(() => {
        onMapClickRef.current = onMapClick;
        onPointMoveRef.current = onPointMove;
        onPointInsertRef.current = onPointInsert;
        isDrawingRef.current = isDrawing;
    }, [onMapClick, onPointMove, onPointInsert, isDrawing]);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const styleUrl = `https://api.maptiler.com/maps/${campusConfig.mapStyle}/style.json?key=${config.mapTilerApiKey}`;
        const map = new maplibregl.Map({
            container: containerRef.current,
            style: styleUrl,
            center: campusCenter,
            zoom: 16,
            minZoom: 14,
            maxBounds: campusBounds,
        });

        map.addControl(new maplibregl.NavigationControl({ showZoom: true }));

        map.on("load", () => {
            map.addSource("drawn-shape", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
            map.addSource("drawn-points", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
            map.addSource("mid-points", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

            map.addLayer(drawnFillLayer);
            map.addLayer(drawnLineLayer);
            map.addLayer(drawnPointsLayer);
            map.addLayer(midpointsLayer);

            setIsMapReady(true);
        });

        // Click to add point (only when drawing and not on existing point)
        map.on("click", (e) => {
            if (draggingPointRef.current !== null) return; // Don't add while dragging

            // Check if clicked on an existing point
            const features = map.queryRenderedFeatures(e.point, { layers: ["drawn-points", "mid-points"] });
            if (features.length > 0) return; // Clicked on existing point or midpoint

            if (isDrawingRef.current) {
                const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
                onMapClickRef.current(lngLat);
            }
        });

        // Point drag start
        map.on("mousedown", "drawn-points", (e) => {
            e.preventDefault();
            const feature = e.features?.[0];
            if (feature && typeof feature.properties?.index === "number") {
                draggingPointRef.current = feature.properties.index;
                map.getCanvas().style.cursor = "grabbing";

                // Disable map drag while dragging point
                map.dragPan.disable();
            }
        });

        // Midpoint click/drag start - Insert point and start dragging
        map.on("mousedown", "mid-points", (e) => {
            e.preventDefault();
            const feature = e.features?.[0];
            if (feature && typeof feature.properties?.index === "number") {
                const index = feature.properties.index;
                const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];

                // Insert new point at mid-location
                // index is the index of the segment start point. So we insert at index + 1
                const newIndex = index + 1;
                onPointInsertRef.current(newIndex, lngLat);

                // Start dragging this new point immediately
                draggingPointRef.current = newIndex;
                map.getCanvas().style.cursor = "grabbing";
                map.dragPan.disable();
            }
        });

        // Drag move
        map.on("mousemove", (e) => {
            if (draggingPointRef.current !== null) {
                const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
                onPointMoveRef.current(draggingPointRef.current, lngLat);
            }
        });

        // Drag end
        map.on("mouseup", () => {
            if (draggingPointRef.current !== null) {
                draggingPointRef.current = null;
                map.getCanvas().style.cursor = "";
                map.dragPan.enable();
            }
        });

        // Cursor change on point hover
        map.on("mouseenter", "drawn-points", () => {
            if (draggingPointRef.current === null) {
                map.getCanvas().style.cursor = "grab";
            }
        });
        map.on("mouseleave", "drawn-points", () => {
            if (draggingPointRef.current === null) {
                map.getCanvas().style.cursor = isDrawingRef.current ? "crosshair" : "";
            }
        });

        // Cursor for midpoints
        map.on("mouseenter", "mid-points", () => {
            if (draggingPointRef.current === null) {
                map.getCanvas().style.cursor = "pointer";
            }
        });
        map.on("mouseleave", "mid-points", () => {
            if (draggingPointRef.current === null) {
                map.getCanvas().style.cursor = isDrawingRef.current ? "crosshair" : "";
            }
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
            setIsMapReady(false);
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (map && draggingPointRef.current === null) {
            map.getCanvas().style.cursor = isDrawing ? "crosshair" : "";
        }
    }, [isDrawing]);

    // Update visualization
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isMapReady) return;

        const shapeSource = map.getSource("drawn-shape") as maplibregl.GeoJSONSource | undefined;
        const pointsSource = map.getSource("drawn-points") as maplibregl.GeoJSONSource | undefined;
        const midpointsSource = map.getSource("mid-points") as maplibregl.GeoJSONSource | undefined;

        if (shapeSource) {
            if (mode === "polygon" && points.length >= 3) {
                const closedPolygon = [...points, points[0]];
                shapeSource.setData({
                    type: "Feature",
                    geometry: { type: "Polygon", coordinates: [closedPolygon] },
                    properties: { mode },
                });
            } else if (points.length >= 2) {
                shapeSource.setData({
                    type: "Feature",
                    geometry: { type: "LineString", coordinates: points },
                    properties: { mode },
                });
            } else {
                shapeSource.setData({ type: "FeatureCollection", features: [] });
            }
        }

        if (pointsSource) {
            pointsSource.setData({
                type: "FeatureCollection",
                features: points.map((point, index) => ({
                    type: "Feature" as const,
                    geometry: { type: "Point" as const, coordinates: point },
                    properties: { index, mode },
                })),
            });
        }

        if (midpointsSource) {
            if (points.length >= 2) {
                const midpoints = points.slice(0, -1).map((p1, i) => {
                    const p2 = points[i + 1];
                    const mid: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
                    return {
                        type: "Feature" as const,
                        geometry: { type: "Point" as const, coordinates: mid },
                        properties: { index: i }, // Index of the segment (point BEFORE midpoint)
                    };
                });

                // For polygon, add closing midpoint
                if (mode === "polygon" && points.length >= 3) {
                    const p1 = points[points.length - 1];
                    const p2 = points[0];
                    const mid: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
                    midpoints.push({
                        type: "Feature" as const,
                        geometry: { type: "Point" as const, coordinates: mid },
                        properties: { index: points.length - 1 },
                    });
                }

                midpointsSource.setData({
                    type: "FeatureCollection",
                    features: midpoints,
                });
            } else {
                midpointsSource.setData({ type: "FeatureCollection", features: [] });
            }
        }

    }, [points, mode, isMapReady]);

    return <div ref={containerRef} className="h-full w-full" />;
}
