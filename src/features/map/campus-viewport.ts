import type { LngLatBoundsLike } from "maplibre-gl";

export type LngLat = [number, number];

type CampusViewportOptions = {
  isMobile?: boolean;
  desktopPaddingRatio?: number;
  mobilePaddingRatio?: number;
};

type CampusViewport = {
  campusBounds: LngLatBoundsLike;
  campusCenter: LngLat;
};

function assertNonEmptyPolygon(polygon: readonly LngLat[]) {
  if (!polygon.length) throw new Error("campus polygon is empty");
}

export function getCampusViewport(
  polygon: readonly LngLat[],
  {
    isMobile = false,
    desktopPaddingRatio = 0.1,
    mobilePaddingRatio = 0.5,
  }: CampusViewportOptions = {},
): CampusViewport {
  assertNonEmptyPolygon(polygon);

  const lngs = polygon.map((p) => p[0]);
  const lats = polygon.map((p) => p[1]);

  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const lngSpan = maxLng - minLng;
  const latSpan = maxLat - minLat;

  const boundsPaddingRatio = isMobile ? mobilePaddingRatio : desktopPaddingRatio;
  const lngPad = lngSpan * boundsPaddingRatio;
  const latPad = latSpan * boundsPaddingRatio;

  const campusBounds: LngLatBoundsLike = [
    [minLng - lngPad, minLat - latPad],
    [maxLng + lngPad, maxLat + latPad],
  ];

  const campusCenter: LngLat = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];

  return { campusBounds, campusCenter };
}

