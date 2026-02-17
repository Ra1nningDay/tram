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

