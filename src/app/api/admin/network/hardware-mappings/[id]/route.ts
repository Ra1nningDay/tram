import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuth } from "@/lib/auth";
import { userCanAccessAdmin } from "@/lib/auth/roles";
import { updateVehicleHardwareMapping } from "@/lib/vehicles/hardware-mappings";

export const runtime = "nodejs";

type MappingPayload = {
  vehicleId?: unknown;
  displayLabel?: unknown;
  hardwareVehicleId?: unknown;
  hardwareId?: unknown;
  enabled?: unknown;
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function validatePayload(body: MappingPayload) {
  const vehicleId = normalizeOptionalString(body.vehicleId);
  const hardwareVehicleId = normalizeOptionalString(body.hardwareVehicleId);
  const hardwareId = normalizeOptionalString(body.hardwareId);

  if (!vehicleId) {
    return { error: "vehicleId is required" } as const;
  }

  if (!hardwareVehicleId && !hardwareId) {
    return { error: "hardwareVehicleId or hardwareId is required" } as const;
  }

  return {
    vehicleId,
    displayLabel: normalizeOptionalString(body.displayLabel),
    hardwareVehicleId,
    hardwareId,
    enabled: typeof body.enabled === "boolean" ? body.enabled : true,
  } as const;
}

async function requireAdmin(request: Request) {
  const session = await getAuth().api.getSession({
    headers: request.headers,
    query: {
      disableRefresh: true,
    },
  });

  if (!session) {
    return jsonError("Authentication required", 401);
  }

  const canAccessAdmin = await userCanAccessAdmin(session.user.id);
  if (!canAccessAdmin) {
    return jsonError("Admin role required", 403);
  }

  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(request);
  if (authError) {
    return authError;
  }

  let rawBody: MappingPayload;
  try {
    rawBody = (await request.json()) as MappingPayload;
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = validatePayload(rawBody);
  if ("error" in parsed) {
    return jsonError(parsed.error ?? "Invalid payload", 400);
  }

  try {
    const { id } = await params;
    const mapping = await updateVehicleHardwareMapping(id, parsed);
    return NextResponse.json({ ok: true, mapping });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return jsonError("Mapping not found", 404);
      }

      if (error.code === "P2002") {
        return jsonError("Hardware ID is already mapped", 409);
      }
    }

    console.error("Failed to update vehicle hardware mapping", error);
    return jsonError("Failed to update hardware mapping", 500);
  }
}
