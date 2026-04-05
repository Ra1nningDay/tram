type HardwareFeedRecord = {
  hardwareVehicleId?: string;
  hardwareId?: string;
  label?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speedMps?: number;
  accuracyM?: number;
  observedAt: string;
  rawDirection?: string;
  operationalStatus: "active" | "inactive";
};

type LegacyHardwareEntry = {
  "tram-geo-info"?: {
    direction?: unknown;
    heading_degrees?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    speed_kmh?: unknown;
    updatedAt?: unknown;
  };
  "tram-status"?: {
    "tram-id"?: unknown;
    "tram-state"?: unknown;
  };
};

type CurrentHardwareEntry = {
  Tram_GEO_Info?: {
    accuracy?: unknown;
    direction?: unknown;
    heading?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    speed?: unknown;
  };
  Tram_Info?: {
    hardware_id?: unknown;
    id?: unknown;
    model?: unknown;
    status?: unknown;
    type?: unknown;
  };
  application_update?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function kmhToMps(speedKmh: number | undefined): number | undefined {
  if (typeof speedKmh !== "number") {
    return undefined;
  }

  return Math.round((speedKmh / 3.6) * 1000) / 1000;
}

function isValidCoordinate(latitude: number | undefined, longitude: number | undefined) {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function resolveObservedAt(
  updatedAt: unknown,
  applicationUpdate: unknown,
  polledAt: Date,
): string {
  if (typeof updatedAt === "number" && Number.isFinite(updatedAt)) {
    const resolved = new Date(updatedAt);
    if (Number.isFinite(resolved.getTime())) {
      return resolved.toISOString();
    }
  }

  if (typeof applicationUpdate === "string") {
    const normalizedApplicationUpdate =
      /(?:Z|[+-]\d{2}:\d{2})$/i.test(applicationUpdate)
        ? applicationUpdate
        : `${applicationUpdate}Z`;
    const resolved = new Date(normalizedApplicationUpdate);
    if (Number.isFinite(resolved.getTime())) {
      return resolved.toISOString();
    }
  }

  return polledAt.toISOString();
}

function normalizeLegacyHardwareEntry(
  entry: LegacyHardwareEntry,
  polledAt: Date,
): HardwareFeedRecord | null {
  const geo = isRecord(entry["tram-geo-info"]) ? entry["tram-geo-info"] : null;
  const status = isRecord(entry["tram-status"]) ? entry["tram-status"] : null;

  if (!geo || !status) {
    return null;
  }

  const latitude = asFiniteNumber(geo.latitude);
  const longitude = asFiniteNumber(geo.longitude);
  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }

  const hardwareVehicleId =
    typeof status["tram-id"] === "number" || typeof status["tram-id"] === "string"
      ? String(status["tram-id"]).trim()
      : undefined;

  return {
    hardwareVehicleId,
    label: hardwareVehicleId ? `TRAM-${hardwareVehicleId}` : undefined,
    latitude: latitude!,
    longitude: longitude!,
    heading: asFiniteNumber(geo.heading_degrees),
    speedMps: kmhToMps(asFiniteNumber(geo.speed_kmh)),
    observedAt: resolveObservedAt(geo.updatedAt, undefined, polledAt),
    rawDirection: asNonEmptyString(geo.direction),
    operationalStatus:
      asNonEmptyString(status["tram-state"]) === "in_use" ? "active" : "inactive",
  };
}

function normalizeCurrentHardwareEntry(
  entry: CurrentHardwareEntry,
  polledAt: Date,
): HardwareFeedRecord | null {
  const geo = isRecord(entry.Tram_GEO_Info) ? entry.Tram_GEO_Info : null;
  const info = isRecord(entry.Tram_Info) ? entry.Tram_Info : null;

  if (!geo || !info) {
    return null;
  }

  const latitude = asFiniteNumber(geo.latitude);
  const longitude = asFiniteNumber(geo.longitude);
  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }

  return {
    hardwareVehicleId: asNonEmptyString(info.id),
    hardwareId: asNonEmptyString(info.hardware_id),
    label: asNonEmptyString(info.id) ?? asNonEmptyString(info.hardware_id),
    latitude: latitude!,
    longitude: longitude!,
    heading: asFiniteNumber(geo.heading),
    speedMps: kmhToMps(asFiniteNumber(geo.speed)),
    accuracyM: asFiniteNumber(geo.accuracy),
    observedAt: resolveObservedAt(undefined, entry.application_update, polledAt),
    rawDirection: asNonEmptyString(geo.direction),
    operationalStatus:
      asNonEmptyString(info.status)?.toLowerCase() === "active"
        ? "active"
        : "inactive",
  };
}

export function normalizeHardwareFeed(
  payload: unknown,
  polledAt: Date = new Date(),
): HardwareFeedRecord[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .filter((entry): entry is LegacyHardwareEntry | CurrentHardwareEntry => isRecord(entry))
    .map((entry) => {
      const normalizedLegacy = normalizeLegacyHardwareEntry(entry as LegacyHardwareEntry, polledAt);
      if (normalizedLegacy) {
        return normalizedLegacy;
      }

      return normalizeCurrentHardwareEntry(entry as CurrentHardwareEntry, polledAt);
    })
    .filter((entry): entry is HardwareFeedRecord => entry !== null);
}

export type { HardwareFeedRecord };
