/**
 * Format a distance in meters to a human-readable Thai string.
 *
 * formatDistance(85)   → "85 ม."
 * formatDistance(1234) → "1.2 กม."
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} ม.`;
  }
  return `${(meters / 1000).toFixed(1)} กม.`;
}

export function getWalkingTimeMin(meters: number): number {
  return Math.ceil(meters / 84);
}

export function formatWalkingTime(meters: number): string {
  const minutes = getWalkingTimeMin(meters);

  if (minutes >= 60) {
    const hours = minutes / 60;
    const roundedHours = Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1);
    return `${roundedHours} ชม.`;
  }

  return `${minutes} นาที`;
}
