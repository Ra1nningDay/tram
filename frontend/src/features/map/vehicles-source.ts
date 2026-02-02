import type maplibregl from "maplibre-gl";

export function updateVehiclesSource(map: maplibregl.Map, geojson: unknown) {
  const source = map.getSource("vehicles");
  if (source && "setData" in source) {
    // @ts-expect-error maplibre typings for GeoJSONSource
    source.setData(geojson);
  }
}