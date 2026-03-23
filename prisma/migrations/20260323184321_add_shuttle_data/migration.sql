-- CreateTable
CREATE TABLE "shuttle_routes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shuttle_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_directions" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "coordinates" JSONB NOT NULL,
    "stopReferences" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "route_directions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stops" (
    "id" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "sequence" INTEGER NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "icon" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "map_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "polygon" JSONB NOT NULL,
    "mapStyle" TEXT NOT NULL DEFAULT 'basic',
    "initialZoom" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "minZoom" DOUBLE PRECISION NOT NULL DEFAULT 13.5,
    "maxZoom" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "maskOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "maskColor" TEXT NOT NULL DEFAULT '#1e2127',
    "initialBearing" DOUBLE PRECISION NOT NULL DEFAULT -90,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "route_directions_routeId_idx" ON "route_directions"("routeId");

-- AddForeignKey
ALTER TABLE "route_directions" ADD CONSTRAINT "route_directions_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "shuttle_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
