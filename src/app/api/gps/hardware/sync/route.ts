import { NextResponse } from "next/server";

import { getPrisma } from "@/lib/prisma";
import { publishVehicleUpdate } from "@/lib/redis";
import {
  listEnabledVehicleHardwareMappings,
  resolveHardwareVehicleMapping,
} from "@/lib/vehicles/hardware-mappings";
import { normalizeHardwareFeed } from "@/lib/vehicles/hardware";
import { buildLiveVehicleFeedSnapshot } from "@/lib/vehicles/live";
import {
  buildPendingHardwareKey,
  deletePendingHardwarePreview,
  upsertPendingHardwarePreview,
} from "@/lib/vehicles/source-state";
import { removeVehicleSource, upsertVehicle } from "@/lib/vehicles/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HARDWARE_SYNC_SECRET = process.env.HARDWARE_SYNC_SECRET;

type SyncRequestBody = {
  payload?: unknown;
  polledAt?: unknown;
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function resolvePolledAt(value: unknown) {
  if (typeof value === "string") {
    const resolved = new Date(value);
    if (Number.isFinite(resolved.getTime())) {
      return resolved;
    }
  }

  return new Date();
}

function resolvePayload(body: unknown): SyncRequestBody | null {
  if (Array.isArray(body)) {
    return {
      payload: body,
    };
  }

  if (!body || typeof body !== "object") {
    return null;
  }

  return body as SyncRequestBody;
}

export async function POST(request: Request) {
  if (!HARDWARE_SYNC_SECRET) {
    return jsonError("HARDWARE_SYNC_SECRET is not configured", 503);
  }

  const secret = request.headers.get("x-hardware-sync-secret");
  if (secret !== HARDWARE_SYNC_SECRET) {
    return jsonError("Unauthorized", 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const body = resolvePayload(rawBody);
  if (!body) {
    return jsonError("payload is required", 400);
  }

  const polledAt = resolvePolledAt(body.polledAt);
  const records = normalizeHardwareFeed(body.payload ?? body, polledAt);
  const mappings = await listEnabledVehicleHardwareMappings();

  const historyWrites: Array<Promise<unknown>> = [];
  let activeCount = 0;
  let inactiveCount = 0;
  let unmappedCount = 0;

  for (const record of records) {
    const previewKey = buildPendingHardwareKey(record);
    const mapping = resolveHardwareVehicleMapping(mappings, record);

    if (!mapping) {
      unmappedCount += 1;
      await upsertPendingHardwarePreview({
        sourceKey: previewKey,
        hardwareVehicleId: record.hardwareVehicleId,
        hardwareId: record.hardwareId,
        label: record.label,
        latitude: record.latitude,
        longitude: record.longitude,
        heading: record.heading,
        speedMps: record.speedMps,
        accuracyM: record.accuracyM,
        observedAt: record.observedAt,
        lastPolledAt: polledAt.toISOString(),
      });
      continue;
    }

    await deletePendingHardwarePreview(previewKey);

    if (record.operationalStatus !== "active") {
      inactiveCount += 1;
      await removeVehicleSource(mapping.vehicleId, "hardware");
      continue;
    }

    activeCount += 1;
    await upsertVehicle({
      id: mapping.vehicleId,
      label: mapping.displayLabel ?? record.label ?? mapping.vehicleId,
      latitude: record.latitude,
      longitude: record.longitude,
      heading: record.heading,
      speed: record.speedMps,
      source: "hardware",
      observedAt: record.observedAt,
      accuracyM: record.accuracyM,
      sourceRef: record.hardwareId ?? record.hardwareVehicleId,
      hardwareVehicleId: record.hardwareVehicleId,
      hardwareId: record.hardwareId,
    });

    try {
      const prisma = getPrisma();
      historyWrites.push(
        prisma.vehicleLocation.create({
          data: {
            vehicleId: mapping.vehicleId,
            label: mapping.displayLabel ?? record.label ?? mapping.vehicleId,
            latitude: record.latitude,
            longitude: record.longitude,
            heading: record.heading,
            speed: record.speedMps,
            source: "hardware",
            accuracy: record.accuracyM,
            observedAt: new Date(record.observedAt),
            sourceRef: record.hardwareId ?? record.hardwareVehicleId,
          },
        }),
      );
    } catch (error) {
      console.error("[gps/hardware/sync] db write failed:", error);
    }
  }

  if (historyWrites.length > 0) {
    await Promise.allSettled(historyWrites);
  }

  try {
    await publishVehicleUpdate(await buildLiveVehicleFeedSnapshot());
  } catch (error) {
    console.error("[gps/hardware/sync] redis publish failed:", error);
  }

  return NextResponse.json({
    ok: true,
    total: records.length,
    active: activeCount,
    inactive: inactiveCount,
    unmapped: unmappedCount,
  });
}
