import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import campusConfig from "../../data/campus-config.json";
import { useTheme } from "next-themes";

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

const STOP_COLORS: Record<string, string> = {
  blue: "#2563eb",
  red: "#dc2626",
  green: "#16a34a",
  purple: "#9333ea",
  orange: "#ea580c",
  teal: "#0f766e",
};

function getStopColor(color?: string) {
  if (!color) {
    return STOP_COLORS.blue;
  }

  return STOP_COLORS[color] ?? STOP_COLORS.blue;
}

function createMarkerElement() {
  const element = document.createElement("div");
  element.style.display = "flex";
  element.style.flexDirection = "column";
  element.style.alignItems = "center";
  element.style.gap = "6px";
  element.style.transform = "translateY(-6px)";
  element.style.userSelect = "none";

  const bubble = document.createElement("div");
  bubble.dataset.part = "bubble";
  bubble.style.display = "flex";
  bubble.style.height = "34px";
  bubble.style.width = "34px";
  bubble.style.alignItems = "center";
  bubble.style.justifyContent = "center";
  bubble.style.borderRadius = "9999px";
  bubble.style.border = "2px solid rgba(255,255,255,0.95)";
  bubble.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.3)";
  bubble.style.color = "#ffffff";
  bubble.style.fontSize = "13px";
  bubble.style.fontWeight = "700";
  bubble.style.cursor = "grab";

  const label = document.createElement("div");
  label.dataset.part = "label";
  label.style.maxWidth = "124px";
  label.style.overflow = "hidden";
  label.style.textOverflow = "ellipsis";
  label.style.whiteSpace = "nowrap";
  label.style.borderRadius = "9999px";
  label.style.background = "rgba(255,255,255,0.92)";
  label.style.padding = "2px 8px";
  label.style.boxShadow = "0 8px 20px rgba(15, 23, 42, 0.18)";
  label.style.color = "#0f172a";
  label.style.fontSize = "11px";
  label.style.fontWeight = "600";

  element.append(bubble, label);

  return element;
}

function updateMarkerElement(element: HTMLDivElement, stop: StopMarker, index: number) {
  const bubble = element.querySelector('[data-part="bubble"]');
  const label = element.querySelector('[data-part="label"]');

  if (!(bubble instanceof HTMLDivElement) || !(label instanceof HTMLDivElement)) {
    return;
  }

  const stopNumber = `${index + 1}`;
  const stopLabel = stop.name_th?.trim() || stop.name_en?.trim() || `Stop ${index + 1}`;

  element.dataset.index = String(index);
  element.title = stopLabel;
  bubble.textContent = stopNumber;
  bubble.style.background = getStopColor(stop.color);
  label.textContent = stopLabel;
}

export function StopEditorMap({ isPlacing, stops, onMapClick, onStopMove }: StopEditorMapProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef(new Map<string, { marker: maplibregl.Marker; element: HTMLDivElement }>());
  const [isMapReady, setIsMapReady] = useState(false);
  const draggingRef = useRef(false);
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
      map.resize();
      setIsMapReady(true);
    });

    map.on("click", (event) => {
      if (draggingRef.current || !isPlacingRef.current) {
        return;
      }

      onMapClickRef.current([event.lngLat.lng, event.lngLat.lat]);
    });

    mapRef.current = map;

    return () => {
      for (const { marker } of markersRef.current.values()) {
        marker.remove();
      }

      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, [campusBounds, campusCenter, styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    map.getCanvas().style.cursor = isPlacing && !draggingRef.current ? "crosshair" : "";
  }, [isPlacing]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    const existingMarkers = markersRef.current;
    const nextIds = new Set(stops.map((stop) => stop.id));

    for (const [stopId, markerInstance] of existingMarkers.entries()) {
      if (!nextIds.has(stopId)) {
        markerInstance.marker.remove();
        existingMarkers.delete(stopId);
      }
    }

    for (const [index, stop] of stops.entries()) {
      const existing = existingMarkers.get(stop.id);

      if (existing) {
        existing.marker.setLngLat(stop.position);
        updateMarkerElement(existing.element, stop, index);
        continue;
      }

      const element = createMarkerElement();
      updateMarkerElement(element, stop, index);
      element.addEventListener("click", (event) => {
        event.stopPropagation();
      });

      const marker = new maplibregl.Marker({
        element,
        anchor: "bottom",
        draggable: true,
      })
        .setLngLat(stop.position)
        .addTo(map);

      marker.on("dragstart", () => {
        draggingRef.current = true;
        element.style.pointerEvents = "none";
        map.getCanvas().style.cursor = "grabbing";
      });

      marker.on("dragend", () => {
        const { lng, lat } = marker.getLngLat();
        const nextIndex = Number(element.dataset.index ?? "-1");

        draggingRef.current = false;
        element.style.pointerEvents = "";
        map.getCanvas().style.cursor = isPlacingRef.current ? "crosshair" : "";

        if (nextIndex >= 0) {
          onStopMoveRef.current(nextIndex, [lng, lat]);
        }
      });

      existingMarkers.set(stop.id, { marker, element });
    }
  }, [stops, isMapReady]);

  return <div ref={containerRef} className="h-full w-full" />;
}
