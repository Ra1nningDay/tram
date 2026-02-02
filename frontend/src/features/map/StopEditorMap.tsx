import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { config } from "../../lib/config";
import campusConfig from "../../data/campus-config.json";
import type { CircleLayerSpecification, SymbolLayerSpecification } from "maplibre-gl";

import { loadMapIcons } from "./map-utils";

type StopMarker = {
    id: string;
    position: [number, number];
    name_th: string;
    name_en: string;
    icon?: string;
};

type StopEditorMapProps = {
    isPlacing: boolean;
    stops: StopMarker[];
    onMapClick: (lngLat: [number, number]) => void;
    onStopMove: (index: number, lngLat: [number, number]) => void;
};

const stopMarkersLayer: SymbolLayerSpecification = {
    id: "stop-markers",
    type: "symbol",
    source: "stop-markers",
    layout: {
        "icon-image": ["get", "icon"],
        "icon-size": 1.0,
        "icon-allow-overlap": true,
    },
};

const stopLabelsLayer: SymbolLayerSpecification = {
    id: "stop-labels",
    type: "symbol",
    source: "stop-markers",
    layout: {
        "text-field": ["get", "label"],
        "text-size": 10,
        "text-font": ["Open Sans Bold"],
        "text-allow-overlap": true,
        "text-offset": [0, 2], // Move text below icon (adjusted for larger icon)
    },
    paint: {
        "text-color": "#1e293b",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
    },
};

export function StopEditorMap({ isPlacing, stops, onMapClick, onStopMove }: StopEditorMapProps) {
    const mapRef = useRef<maplibregl.Map | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const draggingRef = useRef<number | null>(null);

    // Calculate bounds from polygon
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
    onMapClickRef.current = onMapClick;
    const onStopMoveRef = useRef(onStopMove);
    onStopMoveRef.current = onStopMove;
    const isPlacingRef = useRef(isPlacing);
    isPlacingRef.current = isPlacing;

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
            map.addSource("stop-markers", {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
            });

            map.addLayer(stopMarkersLayer);
            map.addLayer(stopLabelsLayer);

            loadMapIcons(map);

            setIsMapReady(true);
        });

        // Click to add stop
        map.on("click", (e) => {
            if (draggingRef.current !== null) return;

            const features = map.queryRenderedFeatures(e.point, { layers: ["stop-markers"] });
            if (features.length > 0) return;

            if (isPlacingRef.current) {
                const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
                onMapClickRef.current(lngLat);
            }
        });

        // Drag start
        map.on("mousedown", "stop-markers", (e) => {
            e.preventDefault();
            const feature = e.features?.[0];
            if (feature && typeof feature.properties?.index === "number") {
                draggingRef.current = feature.properties.index;
                map.getCanvas().style.cursor = "grabbing";
                map.dragPan.disable();
            }
        });

        // Drag move
        map.on("mousemove", (e) => {
            if (draggingRef.current !== null) {
                const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
                onStopMoveRef.current(draggingRef.current, lngLat);
            }
        });

        // Drag end
        map.on("mouseup", () => {
            if (draggingRef.current !== null) {
                draggingRef.current = null;
                map.getCanvas().style.cursor = "";
                map.dragPan.enable();
            }
        });

        // Cursor
        map.on("mouseenter", "stop-markers", () => {
            if (draggingRef.current === null) {
                map.getCanvas().style.cursor = "grab";
            }
        });

        map.on("mouseleave", "stop-markers", () => {
            if (draggingRef.current === null) {
                map.getCanvas().style.cursor = isPlacingRef.current ? "crosshair" : "";
            }
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
            setIsMapReady(false);
        };
    }, []);

    // Update cursor when placing mode changes
    useEffect(() => {
        const map = mapRef.current;
        if (map && draggingRef.current === null) {
            map.getCanvas().style.cursor = isPlacing ? "crosshair" : "";
        }
    }, [isPlacing]);

    // Update markers
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isMapReady) return;

        const source = map.getSource("stop-markers") as maplibregl.GeoJSONSource | undefined;
        if (source) {
            source.setData({
                type: "FeatureCollection",
                features: stops.map((stop, index) => ({
                    type: "Feature" as const,
                    geometry: { type: "Point" as const, coordinates: stop.position },
                    properties: {
                        index,
                        label: `${index + 1}`,
                        name_th: stop.name_th,
                        name_en: stop.name_en,
                        icon: stop.icon || "MapPin",
                    },
                })),
            });
        }
    }, [stops, isMapReady]);

    return <div ref={containerRef} className="h-full w-full" />;
}
