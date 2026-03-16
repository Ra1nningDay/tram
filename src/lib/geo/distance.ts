type LngLat = [number, number];

const R = 6_371_000; // meters

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Fast and accurate enough for small distances (campus-scale).
export function distanceMeters(a: LngLat, b: LngLat): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;

  const latRad1 = toRad(lat1);
  const latRad2 = toRad(lat2);
  const meanLat = (latRad1 + latRad2) / 2;

  const dLat = latRad2 - latRad1;
  const dLng = toRad(lng2 - lng1);

  const x = dLng * Math.cos(meanLat) * R;
  const y = dLat * R;
  return Math.hypot(x, y);
}

/**
 * Haversine distance between two [lng, lat] points — accurate at any scale.
 * Returns distance in meters.
 */
export function haversineM(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

