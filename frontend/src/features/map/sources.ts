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

export function vehiclesToGeoJson(vehicles?: Vehicle[]): FeatureCollection<Point> | null {
  if (!vehicles) return null;
  return {
    type: "FeatureCollection",
    features: vehicles.map((vehicle): Feature<Point> => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [vehicle.longitude, vehicle.latitude],
      },
      properties: {
        id: vehicle.id,
        label: vehicle.label ?? "",
        direction: vehicle.direction,
        status: vehicle.status,
        last_updated: vehicle.last_updated,
        heading: vehicle.heading,
      },
    })),
  };
}