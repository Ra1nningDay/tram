import type { LineLayerSpecification } from "maplibre-gl";
import type { FeatureCollection, Feature, LineString } from "geojson";

/**
 * MapLibre layer that renders vehicle GPS trails as colored lines.
 * Uses data-driven styling: each feature has a `color` property.
 */
export const trailLayer: LineLayerSpecification = {
    id: "gps-trail",
    type: "line",
    source: "gps-trail",
    paint: {
        "line-color": ["get", "color"],
        "line-width": 3,
        "line-opacity": 0.7,
    },
    layout: {
        "line-cap": "round",
        "line-join": "round",
    },
};

/**
 * Convert trail data from the replay hook into GeoJSON for the trail layer.
 */
export function trailsToGeoJson(
    trails: { coordinates: [number, number][]; color: string }[],
): FeatureCollection<LineString> {
    return {
        type: "FeatureCollection",
        features: trails
            .filter((t) => t.coordinates.length >= 2)
            .map(
                (t, i): Feature<LineString> => ({
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: t.coordinates,
                    },
                    properties: {
                        id: `trail-${i}`,
                        color: t.color,
                    },
                }),
            ),
    };
}
