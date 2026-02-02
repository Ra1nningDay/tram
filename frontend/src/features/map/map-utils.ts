import maplibregl from "maplibre-gl";
import { renderToStaticMarkup } from "react-dom/server";
import { AVAILABLE_ICONS } from "../../lib/icons";
import React from "react"; // Needed for React.createElement

import { Bus } from "lucide-react";

export function loadMapIcons(map: maplibregl.Map) {
    AVAILABLE_ICONS.forEach((icon) => {
        if (map.hasImage(icon.name)) return;

        // Render icon to SVG string
        const svgString = renderToStaticMarkup(
            React.createElement(icon.component, {
                size: 40, // Increased from 24
                color: "#ffffff",
                strokeWidth: 2,
            })
        );

        // Wrap in a colored circle pin
        // Increased size to 80x80 for higher resolution
        const markerSvg = `
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="36" fill="#3b82f6" stroke="white" stroke-width="4"/>
            <g transform="translate(20, 20)">
                ${svgString}
            </g>
        </svg>
        `.trim();

        // Convert to image
        const image = new Image(80, 80);
        image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markerSvg);
        image.onload = () => {
            if (!map.hasImage(icon.name)) {
                map.addImage(icon.name, image, { pixelRatio: 2 });
            }
        };
    });
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
