/**
 * Parse tram GPS CSV data into typed GpsPoint objects.
 */

export interface GpsPoint {
    session_id: string;
    point_no: number;
    latitude: number;
    longitude: number;
    accuracy_m: number;
    speed_kmh: number;
    heading_deg: number;
    direction: string;
    timestamp: string; // ISO datetime string
    timestampMs: number; // precomputed epoch ms for fast comparison
}

/**
 * Parse raw CSV text (with header row) into an array of GpsPoint.
 * Expects columns: session_id,point_no,latitude,longitude,accuracy_m,speed_kmh,heading_deg,direction,timestamp
 */
export function parseTramCsv(csvText: string): GpsPoint[] {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return [];

    // Skip header row
    const dataLines = lines.slice(1);
    const points: GpsPoint[] = [];

    for (const line of dataLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const cols = trimmed.split(",");
        if (cols.length < 9) continue;

        const timestamp = cols[8].trim();
        points.push({
            session_id: cols[0].trim(),
            point_no: parseInt(cols[1], 10),
            latitude: parseFloat(cols[2]),
            longitude: parseFloat(cols[3]),
            accuracy_m: parseFloat(cols[4]),
            speed_kmh: parseFloat(cols[5]),
            heading_deg: parseFloat(cols[6]),
            direction: cols[7].trim(),
            timestamp,
            timestampMs: new Date(timestamp).getTime(),
        });
    }

    return points;
}

/** Maximum acceptable GPS accuracy — points worse than this are dropped */
const MAX_ACCURACY_M = 5;

/**
 * Parse raw CSV text and return only high-accuracy GPS points.
 * Filters out points with accuracy > MAX_ACCURACY_M to keep vehicles on-road.
 */
export function parseTramCsvFiltered(csvText: string): GpsPoint[] {
    return parseTramCsv(csvText).filter((p) => p.accuracy_m <= MAX_ACCURACY_M);
}

/**
 * Fetch and parse a tram CSV file from a URL.
 */
export async function fetchTramCsv(url: string): Promise<GpsPoint[]> {
    const response = await fetch(url);
    const text = await response.text();
    return parseTramCsv(text);
}
