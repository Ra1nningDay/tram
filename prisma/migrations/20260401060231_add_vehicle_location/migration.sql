-- CreateTable
CREATE TABLE "vehicle_locations" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "label" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_locations_vehicleId_recordedAt_idx" ON "vehicle_locations"("vehicleId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "vehicle_locations_recordedAt_idx" ON "vehicle_locations"("recordedAt" DESC);
