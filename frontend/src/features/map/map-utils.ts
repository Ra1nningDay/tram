import maplibregl from "maplibre-gl";
import { renderToStaticMarkup } from "react-dom/server";
import { AVAILABLE_ICONS } from "../../lib/icons";
import React from "react"; // Needed for React.createElement

import { Bus } from "lucide-react";

const MAP_COLORS = {
    blue: "#3b82f6",
    red: "#ef4444",
    green: "#22c55e",
    purple: "#a855f7",
    orange: "#f97316",
    teal: "#14b8a6",
};

export function loadMapIcons(map: maplibregl.Map) {
    AVAILABLE_ICONS.forEach((icon) => {
        // Generate default (blue) icon usage: "IconName"
        generateIcon(map, icon.name, icon.component, MAP_COLORS.blue);

        // Generate colored variants: "IconName-color"
        Object.entries(MAP_COLORS).forEach(([colorName, hex]) => {
            generateIcon(map, `${icon.name}-${colorName}`, icon.component, hex);
        });
    });
}

function generateIcon(
    map: maplibregl.Map,
    imageName: string,
    IconComponent: React.ElementType,
    colorHex: string
) {
    if (map.hasImage(imageName)) return;

    // Render icon to SVG string
    const svgString = renderToStaticMarkup(
        React.createElement(IconComponent, {
            size: 40,
            color: "#ffffff",
            strokeWidth: 2,
        })
    );

    // Wrap in a colored circle pin
    const markerSvg = `
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="36" fill="${colorHex}" stroke="white" stroke-width="4"/>
        <g transform="translate(20, 20)">
            ${svgString}
        </g>
    </svg>
    `.trim();

    // Convert to image
    const image = new Image(80, 80);
    image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markerSvg);
    image.onload = () => {
        if (!map.hasImage(imageName)) {
            map.addImage(imageName, image, { pixelRatio: 2 });
        }
    };
}

export function loadVehicleIcon(map: maplibregl.Map) {
    // Used by the vehicles layer to keep the icon upright (never upside down):
    // it swaps between the normal and horizontally-mirrored images based on heading.
    if (map.hasImage("Vehicle") && map.hasImage("VehicleFlipped")) return;

    const rawSvg = renderToStaticMarkup(
        React.createElement(Bus, {
            size: 40,
            color: "#ffffff",
            strokeWidth: 2.5,
            fill: "#ffffff",
            fillOpacity: 0.3,
        })
    );

    // Extract inner SVG markup so we can wrap it with transforms (mirror) cleanly.
    const inner = rawSvg
        .replace(/^<svg[^>]*>/, "")
        .replace(/<\/svg>\s*$/, "");

    const buildMarkerSvg = (flipped: boolean) => {
        const g = flipped ? `<g transform="translate(40, 0) scale(-1, 1)">${inner}</g>` : `<g>${inner}</g>`;
        return `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            ${g}
        </svg>
        `.trim();
    };

    const add = (name: string, svg: string) => {
        const image = new Image(40, 40);
        image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        image.onload = () => {
            if (!map.hasImage(name)) {
                map.addImage(name, image, { sdf: true });
            }
        };
    };

    if (!map.hasImage("Vehicle")) add("Vehicle", buildMarkerSvg(false));
    if (!map.hasImage("VehicleFlipped")) add("VehicleFlipped", buildMarkerSvg(true));
}
