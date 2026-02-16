import type { Vehicle, Stop, Route } from "../shuttle/api";
import type { FeatureCollection, Feature, Point, LineString } from "geojson";

export function routeToGeoJson(route?: Route): FeatureCollection<LineString> | null {
  if (!route) return null;
  return {
    type: "FeatureCollection",
    features: route.directions.map((direction): Feature<LineString> => ({
      type: "Feature",
      geometry: direction.geometry as LineString,
      properties: {
        direction: direction.direction,
      },
    })),
  };
}

export function stopsToGeoJson(stops?: Stop[]): FeatureCollection<Point> | null {
  if (!stops) return null;
  return {
    type: "FeatureCollection",
    features: stops.map((stop): Feature<Point> => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [stop.longitude, stop.latitude],
      },
      properties: {
        id: stop.id,
        name_th: stop.name_th,
        name_en: stop.name_en ?? "",
        direction: stop.direction,
        sequence: stop.sequence,
        icon: stop.icon || "MapPin",
      },
    })),
  };
}

export function vehiclesToGeoJson(vehicles?: Vehicle[], bearing: number = 0): FeatureCollection<Point> | null {
  if (!vehicles) return null;
  return {
    type: "FeatureCollection",
    features: vehicles.map((vehicle): Feature<Point> => {
      // Precompute image + rotation so the layer doesn't need complex expressions
      // (style expression parse errors can make vehicles disappear entirely).
      const rawHeading = typeof vehicle.heading === "number" ? vehicle.heading : 0;
      const heading = ((rawHeading % 360) + 360) % 360;

      // Calculate heading relative to screen "Up"
      // Screen Heading = (Heading - Map Bearing)
      const screenHeading = ((heading - bearing) % 360 + 360) % 360;

      // Flip if moving "Left" on screen (180 to 360 degrees)
      // 0=Up, 90=Right, 180=Down, 270=Left
      const flip = screenHeading > 180 && screenHeading < 360;

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [vehicle.longitude, vehicle.latitude],
        },
        properties: {
          icon_image: flip ? "VehicleFlipped" : "Vehicle",
          icon_rotate: 0, // No vertical rotation (always horizontal)
          id: vehicle.id,
          label: vehicle.label ?? "",
          direction: vehicle.direction,
          status: vehicle.status,
          last_updated: vehicle.last_updated,
          heading,
        },
      };
    }),
  };
}
