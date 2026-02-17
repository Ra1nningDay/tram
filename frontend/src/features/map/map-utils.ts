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

/**
 * Loads an SVG string as a MapLibre image.
 * Returns a Promise that resolves when the image is added to the map.
 */
function addSvgImage(
    map: maplibregl.Map,
    imageName: string,
    svgMarkup: string,
    size: number,
    options?: Partial<Parameters<maplibregl.Map["addImage"]>[2]>
): Promise<void> {
    if (map.hasImage(imageName)) return Promise.resolve();

    return new Promise<void>((resolve) => {
        const image = new Image(size, size);
        image.onload = () => {
            if (!map.hasImage(imageName)) {
                map.addImage(imageName, image, options ?? {});
            }
            resolve();
        };
        image.onerror = () => {
            console.warn(`[map-utils] Failed to load icon: ${imageName}`);
            resolve(); // Don't block other icons
        };
        image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgMarkup);
    });
}

/**
 * Generate a Lucide icon inside a colored circle and add it to the map.
 */
function generateIcon(
    map: maplibregl.Map,
    imageName: string,
    IconComponent: React.ElementType,
    colorHex: string
): Promise<void> {
    if (map.hasImage(imageName)) return Promise.resolve();

    const svgString = renderToStaticMarkup(
        React.createElement(IconComponent, {
            size: 40,
            color: "#ffffff",
            strokeWidth: 2,
        })
    );

    const markerSvg = `
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="36" fill="${colorHex}" stroke="white" stroke-width="4"/>
        <g transform="translate(20, 20)">
            ${svgString}
        </g>
    </svg>
    `.trim();

    return addSvgImage(map, imageName, markerSvg, 80, { pixelRatio: 2 });
}

/**
 * Load all stop/POI icons. Returns a Promise that resolves when ALL icons are loaded.
 * This ensures icons are ready before MapLibre tries to render features.
 */
export async function loadMapIcons(map: maplibregl.Map): Promise<void> {
    const promises: Promise<void>[] = [];

    AVAILABLE_ICONS.forEach((icon) => {
        // Generate default (blue) icon
        promises.push(generateIcon(map, icon.name, icon.component, MAP_COLORS.blue));

        // Generate colored variants: "IconName-color"
        Object.entries(MAP_COLORS).forEach(([colorName, hex]) => {
            promises.push(generateIcon(map, `${icon.name}-${colorName}`, icon.component, hex));
        });
    });

    await Promise.all(promises);
}

/**
 * Vehicle icons: Lucide Bus inside colored circles per status.
 * Returns a Promise that resolves when all vehicle icons are loaded.
 */
const VEHICLE_STATUS_COLORS: Record<string, string> = {
    fresh: "#16a34a",   // Green-600
    delayed: "#ea580c", // Orange-600
    offline: "#dc2626", // Red-600
    selected: "#f59e0b", // Amber-500 — highlighted when focused
};

export async function loadVehicleIcon(map: maplibregl.Map): Promise<void> {
    const busSvg = renderToStaticMarkup(
        React.createElement(Bus, {
            size: 36,
            color: "#ffffff",
            strokeWidth: 2.5,
        })
    );

    const promises: Promise<void>[] = [];

    for (const [status, color] of Object.entries(VEHICLE_STATUS_COLORS)) {
        const imageName = `Vehicle-${status}`;
        const markerSvg = `
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="36" fill="${color}" stroke="white" stroke-width="4"/>
            <g transform="translate(22, 22)">
                ${busSvg}
            </g>
        </svg>
        `.trim();

        promises.push(addSvgImage(map, imageName, markerSvg, 80, { pixelRatio: 2 }));
    }

    // Default "Vehicle" alias → same as fresh
    const defaultSvg = `
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="36" fill="${VEHICLE_STATUS_COLORS.fresh}" stroke="white" stroke-width="4"/>
        <g transform="translate(22, 22)">
            ${busSvg}
        </g>
    </svg>
    `.trim();

    promises.push(addSvgImage(map, "Vehicle", defaultSvg, 80, { pixelRatio: 2 }));

    await Promise.all(promises);
}
