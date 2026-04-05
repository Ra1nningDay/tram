import { getPrisma } from "@/lib/prisma";

export type VehicleHardwareMappingRecord = {
  id: string;
  vehicleId: string;
  displayLabel: string | null;
  hardwareVehicleId: string | null;
  hardwareId: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type VehicleHardwareMappingInput = {
  vehicleId: string;
  displayLabel?: string;
  hardwareVehicleId?: string;
  hardwareId?: string;
  enabled?: boolean;
};

function normalizeOptionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function listVehicleHardwareMappings(): Promise<
  VehicleHardwareMappingRecord[]
> {
  return getPrisma().vehicleHardwareMapping.findMany({
    orderBy: [{ enabled: "desc" }, { vehicleId: "asc" }, { hardwareVehicleId: "asc" }],
  });
}

export async function listEnabledVehicleHardwareMappings() {
  return getPrisma().vehicleHardwareMapping.findMany({
    where: { enabled: true },
    orderBy: [{ vehicleId: "asc" }, { hardwareVehicleId: "asc" }],
  });
}

export function resolveHardwareVehicleMapping(
  mappings: VehicleHardwareMappingRecord[],
  params: {
    hardwareVehicleId?: string;
    hardwareId?: string;
  },
): VehicleHardwareMappingRecord | null {
  const hardwareId = normalizeOptionalString(params.hardwareId);
  const hardwareVehicleId = normalizeOptionalString(params.hardwareVehicleId);

  return (
    mappings.find((mapping) => {
      if (!mapping.enabled) {
        return false;
      }

      if (hardwareId && mapping.hardwareId === hardwareId) {
        return true;
      }

      if (hardwareVehicleId && mapping.hardwareVehicleId === hardwareVehicleId) {
        return true;
      }

      return false;
    }) ?? null
  );
}

export async function createVehicleHardwareMapping(
  input: VehicleHardwareMappingInput,
) {
  return getPrisma().vehicleHardwareMapping.create({
    data: {
      vehicleId: input.vehicleId.trim(),
      displayLabel: normalizeOptionalString(input.displayLabel),
      hardwareVehicleId: normalizeOptionalString(input.hardwareVehicleId),
      hardwareId: normalizeOptionalString(input.hardwareId),
      enabled: input.enabled ?? true,
    },
  });
}

export async function updateVehicleHardwareMapping(
  id: string,
  input: VehicleHardwareMappingInput,
) {
  return getPrisma().vehicleHardwareMapping.update({
    where: { id },
    data: {
      vehicleId: input.vehicleId.trim(),
      displayLabel: normalizeOptionalString(input.displayLabel) ?? null,
      hardwareVehicleId: normalizeOptionalString(input.hardwareVehicleId) ?? null,
      hardwareId: normalizeOptionalString(input.hardwareId) ?? null,
      enabled: input.enabled ?? true,
    },
  });
}
