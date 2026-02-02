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
    if (map.hasImage("Vehicle")) return;

    // Render Bus icon for SDF (White stroke)
    const svgString = renderToStaticMarkup(
        React.createElement(Bus, {
            size: 40,
            color: "#ffffff",
            strokeWidth: 2.5,
            fill: "#ffffff", // Semi-filled
            fillOpacity: 0.3
        })
    );

    const markerSvg = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        ${svgString}
    </svg>
    `.trim();

    const image = new Image(40, 40);
    image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markerSvg);
    image.onload = () => {
        if (!map.hasImage("Vehicle")) {
            // Load as SDF to allow dynamic coloring via icon-color
            map.addImage("Vehicle", image, { sdf: true });
        }
    };
}
