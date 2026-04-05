-- AlterTable
ALTER TABLE "vehicle_locations"
ADD COLUMN "accuracy" DOUBLE PRECISION,
ADD COLUMN "observedAt" TIMESTAMP(3),
ADD COLUMN "sourceRef" TEXT;

-- CreateTable
CREATE TABLE "vehicle_hardware_mappings" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "displayLabel" TEXT,
    "hardwareVehicleId" TEXT,
    "hardwareId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_hardware_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_hardware_mappings_hardwareVehicleId_key" ON "vehicle_hardware_mappings"("hardwareVehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_hardware_mappings_hardwareId_key" ON "vehicle_hardware_mappings"("hardwareId");

-- CreateIndex
CREATE INDEX "vehicle_hardware_mappings_vehicleId_idx" ON "vehicle_hardware_mappings"("vehicleId");

-- CreateIndex
CREATE INDEX "vehicle_hardware_mappings_enabled_idx" ON "vehicle_hardware_mappings"("enabled");
