import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import campusConfig from "../../data/campus-config.json";
import type { CircleLayerSpecification, SymbolLayerSpecification } from "maplibre-gl";
import { useTheme } from "next-themes";

import { loadMapIcons } from "./map-utils";
import { getCampusViewport } from "./campus-viewport";

type StopMarker = {
    id: string;
    position: [number, number];
    name_th: string;
    name_en: string;
    icon?: string;
    color?: string;
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
        "icon-image": ["coalesce", ["get", "icon"], "MapPin"],
        // Keep stops readable when zooming (editor typically uses wider zoom range than the main map).
        "icon-size": ["interpolate", ["linear"], ["zoom"], 14, 0.7, 16, 0.9, 18, 1.1, 20, 1.35],
        "icon-allow-overlap": true,
    },
};

// Fallback layer (doesn't depend on icons). If icons fail to load, stops are still visible.
const stopMarkersFallbackLayer: CircleLayerSpecification = {
    id: "stop-markers-fallback",
    type: "circle",
    source: "stop-markers",
    paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 6, 16, 8, 18, 10, 20, 12],
        "circle-color": [
            "match",
            ["get", "color"],
            "blue",
            "#3b82f6",
            "red",
            "#ef4444",
            "green",
            "#22c55e",
            "purple",
            "#a855f7",
            "orange",
            "#f97316",
            "teal",
            "#14b8a6",
            "#3b82f6",
        ],
        "circle-opacity": 0.95,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
    },
};

const stopLabelsLayer: SymbolLayerSpecification = {
    id: "stop-labels",
    type: "symbol",
    source: "stop-markers",
    layout: {
        "text-field": ["get", "label"],
        "text-size": 10,
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
    const { resolvedTheme } = useTheme();

    const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
    const { campusBounds, campusCenter } = useMemo(
        () => getCampusViewport(campusConfig.polygon as [number, number][], { isMobile }),
        [isMobile]
    );
    const styleUrl =
        resolvedTheme === "light"
            ? "https://tiles.openfreemap.org/styles/liberty"
            : "https://tiles.openfreemap.org/styles/dark";

    const onMapClickRef = useRef(onMapClick);
    onMapClickRef.current = onMapClick;
    const onStopMoveRef = useRef(onStopMove);
    onStopMoveRef.current = onStopMove;
    const isPlacingRef = useRef(isPlacing);
    isPlacingRef.current = isPlacing;

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: styleUrl,
            center: campusCenter,
            zoom: campusConfig.initialZoom,
            minZoom: campusConfig.minZoom,
            maxZoom: campusConfig.maxZoom,
            maxBounds: campusBounds,
        });

        map.addControl(new maplibregl.NavigationControl({ showZoom: true }));

        map.on("load", () => {
            map.addSource("stop-markers", {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
            });

            map.addLayer(stopMarkersFallbackLayer);
            map.addLayer(stopMarkersLayer);
            map.addLayer(stopLabelsLayer);

            loadMapIcons(map);

            // If a symbol requests an icon that isn't in the style yet, re-load icons.
            map.on("styleimagemissing", () => {
                loadMapIcons(map);
            });

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
    }, [campusBounds, campusCenter, styleUrl]);

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

        // Fast Refresh can preserve the Map instance; ensure stop icons are present even after HMR.
        loadMapIcons(map);

        const source = map.getSource("stop-markers") as maplibregl.GeoJSONSource | undefined;
        if (source) {
            source.setData({
                type: "FeatureCollection",
                features: stops.map((stop, index) => {
                    const iconName = stop.icon || "MapPin";
                    const colorSuffix = stop.color ? `-${stop.color}` : "";
                    const fullIconName = `${iconName}${colorSuffix}`;

                    return {
                        type: "Feature" as const,
                        geometry: { type: "Point" as const, coordinates: stop.position },
                        properties: {
                            index,
                            label: `${index + 1}`,
                            name_th: stop.name_th,
                            name_en: stop.name_en,
                            icon: fullIconName,
                            color: stop.color ?? "blue",
                        },
                    };
                }),
            });
            map.triggerRepaint();
        }
    }, [stops, isMapReady]);

    return <div ref={containerRef} className="h-full w-full" />;
}
