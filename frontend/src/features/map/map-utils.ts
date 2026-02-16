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

/**
 * Vehicle icons: Lucide Bus inside colored circles per status.
 * - Vehicle-fresh  → green circle
 * - Vehicle-delayed → orange circle
 * - Vehicle-offline → red circle
 * - Vehicle         → default (green)
 *
 * No rotation / no flip — icon stays upright; direction is shown by movement.
 * Status only changes when vehicle starts/stops dwelling, so icon_image
 * switches very rarely → no flicker.
 */
const VEHICLE_STATUS_COLORS: Record<string, string> = {
    fresh: "#16a34a",   // Green-600
    delayed: "#ea580c", // Orange-600
    offline: "#dc2626", // Red-600
};

export function loadVehicleIcon(map: maplibregl.Map) {
    const busSvg = renderToStaticMarkup(
        React.createElement(Bus, {
            size: 36,
            color: "#ffffff",
            strokeWidth: 2.5,
        })
    );

    for (const [status, color] of Object.entries(VEHICLE_STATUS_COLORS)) {
        const imageName = `Vehicle-${status}`;
        if (map.hasImage(imageName)) continue;

        const markerSvg = `
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="36" fill="${color}" stroke="white" stroke-width="4"/>
            <g transform="translate(22, 22)">
                ${busSvg}
            </g>
        </svg>
        `.trim();

        const image = new Image(80, 80);
        image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markerSvg);
        image.onload = () => {
            if (!map.hasImage(imageName)) {
                map.addImage(imageName, image, { pixelRatio: 2 });
            }
        };
    }

    // Default "Vehicle" alias → same as fresh
    if (!map.hasImage("Vehicle")) {
        const markerSvg = `
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="36" fill="${VEHICLE_STATUS_COLORS.fresh}" stroke="white" stroke-width="4"/>
            <g transform="translate(22, 22)">
                ${busSvg}
            </g>
        </svg>
        `.trim();

        const image = new Image(80, 80);
        image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markerSvg);
        image.onload = () => {
            if (!map.hasImage("Vehicle")) {
                map.addImage("Vehicle", image, { pixelRatio: 2 });
            }
        };
    }
}
